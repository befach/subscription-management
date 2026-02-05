import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { sanitizeString } from "./lib/helpers";
import { requireAdmin } from "./lib/permissions";
import { encrypt, decrypt } from "./lib/encryption";

/**
 * Get encryption key from environment.
 * ENCRYPTION_KEY is mandatory in all environments.
 *
 * Set it via: npx convex env set ENCRYPTION_KEY your-secret-key-min-32-chars
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required.\n" +
        "Set it via: npx convex env set ENCRYPTION_KEY your-secret-key-min-32-chars"
    );
  }
  if (key.length < 32) {
    throw new Error("ENCRYPTION_KEY must be at least 32 characters");
  }
  return key;
}

// List all credentials with subscription data (admin only)
// NOTE: Returns masked credentials - actual passwords are not exposed in list view
export const list = query({
  args: { adminEmail: v.string() },
  handler: async (ctx, args) => {
    // Verify admin authentication
    await requireAdmin(ctx, args.adminEmail);

    // Parallel fetch for better performance
    const [credentials, subscriptions] = await Promise.all([
      ctx.db.query("credentials").collect(),
      ctx.db.query("subscriptions").collect(),
    ]);

    // Use Map for O(1) subscription lookups instead of O(n) find()
    const subscriptionMap = new Map(subscriptions.map((s) => [s._id.toString(), s]));

    return credentials.map((cred) => ({
      _id: cred._id,
      subscriptionId: cred.subscriptionId,
      username: cred.username,
      password: "••••••••",
      notes: cred.notes,
      subscription: subscriptionMap.get(cred.subscriptionId.toString()),
    }));
  },
});

// Get credential by subscription ID (admin only)
export const getBySubscription = query({
  args: {
    adminEmail: v.string(),
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    await requireAdmin(ctx, args.adminEmail);

    const credential = await ctx.db
      .query("credentials")
      .withIndex("by_subscription", (q) =>
        q.eq("subscriptionId", args.subscriptionId)
      )
      .unique();

    // Return masked credential for safety
    if (!credential) return null;
    return {
      _id: credential._id,
      subscriptionId: credential.subscriptionId,
      username: credential.username,
      password: "••••••••", // Always masked
      notes: credential.notes,
    };
  },
});

// Get credential by ID (admin only)
export const get = query({
  args: {
    adminEmail: v.string(),
    id: v.id("credentials"),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    await requireAdmin(ctx, args.adminEmail);

    const credential = await ctx.db.get(args.id);
    if (!credential) return null;

    const subscription = await ctx.db.get(credential.subscriptionId);
    // Return with masked password
    return {
      _id: credential._id,
      subscriptionId: credential.subscriptionId,
      username: credential.username,
      password: "••••••••", // Always masked - use reveal() to get actual password
      notes: credential.notes,
      subscription,
    };
  },
});

// Reveal credential and log access (admin only)
// This creates an audit log entry for every access
export const reveal = mutation({
  args: {
    adminEmail: v.string(),
    subscriptionId: v.id("subscriptions"),
    action: v.union(v.literal("viewed"), v.literal("copied")),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    const admin = await requireAdmin(ctx, args.adminEmail);

    // Parallel fetch subscription and credential
    const [subscription, credential] = await Promise.all([
      ctx.db.get(args.subscriptionId),
      ctx.db.query("credentials")
        .withIndex("by_subscription", (q) => q.eq("subscriptionId", args.subscriptionId))
        .unique(),
    ]);

    if (!subscription) throw new Error("Subscription not found");
    if (!credential) throw new Error("No credentials found for this subscription");

    // Create audit log entry
    await ctx.db.insert("auditLogs", {
      subscriptionId: args.subscriptionId,
      subscriptionName: subscription.name,
      action: args.action,
      performedBy: admin.email,
      performedAt: new Date().toISOString(),
    });

    // Decrypt and return
    const password = decrypt(credential.password, getEncryptionKey());
    return { username: credential.username, password };
  },
});

// Create credential (admin only)
export const create = mutation({
  args: {
    adminEmail: v.string(),
    subscriptionId: v.id("subscriptions"),
    username: v.string(),
    password: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    await requireAdmin(ctx, args.adminEmail);

    // Input validation
    const username = sanitizeString(args.username);
    const notes = args.notes ? sanitizeString(args.notes) : undefined;

    if (!username || username.length < 1 || username.length > 200) {
      throw new Error("Username must be between 1 and 200 characters");
    }
    if (!args.password || args.password.length < 1 || args.password.length > 500) {
      throw new Error("Password must be between 1 and 500 characters");
    }
    if (notes && notes.length > 500) {
      throw new Error("Notes must not exceed 500 characters");
    }

    // Parallel check: subscription exists + no existing credential
    const [subscription, existing] = await Promise.all([
      ctx.db.get(args.subscriptionId),
      ctx.db.query("credentials")
        .withIndex("by_subscription", (q) => q.eq("subscriptionId", args.subscriptionId))
        .unique(),
    ]);

    if (!subscription) throw new Error("Subscription not found");
    if (existing) throw new Error("Credentials already exist for this subscription");

    // Encrypt and store
    const encryptedPassword = encrypt(args.password, getEncryptionKey());
    return await ctx.db.insert("credentials", {
      subscriptionId: args.subscriptionId,
      username,
      password: encryptedPassword,
      notes,
    });
  },
});

// Update credential (admin only)
export const update = mutation({
  args: {
    adminEmail: v.string(),
    id: v.id("credentials"),
    username: v.string(),
    password: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    const admin = await requireAdmin(ctx, args.adminEmail);

    const { id, adminEmail, ...data } = args;

    // Input validation
    const username = sanitizeString(data.username);
    const notes = data.notes ? sanitizeString(data.notes) : undefined;

    if (!username || username.length < 1 || username.length > 200) {
      throw new Error("Username must be between 1 and 200 characters");
    }

    if (!data.password || data.password.length < 1 || data.password.length > 500) {
      throw new Error("Password must be between 1 and 500 characters");
    }

    if (notes && notes.length > 500) {
      throw new Error("Notes must not exceed 500 characters");
    }

    const credential = await ctx.db.get(id);
    if (!credential) {
      throw new Error("Credential not found");
    }

    const subscription = await ctx.db.get(credential.subscriptionId);
    if (!subscription) {
      throw new Error("Associated subscription not found");
    }

    // Log the update
    await ctx.db.insert("auditLogs", {
      subscriptionId: credential.subscriptionId,
      subscriptionName: subscription.name,
      action: "updated",
      performedBy: admin.email,
      performedAt: new Date().toISOString(),
    });

    // Encrypt password before storing
    const encryptionKey = getEncryptionKey();
    const encryptedPassword = encrypt(data.password, encryptionKey);

    await ctx.db.patch(id, {
      username,
      password: encryptedPassword,
      notes,
    });
    return id;
  },
});

// Delete credential (admin only)
export const remove = mutation({
  args: {
    adminEmail: v.string(),
    id: v.id("credentials"),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    await requireAdmin(ctx, args.adminEmail);

    // Verify credential exists
    const credential = await ctx.db.get(args.id);
    if (!credential) {
      throw new Error("Credential not found");
    }

    await ctx.db.delete(args.id);
  },
});

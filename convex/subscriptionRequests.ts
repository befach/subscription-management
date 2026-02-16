import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  generateReferenceNumber,
  validateEmail,
  sanitizeString,
  validateAndSanitizeCommonFields,
  validateCost,
  validateStringLength,
  getReferenceDataMaps,
  enrichWithReferenceData,
} from "./lib/helpers";
import { requireAdmin } from "./lib/permissions";
import { internal } from "./_generated/api";

// Rate limiting configuration
const RATE_LIMIT_PER_EMAIL = 5; // max requests per email per hour
const RATE_LIMIT_GLOBAL = 100; // max total requests per hour (all users combined)
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// List all requests with category and currency data
export const list = query({
  args: {},
  handler: async (ctx) => {
    const [requests, { categoryMap, currencyMap }] = await Promise.all([
      ctx.db.query("subscriptionRequests").collect(),
      getReferenceDataMaps(ctx),
    ]);

    return enrichWithReferenceData(requests, categoryMap, currencyMap);
  },
});

// List requests by status
export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
  },
  handler: async (ctx, args) => {
    const [requests, { categoryMap, currencyMap }] = await Promise.all([
      ctx.db
        .query("subscriptionRequests")
        .withIndex("by_status", (q) => q.eq("status", args.status))
        .collect(),
      getReferenceDataMaps(ctx),
    ]);

    return enrichWithReferenceData(requests, categoryMap, currencyMap);
  },
});

// Get single request with relations
export const get = query({
  args: { id: v.id("subscriptionRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request) return null;

    // Parallel fetch for related data
    const [category, currency] = await Promise.all([
      ctx.db.get(request.categoryId),
      ctx.db.get(request.currencyId),
    ]);

    return { ...request, category, currency };
  },
});

// Get pending count
export const getPendingCount = query({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("subscriptionRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return pending.length;
  },
});

// Submit new request (PUBLIC - no auth required)
export const submit = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    provider: v.optional(v.string()),
    categoryId: v.id("categories"),
    cost: v.number(),
    currencyId: v.id("currencies"),
    billingCycle: v.union(
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("half-yearly"),
      v.literal("yearly")
    ),
    requestedBy: v.optional(v.string()),
    requesterEmail: v.optional(v.string()),
    requesterDepartment: v.optional(v.string()),
    justification: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Input validation using shared helpers
    const { name, description, provider } = validateAndSanitizeCommonFields(
      { name: args.name, description: args.description, provider: args.provider },
      { descriptionMin: 10 }
    );

    const requestedBy = args.requestedBy ? sanitizeString(args.requestedBy) : undefined;
    const requesterEmail = args.requesterEmail ? args.requesterEmail.toLowerCase().trim() : undefined;
    const requesterDepartment = args.requesterDepartment ? sanitizeString(args.requesterDepartment) : undefined;
    const justification = args.justification ? sanitizeString(args.justification) : undefined;

    // Cost must be positive for requests
    if (args.cost <= 0) {
      throw new Error("Cost must be a positive number");
    }
    validateCost(args.cost);

    // Only validate optional fields if provided
    if (requestedBy) {
      validateStringLength(requestedBy, "Name", 2, 100);
    }

    if (requesterEmail) {
      if (!validateEmail(requesterEmail)) {
        throw new Error("Invalid email address format");
      }
      if (requesterEmail.length > 254) {
        throw new Error("Email address is too long");
      }
    }

    if (requesterDepartment) {
      validateStringLength(requesterDepartment, "Department", 2, 100);
    }

    if (justification) {
      validateStringLength(justification, "Justification", 10, 2000);
    }

    // Total payload size check (prevent memory exhaustion)
    const totalSize = name.length + description.length + (provider?.length || 0) +
                      (requestedBy?.length || 0) + (requesterEmail?.length || 0) +
                      (requesterDepartment?.length || 0) + (justification?.length || 0);
    if (totalSize > 5000) {
      throw new Error("Request data exceeds maximum allowed size");
    }

    // Parallel fetch: rate limits + validation data
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    const emailKey = requesterEmail ? `email:${requesterEmail}` : null;

    const [globalLimit, emailLimit, category, currency] = await Promise.all([
      ctx.db.query("rateLimits").withIndex("by_key", (q) => q.eq("key", "global")).unique(),
      emailKey
        ? ctx.db.query("rateLimits").withIndex("by_key", (q) => q.eq("key", emailKey)).unique()
        : Promise.resolve(null),
      ctx.db.get(args.categoryId),
      ctx.db.get(args.currencyId),
    ]);

    // Check rate limits
    if (globalLimit && globalLimit.windowStart > windowStart && globalLimit.count >= RATE_LIMIT_GLOBAL) {
      throw new Error("Service is temporarily busy. Please try again later.");
    }
    if (emailLimit && emailLimit.windowStart > windowStart && emailLimit.count >= RATE_LIMIT_PER_EMAIL) {
      throw new Error("Too many requests from this email. Please try again later.");
    }

    // Validate references
    if (!category) throw new Error("Invalid category");
    if (!currency) throw new Error("Invalid currency");
    if (!currency.isActive) throw new Error("Selected currency is not active");

    const referenceNumber = await generateReferenceNumber(ctx, "request");

    // Update rate limit counters
    // Global counter
    if (globalLimit && globalLimit.windowStart > windowStart) {
      await ctx.db.patch(globalLimit._id, { count: globalLimit.count + 1 });
    } else {
      if (globalLimit) {
        await ctx.db.patch(globalLimit._id, { windowStart: now, count: 1 });
      } else {
        await ctx.db.insert("rateLimits", { key: "global", windowStart: now, count: 1 });
      }
    }

    // Email counter (only if email provided)
    if (emailKey) {
      if (emailLimit && emailLimit.windowStart > windowStart) {
        await ctx.db.patch(emailLimit._id, { count: emailLimit.count + 1 });
      } else {
        if (emailLimit) {
          await ctx.db.patch(emailLimit._id, { windowStart: now, count: 1 });
        } else {
          await ctx.db.insert("rateLimits", { key: emailKey, windowStart: now, count: 1 });
        }
      }
    }

    const id = await ctx.db.insert("subscriptionRequests", {
      name,
      description,
      provider,
      categoryId: args.categoryId,
      cost: args.cost,
      currencyId: args.currencyId,
      billingCycle: args.billingCycle,
      requestedBy,
      requesterEmail,
      requesterDepartment,
      justification,
      referenceNumber,
      status: "pending",
    });

    // Send notification to admin about new request (fire and forget)
    try {
      await ctx.scheduler.runAfter(0, internal.actions.notifications.sendNewRequestNotification, {
        requestName: name,
        referenceNumber,
        requesterName: requestedBy || "Unknown",
        requesterDepartment: requesterDepartment || "Unknown",
        cost: args.cost,
        currencySymbol: currency.symbol,
      });
    } catch {
      // Don't fail the request if notification fails
      console.error("Failed to schedule admin notification");
    }

    return { id, referenceNumber };
  },
});

// Approve request (admin only)
// Creates a new subscription from the approved request
export const approve = mutation({
  args: {
    adminEmail: v.string(),
    id: v.id("subscriptionRequests"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    const admin = await requireAdmin(ctx, args.adminEmail);

    // Input validation
    const adminNotes = args.adminNotes ? sanitizeString(args.adminNotes) : undefined;

    if (adminNotes && adminNotes.length > 1000) {
      throw new Error("Admin notes must not exceed 1000 characters");
    }

    const request = await ctx.db.get(args.id);
    if (!request) {
      throw new Error("Request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Can only approve pending requests");
    }

    // Generate a subscription reference number
    const subscriptionRef = await generateReferenceNumber(ctx, "subscription");

    // Calculate next renewal date based on billing cycle
    const now = new Date();
    let nextRenewalDate: Date;
    switch (request.billingCycle) {
      case "monthly":
        nextRenewalDate = new Date(now.setMonth(now.getMonth() + 1));
        break;
      case "quarterly":
        nextRenewalDate = new Date(now.setMonth(now.getMonth() + 3));
        break;
      case "half-yearly":
        nextRenewalDate = new Date(now.setMonth(now.getMonth() + 6));
        break;
      case "yearly":
        nextRenewalDate = new Date(now.setFullYear(now.getFullYear() + 1));
        break;
      default:
        nextRenewalDate = new Date(now.setMonth(now.getMonth() + 1));
    }

    // Create the subscription from the approved request
    const subscriptionId = await ctx.db.insert("subscriptions", {
      referenceNumber: subscriptionRef,
      name: request.name,
      description: request.description,
      provider: request.provider || "",
      categoryId: request.categoryId,
      cost: request.cost,
      currencyId: request.currencyId,
      billingCycle: request.billingCycle,
      nextRenewalDate: nextRenewalDate.toISOString().split("T")[0],
      paymentMethod: "other", // Default, can be updated later
      status: "active",
      notificationEnabled: true,
      notificationDaysBefore: 7,
    });

    // Update the request status
    await ctx.db.patch(args.id, {
      status: "approved",
      adminNotes,
      reviewedBy: admin.email,
      reviewedAt: new Date().toISOString(),
    });

    // Notify requester of approval (only if email provided)
    if (request.requesterEmail) {
      try {
        await ctx.scheduler.runAfter(0, internal.actions.notifications.sendRequestApprovalNotification, {
          requestName: request.name,
          referenceNumber: request.referenceNumber,
          status: "approved" as const,
          adminNotes,
          recipientEmail: request.requesterEmail,
          requesterName: request.requestedBy || "User",
        });
      } catch {
        console.error("Failed to schedule approval notification");
      }
    }

    return { requestId: args.id, subscriptionId };
  },
});

// Reject request (admin only)
export const reject = mutation({
  args: {
    adminEmail: v.string(),
    id: v.id("subscriptionRequests"),
    adminNotes: v.string(), // Required for rejection
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    const admin = await requireAdmin(ctx, args.adminEmail);

    // Input validation
    const adminNotes = sanitizeString(args.adminNotes);

    if (!adminNotes || adminNotes.length < 10 || adminNotes.length > 1000) {
      throw new Error("Rejection reason must be between 10 and 1000 characters");
    }

    const request = await ctx.db.get(args.id);
    if (!request) {
      throw new Error("Request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Can only reject pending requests");
    }

    await ctx.db.patch(args.id, {
      status: "rejected",
      adminNotes,
      reviewedBy: admin.email,
      reviewedAt: new Date().toISOString(),
    });

    // Notify requester of rejection (only if email provided)
    if (request.requesterEmail) {
      try {
        await ctx.scheduler.runAfter(0, internal.actions.notifications.sendRequestApprovalNotification, {
          requestName: request.name,
          referenceNumber: request.referenceNumber,
          status: "rejected" as const,
          adminNotes,
          recipientEmail: request.requesterEmail,
          requesterName: request.requestedBy || "User",
        });
      } catch {
        console.error("Failed to schedule rejection notification");
      }
    }

    return args.id;
  },
});

// Delete request (admin only)
export const remove = mutation({
  args: {
    adminEmail: v.string(),
    id: v.id("subscriptionRequests"),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    await requireAdmin(ctx, args.adminEmail);

    // Verify request exists
    const request = await ctx.db.get(args.id);
    if (!request) {
      throw new Error("Request not found");
    }

    await ctx.db.delete(args.id);
  },
});

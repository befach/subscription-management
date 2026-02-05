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
    provider: v.string(),
    categoryId: v.id("categories"),
    cost: v.number(),
    currencyId: v.id("currencies"),
    billingCycle: v.union(
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("half-yearly"),
      v.literal("yearly")
    ),
    requestedBy: v.string(),
    requesterEmail: v.string(),
    requesterDepartment: v.string(),
    justification: v.string(),
  },
  handler: async (ctx, args) => {
    // Input validation using shared helpers
    const { name, description, provider } = validateAndSanitizeCommonFields(
      { name: args.name, description: args.description, provider: args.provider },
      { descriptionMin: 10 }
    );

    const requestedBy = sanitizeString(args.requestedBy);
    const requesterEmail = args.requesterEmail.toLowerCase().trim();
    const requesterDepartment = sanitizeString(args.requesterDepartment);
    const justification = sanitizeString(args.justification);

    // Cost must be positive for requests
    if (args.cost <= 0) {
      throw new Error("Cost must be a positive number");
    }
    validateCost(args.cost);

    validateStringLength(requestedBy, "Name", 2, 100);

    if (!validateEmail(requesterEmail)) {
      throw new Error("Invalid email address format");
    }

    // Email length check (prevent oversized email addresses)
    if (requesterEmail.length > 254) {
      throw new Error("Email address is too long");
    }

    validateStringLength(requesterDepartment, "Department", 2, 100);
    validateStringLength(justification, "Justification", 20, 2000);

    // Total payload size check (prevent memory exhaustion)
    const totalSize = name.length + description.length + provider.length +
                      requestedBy.length + requesterEmail.length +
                      requesterDepartment.length + justification.length;
    if (totalSize > 5000) {
      throw new Error("Request data exceeds maximum allowed size");
    }

    // Parallel fetch: rate limits + validation data (4 queries at once)
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    const emailKey = `email:${requesterEmail}`;

    const [globalLimit, emailLimit, category, currency] = await Promise.all([
      ctx.db.query("rateLimits").withIndex("by_key", (q) => q.eq("key", "global")).unique(),
      ctx.db.query("rateLimits").withIndex("by_key", (q) => q.eq("key", emailKey)).unique(),
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

    // Email counter
    if (emailLimit && emailLimit.windowStart > windowStart) {
      await ctx.db.patch(emailLimit._id, { count: emailLimit.count + 1 });
    } else {
      if (emailLimit) {
        await ctx.db.patch(emailLimit._id, { windowStart: now, count: 1 });
      } else {
        await ctx.db.insert("rateLimits", { key: emailKey, windowStart: now, count: 1 });
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
    // Note: This runs as a scheduled action, doesn't block the response
    try {
      await ctx.scheduler.runAfter(0, internal.actions.notifications.sendNewRequestNotification, {
        requestName: name,
        referenceNumber,
        requesterName: requestedBy,
        requesterDepartment,
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
      provider: request.provider,
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

    // Notify requester of approval
    try {
      await ctx.scheduler.runAfter(0, internal.actions.notifications.sendRequestApprovalNotification, {
        requestName: request.name,
        referenceNumber: request.referenceNumber,
        status: "approved" as const,
        adminNotes,
        recipientEmail: request.requesterEmail,
        requesterName: request.requestedBy,
      });
    } catch {
      console.error("Failed to schedule approval notification");
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

    // Notify requester of rejection
    try {
      await ctx.scheduler.runAfter(0, internal.actions.notifications.sendRequestApprovalNotification, {
        requestName: request.name,
        referenceNumber: request.referenceNumber,
        status: "rejected" as const,
        adminNotes,
        recipientEmail: request.requesterEmail,
        requesterName: request.requestedBy,
      });
    } catch {
      console.error("Failed to schedule rejection notification");
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

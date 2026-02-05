import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/permissions";

// List all audit logs (admin only)
export const list = query({
  args: { adminEmail: v.string() },
  handler: async (ctx, args) => {
    // Verify admin authentication
    await requireAdmin(ctx, args.adminEmail);

    const logs = await ctx.db.query("auditLogs").order("desc").collect();
    return logs;
  },
});

// List audit logs by subscription (admin only)
export const listBySubscription = query({
  args: {
    adminEmail: v.string(),
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    await requireAdmin(ctx, args.adminEmail);

    return await ctx.db
      .query("auditLogs")
      .withIndex("by_subscription", (q) =>
        q.eq("subscriptionId", args.subscriptionId)
      )
      .order("desc")
      .collect();
  },
});

// Get recent audit logs (limit) (admin only)
export const listRecent = query({
  args: {
    adminEmail: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    await requireAdmin(ctx, args.adminEmail);

    // Use .take() for efficiency - stops after fetching limit rows
    return await ctx.db.query("auditLogs").order("desc").take(args.limit || 10);
  },
});

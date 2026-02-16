import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  generateReferenceNumber,
  validateDateString,
  validateAndSanitizeCommonFields,
  validateCost,
  validateNotificationDays,
  getReferenceDataMaps,
  enrichWithReferenceData,
} from "./lib/helpers";
import { requireAdmin } from "./lib/permissions";

// List all subscriptions with category and currency data
export const list = query({
  args: {},
  handler: async (ctx) => {
    // Parallel fetch for better performance
    const [subscriptions, { categoryMap, currencyMap }] = await Promise.all([
      ctx.db.query("subscriptions").collect(),
      getReferenceDataMaps(ctx),
    ]);

    return enrichWithReferenceData(subscriptions, categoryMap, currencyMap);
  },
});

// List subscriptions by status
export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("cancelled"),
      v.literal("pending")
    ),
  },
  handler: async (ctx, args) => {
    const [subscriptions, { categoryMap, currencyMap }] = await Promise.all([
      ctx.db
        .query("subscriptions")
        .withIndex("by_status", (q) => q.eq("status", args.status))
        .collect(),
      getReferenceDataMaps(ctx),
    ]);

    return enrichWithReferenceData(subscriptions, categoryMap, currencyMap);
  },
});

// List upcoming renewals within N days
export const listUpcomingRenewals = query({
  args: { days: v.number() },
  handler: async (ctx, args) => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + args.days * 24 * 60 * 60 * 1000);

    const [subscriptions, { categoryMap, currencyMap }] = await Promise.all([
      ctx.db
        .query("subscriptions")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .collect(),
      getReferenceDataMaps(ctx),
    ]);

    const upcoming = subscriptions.filter((sub) => {
      const renewalDate = new Date(sub.nextRenewalDate);
      return renewalDate >= now && renewalDate <= futureDate;
    });

    return enrichWithReferenceData(upcoming, categoryMap, currencyMap).sort(
      (a, b) =>
        new Date(a.nextRenewalDate).getTime() -
        new Date(b.nextRenewalDate).getTime()
    );
  },
});

// Get single subscription with relations
export const get = query({
  args: { id: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.id);
    if (!subscription) return null;

    // Parallel fetch for related data
    const [category, currency] = await Promise.all([
      ctx.db.get(subscription.categoryId),
      ctx.db.get(subscription.currencyId),
    ]);

    return { ...subscription, category, currency };
  },
});

// Create subscription (admin only)
export const create = mutation({
  args: {
    adminEmail: v.string(),
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
    nextRenewalDate: v.string(),
    paymentMethod: v.union(
      v.literal("credit_card"),
      v.literal("debit_card"),
      v.literal("bank_transfer"),
      v.literal("upi"),
      v.literal("other")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("cancelled"),
      v.literal("pending")
    ),
    notificationEnabled: v.boolean(),
    notificationDaysBefore: v.number(),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    await requireAdmin(ctx, args.adminEmail);

    // Input validation using shared helpers
    const { name, description, provider } = validateAndSanitizeCommonFields({
      name: args.name,
      description: args.description,
      provider: args.provider,
    });

    validateCost(args.cost);

    if (!validateDateString(args.nextRenewalDate)) {
      throw new Error("Invalid renewal date format");
    }

    validateNotificationDays(args.notificationDaysBefore);

    // Parallel validation of category and currency
    const [category, currency] = await Promise.all([
      ctx.db.get(args.categoryId),
      ctx.db.get(args.currencyId),
    ]);

    if (!category) throw new Error("Invalid category");
    if (!currency) throw new Error("Invalid currency");
    if (!currency.isActive) throw new Error("Selected currency is not active");

    const referenceNumber = await generateReferenceNumber(ctx, "subscription");

    return await ctx.db.insert("subscriptions", {
      name,
      description,
      provider: provider ?? "",
      categoryId: args.categoryId,
      cost: args.cost,
      currencyId: args.currencyId,
      billingCycle: args.billingCycle,
      nextRenewalDate: args.nextRenewalDate,
      paymentMethod: args.paymentMethod,
      status: args.status,
      notificationEnabled: args.notificationEnabled,
      notificationDaysBefore: args.notificationDaysBefore,
      referenceNumber,
    });
  },
});

// Update subscription (admin only)
export const update = mutation({
  args: {
    adminEmail: v.string(),
    id: v.id("subscriptions"),
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
    nextRenewalDate: v.string(),
    paymentMethod: v.union(
      v.literal("credit_card"),
      v.literal("debit_card"),
      v.literal("bank_transfer"),
      v.literal("upi"),
      v.literal("other")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("cancelled"),
      v.literal("pending")
    ),
    notificationEnabled: v.boolean(),
    notificationDaysBefore: v.number(),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    await requireAdmin(ctx, args.adminEmail);

    const { id, adminEmail, ...data } = args;

    // Input validation using shared helpers
    const { name, description, provider } = validateAndSanitizeCommonFields({
      name: data.name,
      description: data.description,
      provider: data.provider,
    });
    validateCost(data.cost);
    if (!validateDateString(data.nextRenewalDate)) {
      throw new Error("Invalid renewal date format");
    }
    validateNotificationDays(data.notificationDaysBefore);

    // Parallel validation: subscription exists + category + currency
    const [existing, category, currency] = await Promise.all([
      ctx.db.get(id),
      ctx.db.get(data.categoryId),
      ctx.db.get(data.currencyId),
    ]);

    if (!existing) throw new Error("Subscription not found");
    if (!category) throw new Error("Invalid category");
    if (!currency) throw new Error("Invalid currency");

    await ctx.db.patch(id, {
      name,
      description,
      provider,
      categoryId: data.categoryId,
      cost: data.cost,
      currencyId: data.currencyId,
      billingCycle: data.billingCycle,
      nextRenewalDate: data.nextRenewalDate,
      paymentMethod: data.paymentMethod,
      status: data.status,
      notificationEnabled: data.notificationEnabled,
      notificationDaysBefore: data.notificationDaysBefore,
    });
    return id;
  },
});

// Bulk create subscriptions (admin only)
export const bulkCreate = mutation({
  args: {
    adminEmail: v.string(),
    subscriptions: v.array(
      v.object({
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
        nextRenewalDate: v.string(),
        paymentMethod: v.union(
          v.literal("credit_card"),
          v.literal("debit_card"),
          v.literal("bank_transfer"),
          v.literal("upi"),
          v.literal("other")
        ),
        status: v.union(
          v.literal("active"),
          v.literal("expired"),
          v.literal("cancelled"),
          v.literal("pending")
        ),
        notificationEnabled: v.boolean(),
        notificationDaysBefore: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.adminEmail);

    if (args.subscriptions.length > 100) {
      throw new Error("Maximum 100 subscriptions per bulk import");
    }

    // Validate all category/currency IDs upfront
    const categoryIds = [...new Set(args.subscriptions.map((s) => s.categoryId))];
    const currencyIds = [...new Set(args.subscriptions.map((s) => s.currencyId))];

    const [categories, currencies] = await Promise.all([
      Promise.all(categoryIds.map((id) => ctx.db.get(id))),
      Promise.all(currencyIds.map((id) => ctx.db.get(id))),
    ]);

    const validCategoryIds = new Set(
      categories.filter(Boolean).map((c) => c!._id.toString())
    );
    const validCurrencyIds = new Set(
      currencies.filter((c) => c && c.isActive).map((c) => c!._id.toString())
    );

    const results: Array<{
      index: number;
      success: boolean;
      referenceNumber?: string;
      error?: string;
    }> = [];

    for (let i = 0; i < args.subscriptions.length; i++) {
      const sub = args.subscriptions[i];

      try {
        const { name, description, provider } = validateAndSanitizeCommonFields({
          name: sub.name,
          description: sub.description,
          provider: sub.provider,
        });
        validateCost(sub.cost);

        if (!validateDateString(sub.nextRenewalDate)) {
          throw new Error("Invalid renewal date");
        }
        validateNotificationDays(sub.notificationDaysBefore);

        if (!validCategoryIds.has(sub.categoryId.toString())) {
          throw new Error("Invalid category");
        }
        if (!validCurrencyIds.has(sub.currencyId.toString())) {
          throw new Error("Invalid or inactive currency");
        }

        const referenceNumber = await generateReferenceNumber(ctx, "subscription");

        await ctx.db.insert("subscriptions", {
          name,
          description,
          provider: provider ?? "",
          categoryId: sub.categoryId,
          cost: sub.cost,
          currencyId: sub.currencyId,
          billingCycle: sub.billingCycle,
          nextRenewalDate: sub.nextRenewalDate,
          paymentMethod: sub.paymentMethod,
          status: sub.status,
          notificationEnabled: sub.notificationEnabled,
          notificationDaysBefore: sub.notificationDaysBefore,
          referenceNumber,
        });

        results.push({ index: i, success: true, referenceNumber });
      } catch (err) {
        results.push({
          index: i,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return {
      total: args.subscriptions.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  },
});

// Delete subscription (admin only)
export const remove = mutation({
  args: {
    adminEmail: v.string(),
    id: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    await requireAdmin(ctx, args.adminEmail);

    // Parallel fetch: subscription + related data for deletion
    const [subscription, credentials, auditLogs] = await Promise.all([
      ctx.db.get(args.id),
      ctx.db.query("credentials")
        .withIndex("by_subscription", (q) => q.eq("subscriptionId", args.id))
        .collect(),
      ctx.db.query("auditLogs")
        .withIndex("by_subscription", (q) => q.eq("subscriptionId", args.id))
        .collect(),
    ]);

    if (!subscription) throw new Error("Subscription not found");

    // Delete all related records and the subscription
    const deleteOps = [
      ...credentials.map((cred) => ctx.db.delete(cred._id)),
      ...auditLogs.map((log) => ctx.db.delete(log._id)),
    ];
    await Promise.all(deleteOps);
    await ctx.db.delete(args.id);
  },
});

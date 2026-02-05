import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { validatePositiveNumber, sanitizeString } from "./lib/helpers";
import { requireAdmin } from "./lib/permissions";

// Internal mutation to update currency exchange rate (used by cron job)
export const updateExchangeRate = internalMutation({
  args: {
    code: v.string(),
    exchangeRate: v.number(),
  },
  handler: async (ctx, args) => {
    const currency = await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();

    if (currency) {
      await ctx.db.patch(currency._id, {
        exchangeRate: args.exchangeRate,
      });
      return { updated: true, code: args.code };
    }

    return { updated: false, code: args.code };
  },
});

// Public query - list all currencies
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("currencies").collect();
  },
});

// Public query - list active currencies only
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const currencies = await ctx.db.query("currencies").collect();
    return currencies.filter((c) => c.isActive);
  },
});

// Get single currency
export const get = query({
  args: { id: v.id("currencies") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get currency by code
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();
  },
});

// Create currency (admin only)
export const create = mutation({
  args: {
    adminEmail: v.string(),
    code: v.string(),
    name: v.string(),
    symbol: v.string(),
    exchangeRate: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    await requireAdmin(ctx, args.adminEmail);

    // Input validation
    const code = args.code.toUpperCase().trim();
    const name = sanitizeString(args.name);
    const symbol = sanitizeString(args.symbol);

    if (!code || code.length < 2 || code.length > 5) {
      throw new Error("Currency code must be between 2 and 5 characters");
    }

    if (!/^[A-Z]+$/.test(code)) {
      throw new Error("Currency code must contain only letters");
    }

    if (!name || name.length < 1 || name.length > 100) {
      throw new Error("Currency name must be between 1 and 100 characters");
    }

    if (!symbol || symbol.length < 1 || symbol.length > 5) {
      throw new Error("Currency symbol must be between 1 and 5 characters");
    }

    if (!validatePositiveNumber(args.exchangeRate) || args.exchangeRate <= 0) {
      throw new Error("Exchange rate must be a positive number");
    }

    // Check if currency code already exists
    const existing = await ctx.db
      .query("currencies")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    if (existing) {
      throw new Error(`Currency with code ${code} already exists`);
    }

    return await ctx.db.insert("currencies", {
      code,
      name,
      symbol,
      exchangeRate: args.exchangeRate,
      isActive: args.isActive,
    });
  },
});

// Update currency (admin only)
export const update = mutation({
  args: {
    adminEmail: v.string(),
    id: v.id("currencies"),
    name: v.string(),
    symbol: v.string(),
    exchangeRate: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    await requireAdmin(ctx, args.adminEmail);

    const { id, adminEmail, ...data } = args;

    // Verify currency exists
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Currency not found");
    }

    // Input validation
    const name = sanitizeString(data.name);
    const symbol = sanitizeString(data.symbol);

    if (!name || name.length < 1 || name.length > 100) {
      throw new Error("Currency name must be between 1 and 100 characters");
    }

    if (!symbol || symbol.length < 1 || symbol.length > 5) {
      throw new Error("Currency symbol must be between 1 and 5 characters");
    }

    if (!validatePositiveNumber(data.exchangeRate) || data.exchangeRate <= 0) {
      throw new Error("Exchange rate must be a positive number");
    }

    // Prevent modifying INR exchange rate
    if (existing.code === "INR" && data.exchangeRate !== 1) {
      throw new Error("Cannot modify INR exchange rate (base currency)");
    }

    await ctx.db.patch(id, {
      name,
      symbol,
      exchangeRate: data.exchangeRate,
      isActive: data.isActive,
    });
    return id;
  },
});

// Toggle currency active status (admin only)
export const toggleActive = mutation({
  args: {
    adminEmail: v.string(),
    id: v.id("currencies"),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    await requireAdmin(ctx, args.adminEmail);

    const currency = await ctx.db.get(args.id);
    if (!currency) {
      throw new Error("Currency not found");
    }

    // Prevent deactivating INR
    if (currency.code === "INR" && currency.isActive) {
      throw new Error("Cannot deactivate INR (base currency)");
    }

    await ctx.db.patch(args.id, { isActive: !currency.isActive });
    return args.id;
  },
});

// Delete currency (admin only)
export const remove = mutation({
  args: {
    adminEmail: v.string(),
    id: v.id("currencies"),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    await requireAdmin(ctx, args.adminEmail);

    const currency = await ctx.db.get(args.id);
    if (!currency) {
      throw new Error("Currency not found");
    }

    // Prevent deleting INR
    if (currency.code === "INR") {
      throw new Error("Cannot delete INR (base currency)");
    }

    // Check if any subscriptions use this currency (use index + first for efficiency)
    const subscriptionUsingCurrency = await ctx.db
      .query("subscriptions")
      .withIndex("by_currency", (q) => q.eq("currencyId", args.id))
      .first();

    if (subscriptionUsingCurrency) {
      throw new Error("Cannot delete currency that is in use by subscriptions");
    }

    // Also check subscription requests
    const requestUsingCurrency = await ctx.db
      .query("subscriptionRequests")
      .filter((q) => q.eq(q.field("currencyId"), args.id))
      .first();

    if (requestUsingCurrency) {
      throw new Error("Cannot delete currency that is in use by subscription requests");
    }

    await ctx.db.delete(args.id);
  },
});

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { validateHexColor, sanitizeString } from "./lib/helpers";
import { requireAdmin } from "./lib/permissions";

// Public query - list all categories
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("categories").collect();
  },
});

// Get single category
export const get = query({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create category (admin only)
export const create = mutation({
  args: {
    adminEmail: v.string(),
    name: v.string(),
    description: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    await requireAdmin(ctx, args.adminEmail);

    // Input validation
    const name = sanitizeString(args.name);
    const description = sanitizeString(args.description);

    if (!name || name.length < 1 || name.length > 100) {
      throw new Error("Category name must be between 1 and 100 characters");
    }

    if (description.length > 500) {
      throw new Error("Description must not exceed 500 characters");
    }

    if (!validateHexColor(args.color)) {
      throw new Error("Invalid color format. Use hex format (e.g., #3B82F6)");
    }

    // Check for duplicate name (case-insensitive check)
    // Note: Index is case-sensitive, so we check both exact match and do a filtered scan
    const existingExact = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    if (existingExact) {
      throw new Error("A category with this name already exists");
    }
    // Also check case-insensitive (scan is acceptable for small categories table)
    const allCategories = await ctx.db.query("categories").collect();
    if (allCategories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
      throw new Error("A category with this name already exists");
    }

    return await ctx.db.insert("categories", {
      name,
      description,
      color: args.color,
    });
  },
});

// Update category (admin only)
export const update = mutation({
  args: {
    adminEmail: v.string(),
    id: v.id("categories"),
    name: v.string(),
    description: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    await requireAdmin(ctx, args.adminEmail);

    const { id, adminEmail, ...data } = args;

    // Verify category exists
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Category not found");
    }

    // Input validation
    const name = sanitizeString(data.name);
    const description = sanitizeString(data.description);

    if (!name || name.length < 1 || name.length > 100) {
      throw new Error("Category name must be between 1 and 100 characters");
    }

    if (description.length > 500) {
      throw new Error("Description must not exceed 500 characters");
    }

    if (!validateHexColor(data.color)) {
      throw new Error("Invalid color format. Use hex format (e.g., #3B82F6)");
    }

    // Check for duplicate name (excluding current category)
    // First try exact match with index
    const existingExact = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    if (existingExact && existingExact._id !== id) {
      throw new Error("A category with this name already exists");
    }
    // Also check case-insensitive (scan is acceptable for small categories table)
    const allCategories = await ctx.db.query("categories").collect();
    if (allCategories.some(cat => cat._id !== id && cat.name.toLowerCase() === name.toLowerCase())) {
      throw new Error("A category with this name already exists");
    }

    await ctx.db.patch(id, {
      name,
      description,
      color: data.color,
    });
    return id;
  },
});

// Delete category (admin only)
export const remove = mutation({
  args: {
    adminEmail: v.string(),
    id: v.id("categories"),
  },
  handler: async (ctx, args) => {
    // Verify admin authentication
    await requireAdmin(ctx, args.adminEmail);

    // Verify category exists
    const category = await ctx.db.get(args.id);
    if (!category) {
      throw new Error("Category not found");
    }

    // Check if any subscriptions use this category
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_category", (q) => q.eq("categoryId", args.id))
      .first();

    if (subscriptions) {
      throw new Error("Cannot delete category that is in use by subscriptions");
    }

    // Check if any subscription requests use this category
    const requests = await ctx.db.query("subscriptionRequests").collect();
    if (requests.some(r => r.categoryId === args.id)) {
      throw new Error("Cannot delete category that is in use by subscription requests");
    }

    await ctx.db.delete(args.id);
  },
});

import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { validateEmail } from "./lib/helpers";
import bcrypt from "bcryptjs";

// Login mutation - verify email and password
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    if (!validateEmail(email)) {
      throw new Error("Invalid email or password");
    }

    if (!args.password || args.password.length < 1) {
      throw new Error("Invalid email or password");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isValid = bcrypt.compareSync(args.password, user.passwordHash);

    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  },
});

// Internal mutation for creating admin user (used by seed only)
export const createAdminInternal = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    if (!validateEmail(email)) {
      throw new Error("Invalid email format");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      throw new Error("User with this email already exists");
    }

    const passwordHash = bcrypt.hashSync(args.password, 12);

    return await ctx.db.insert("users", {
      email,
      name: args.name.trim(),
      passwordHash,
      role: "admin",
    });
  },
});

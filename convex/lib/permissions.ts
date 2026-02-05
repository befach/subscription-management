import type { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Admin authentication middleware for Convex functions.
 *
 * Usage in mutations/queries:
 * ```typescript
 * export const someAdminMutation = mutation({
 *   args: { adminEmail: v.string(), ...otherArgs },
 *   handler: async (ctx, args) => {
 *     const admin = await requireAdmin(ctx, args.adminEmail);
 *     // ... rest of handler
 *   },
 * });
 * ```
 */

export interface AdminUser {
  _id: string;
  email: string;
  name: string;
  role: "admin";
}

/**
 * Validates that the provided email belongs to an authenticated admin user.
 * Throws an error if not authenticated or not an admin.
 *
 * @param ctx - Convex query or mutation context
 * @param email - Email from the client session
 * @returns The admin user object
 * @throws Error if not authenticated or not an admin
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  email: string | undefined | null
): Promise<AdminUser> {
  if (!email) {
    throw new Error("Authentication required");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
    .unique();

  if (!user) {
    throw new Error("Authentication required");
  }

  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return {
    _id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

/**
 * Optional admin check - returns null if not authenticated instead of throwing.
 * Useful for queries that should return different data for admins vs public.
 */
export async function getAdminOrNull(
  ctx: QueryCtx | MutationCtx,
  email: string | undefined | null
): Promise<AdminUser | null> {
  if (!email) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
    .unique();

  if (!user || user.role !== "admin") {
    return null;
  }

  return {
    _id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Categories table
  categories: defineTable({
    name: v.string(),
    description: v.string(),
    color: v.string(),
  }).index("by_name", ["name"]),

  // Currencies table
  currencies: defineTable({
    code: v.string(),
    name: v.string(),
    symbol: v.string(),
    exchangeRate: v.number(), // relative to INR (INR = 1)
    isActive: v.boolean(),
  }).index("by_code", ["code"]),

  // Subscriptions table
  subscriptions: defineTable({
    referenceNumber: v.string(),
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
    nextRenewalDate: v.string(), // ISO date string
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
    .index("by_reference", ["referenceNumber"])
    .index("by_status", ["status"])
    .index("by_category", ["categoryId"])
    .index("by_renewal", ["nextRenewalDate"])
    .index("by_currency", ["currencyId"]),

  // Credentials table (sensitive - admin only)
  credentials: defineTable({
    subscriptionId: v.id("subscriptions"),
    username: v.string(),
    password: v.string(),
    notes: v.optional(v.string()),
  }).index("by_subscription", ["subscriptionId"]),

  // Subscription Requests table (public submissions)
  subscriptionRequests: defineTable({
    referenceNumber: v.string(),
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
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    adminNotes: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.string()),
  })
    .index("by_reference", ["referenceNumber"])
    .index("by_status", ["status"]),

  // Audit Logs table
  auditLogs: defineTable({
    subscriptionId: v.id("subscriptions"),
    subscriptionName: v.string(),
    action: v.union(
      v.literal("viewed"),
      v.literal("copied"),
      v.literal("updated")
    ),
    performedBy: v.string(),
    performedAt: v.string(), // ISO date string
  }).index("by_subscription", ["subscriptionId"]),

  // Admin Users table
  users: defineTable({
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(),
    role: v.literal("admin"),
  }).index("by_email", ["email"]),

  // Reference counters for sequential numbering
  counters: defineTable({
    name: v.string(),
    value: v.number(),
  }).index("by_name", ["name"]),

  // Rate limiting table for tracking submissions
  rateLimits: defineTable({
    key: v.string(), // "global" or email address
    windowStart: v.number(), // timestamp
    count: v.number(),
  }).index("by_key", ["key"]),
});

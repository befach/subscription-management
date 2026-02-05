import { internalMutation } from "./_generated/server";
import { encrypt } from "./lib/encryption";
import bcrypt from "bcryptjs";

/**
 * Get encryption key from environment.
 * Returns null if not set (seed will skip credential seeding).
 */
function getEncryptionKey(): string | null {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    return null;
  }
  return key;
}

/**
 * Generate a secure random password for admin user.
 */
function generateSecurePassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

// Seed the database with initial data
// This should only be run once during initial setup
export const seedDatabase = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existingCategories = await ctx.db.query("categories").first();
    if (existingCategories) {
      throw new Error("Database already seeded. Delete all data first to re-seed.");
    }

    // Seed categories
    const categoryIds = await Promise.all([
      ctx.db.insert("categories", {
        name: "Software & SaaS",
        description: "Software subscriptions and SaaS tools",
        color: "#3B82F6",
      }),
      ctx.db.insert("categories", {
        name: "Cloud Infrastructure",
        description: "AWS, Azure, GCP and other cloud services",
        color: "#8B5CF6",
      }),
      ctx.db.insert("categories", {
        name: "Marketing Tools",
        description: "Marketing automation and analytics",
        color: "#EC4899",
      }),
      ctx.db.insert("categories", {
        name: "Communication",
        description: "Slack, Zoom, Email services",
        color: "#10B981",
      }),
      ctx.db.insert("categories", {
        name: "Design & Creative",
        description: "Adobe, Figma and design tools",
        color: "#F59E0B",
      }),
      ctx.db.insert("categories", {
        name: "Development Tools",
        description: "GitHub, JetBrains, IDEs",
        color: "#6366F1",
      }),
    ]);

    // Seed currencies
    const currencyIds = await Promise.all([
      ctx.db.insert("currencies", {
        code: "INR",
        name: "Indian Rupee",
        symbol: "₹",
        exchangeRate: 1,
        isActive: true,
      }),
      ctx.db.insert("currencies", {
        code: "USD",
        name: "US Dollar",
        symbol: "$",
        exchangeRate: 83.5,
        isActive: true,
      }),
      ctx.db.insert("currencies", {
        code: "EUR",
        name: "Euro",
        symbol: "€",
        exchangeRate: 90.2,
        isActive: true,
      }),
      ctx.db.insert("currencies", {
        code: "GBP",
        name: "British Pound",
        symbol: "£",
        exchangeRate: 105.8,
        isActive: true,
      }),
    ]);

    // Seed admin user with secure generated password
    // The password is logged once - save it immediately!
    const adminPassword = process.env.ADMIN_PASSWORD || generateSecurePassword();
    const passwordHash = bcrypt.hashSync(adminPassword, 12);

    await ctx.db.insert("users", {
      email: process.env.ADMIN_EMAIL || "admin@company.com",
      name: "Admin User",
      passwordHash,
      role: "admin",
    });

    // Log the admin password (only shown once during seeding)
    console.log("============================================");
    console.log("ADMIN CREDENTIALS (SAVE THESE!):");
    console.log(`Email: ${process.env.ADMIN_EMAIL || "admin@company.com"}`);
    console.log(`Password: ${adminPassword}`);
    console.log("============================================");
    console.log("WARNING: Change this password immediately after first login!");

    // Initialize counters for reference numbers
    const year = new Date().getFullYear();
    await ctx.db.insert("counters", { name: `subscription-${year}`, value: 0 });
    await ctx.db.insert("counters", { name: `request-${year}`, value: 0 });

    // Seed sample subscriptions
    const [softwareCat, cloudCat, marketingCat, commCat, designCat, devCat] = categoryIds;
    const [inrCurrency, usdCurrency] = currencyIds;

    const subscriptionIds = await Promise.all([
      ctx.db.insert("subscriptions", {
        referenceNumber: "SUB-2026-001",
        name: "Microsoft 365 Business",
        description: "Complete Office suite with Teams, SharePoint, and Exchange",
        provider: "Microsoft",
        categoryId: commCat,
        cost: 12500,
        currencyId: inrCurrency,
        billingCycle: "yearly",
        nextRenewalDate: "2026-03-15",
        paymentMethod: "credit_card",
        status: "active",
        notificationEnabled: true,
        notificationDaysBefore: 7,
      }),
      ctx.db.insert("subscriptions", {
        referenceNumber: "SUB-2026-002",
        name: "Slack Pro",
        description: "Team collaboration and messaging platform",
        provider: "Slack Technologies",
        categoryId: commCat,
        cost: 1500,
        currencyId: inrCurrency,
        billingCycle: "monthly",
        nextRenewalDate: "2026-02-10",
        paymentMethod: "credit_card",
        status: "active",
        notificationEnabled: true,
        notificationDaysBefore: 3,
      }),
      ctx.db.insert("subscriptions", {
        referenceNumber: "SUB-2026-003",
        name: "AWS Business Support",
        description: "Cloud infrastructure and services",
        provider: "Amazon Web Services",
        categoryId: cloudCat,
        cost: 45000,
        currencyId: inrCurrency,
        billingCycle: "monthly",
        nextRenewalDate: "2026-02-05",
        paymentMethod: "credit_card",
        status: "active",
        notificationEnabled: true,
        notificationDaysBefore: 7,
      }),
      ctx.db.insert("subscriptions", {
        referenceNumber: "SUB-2026-004",
        name: "Zoom Business",
        description: "Video conferencing and webinars",
        provider: "Zoom Video Communications",
        categoryId: commCat,
        cost: 1999,
        currencyId: inrCurrency,
        billingCycle: "monthly",
        nextRenewalDate: "2026-02-20",
        paymentMethod: "credit_card",
        status: "active",
        notificationEnabled: true,
        notificationDaysBefore: 3,
      }),
      ctx.db.insert("subscriptions", {
        referenceNumber: "SUB-2026-005",
        name: "Adobe Creative Cloud",
        description: "Design and creative tools for the team",
        provider: "Adobe Inc.",
        categoryId: designCat,
        cost: 55000,
        currencyId: inrCurrency,
        billingCycle: "yearly",
        nextRenewalDate: "2026-04-01",
        paymentMethod: "credit_card",
        status: "active",
        notificationEnabled: true,
        notificationDaysBefore: 14,
      }),
      ctx.db.insert("subscriptions", {
        referenceNumber: "SUB-2026-006",
        name: "GitHub Team",
        description: "Code repository and collaboration",
        provider: "GitHub",
        categoryId: devCat,
        cost: 400,
        currencyId: usdCurrency,
        billingCycle: "monthly",
        nextRenewalDate: "2026-02-15",
        paymentMethod: "credit_card",
        status: "active",
        notificationEnabled: true,
        notificationDaysBefore: 7,
      }),
      ctx.db.insert("subscriptions", {
        referenceNumber: "SUB-2026-007",
        name: "HubSpot Marketing",
        description: "Marketing automation and CRM",
        provider: "HubSpot",
        categoryId: marketingCat,
        cost: 800,
        currencyId: usdCurrency,
        billingCycle: "monthly",
        nextRenewalDate: "2026-02-08",
        paymentMethod: "credit_card",
        status: "active",
        notificationEnabled: true,
        notificationDaysBefore: 7,
      }),
      ctx.db.insert("subscriptions", {
        referenceNumber: "SUB-2026-008",
        name: "Notion Enterprise",
        description: "Workspace and documentation platform",
        provider: "Notion Labs",
        categoryId: softwareCat,
        cost: 8000,
        currencyId: inrCurrency,
        billingCycle: "yearly",
        nextRenewalDate: "2026-05-10",
        paymentMethod: "credit_card",
        status: "active",
        notificationEnabled: true,
        notificationDaysBefore: 14,
      }),
    ]);

    // Update counters to reflect seeded subscriptions
    const subCounter = await ctx.db
      .query("counters")
      .withIndex("by_name", (q) => q.eq("name", `subscription-${year}`))
      .unique();
    if (subCounter) {
      await ctx.db.patch(subCounter._id, { value: 8 });
    }

    // Seed sample credentials (passwords are encrypted)
    // Only seed if ENCRYPTION_KEY is properly configured
    const encryptionKey = getEncryptionKey();
    if (encryptionKey) {
      // NOTE: These are demo passwords - replace with secure passwords in production
      await Promise.all([
        ctx.db.insert("credentials", {
          subscriptionId: subscriptionIds[0],
          username: "admin@company.com",
          password: encrypt("demo-password-change-me", encryptionKey),
          notes: "Main admin account - CHANGE PASSWORD",
        }),
        ctx.db.insert("credentials", {
          subscriptionId: subscriptionIds[1],
          username: "company_admin",
          password: encrypt("demo-password-change-me", encryptionKey),
          notes: "Workspace admin - CHANGE PASSWORD",
        }),
        ctx.db.insert("credentials", {
          subscriptionId: subscriptionIds[2],
          username: "admin@company.com",
          password: encrypt("demo-password-change-me", encryptionKey),
          notes: "Root account - use MFA - CHANGE PASSWORD",
        }),
        ctx.db.insert("credentials", {
          subscriptionId: subscriptionIds[3],
          username: "company.zoom",
          password: encrypt("demo-password-change-me", encryptionKey),
          notes: "CHANGE PASSWORD",
        }),
        ctx.db.insert("credentials", {
          subscriptionId: subscriptionIds[4],
          username: "admin@company.com",
          password: encrypt("demo-password-change-me", encryptionKey),
          notes: "Creative Cloud for teams - CHANGE PASSWORD",
        }),
      ]);
    } else {
      console.log("ENCRYPTION_KEY not set - skipping credential seeding.");
      console.log("Set it via: npx convex env set ENCRYPTION_KEY $(openssl rand -hex 32)");
    }

    // Seed sample subscription requests
    await Promise.all([
      ctx.db.insert("subscriptionRequests", {
        referenceNumber: "REQ-2026-001",
        name: "Figma Professional",
        description: "Design collaboration tool for the product team",
        provider: "Figma",
        categoryId: designCat,
        cost: 450,
        currencyId: usdCurrency,
        billingCycle: "monthly",
        requestedBy: "John Designer",
        requesterEmail: "john@company.com",
        requesterDepartment: "Design",
        justification: "Need for collaborative design work with external stakeholders",
        status: "pending",
      }),
      ctx.db.insert("subscriptionRequests", {
        referenceNumber: "REQ-2026-002",
        name: "Linear",
        description: "Issue tracking and project management",
        provider: "Linear Orbit",
        categoryId: softwareCat,
        cost: 800,
        currencyId: inrCurrency,
        billingCycle: "monthly",
        requestedBy: "Sarah PM",
        requesterEmail: "sarah@company.com",
        requesterDepartment: "Product",
        justification: "Better project tracking for engineering teams",
        status: "pending",
      }),
      ctx.db.insert("subscriptionRequests", {
        referenceNumber: "REQ-2026-003",
        name: "Datadog",
        description: "Monitoring and analytics platform",
        provider: "Datadog",
        categoryId: cloudCat,
        cost: 1500,
        currencyId: usdCurrency,
        billingCycle: "monthly",
        requestedBy: "Mike DevOps",
        requesterEmail: "mike@company.com",
        requesterDepartment: "Engineering",
        justification: "Infrastructure monitoring and alerting",
        status: "approved",
        adminNotes: "Approved for Q1 budget",
        reviewedBy: "Admin User",
        reviewedAt: "2026-01-25T10:00:00Z",
      }),
    ]);

    // Update request counter
    const reqCounter = await ctx.db
      .query("counters")
      .withIndex("by_name", (q) => q.eq("name", `request-${year}`))
      .unique();
    if (reqCounter) {
      await ctx.db.patch(reqCounter._id, { value: 3 });
    }

    return {
      categories: categoryIds.length,
      currencies: currencyIds.length,
      subscriptions: subscriptionIds.length,
      message: "Database seeded successfully!",
    };
  },
});

// Clear all data (for development only)
// SECURITY: This is an internal mutation - not exposed to public API
export const clearDatabase = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Delete all records from each table in order (respect foreign key relationships)
    // Using explicit queries for type safety instead of dynamic table names

    // Delete audit logs first (references subscriptions)
    const auditLogs = await ctx.db.query("auditLogs").collect();
    for (const record of auditLogs) {
      await ctx.db.delete(record._id);
    }

    // Delete credentials (references subscriptions)
    const credentials = await ctx.db.query("credentials").collect();
    for (const record of credentials) {
      await ctx.db.delete(record._id);
    }

    // Delete subscription requests (references categories, currencies)
    const requests = await ctx.db.query("subscriptionRequests").collect();
    for (const record of requests) {
      await ctx.db.delete(record._id);
    }

    // Delete subscriptions (references categories, currencies)
    const subscriptions = await ctx.db.query("subscriptions").collect();
    for (const record of subscriptions) {
      await ctx.db.delete(record._id);
    }

    // Delete rate limits
    const rateLimits = await ctx.db.query("rateLimits").collect();
    for (const record of rateLimits) {
      await ctx.db.delete(record._id);
    }

    // Delete currencies
    const currencies = await ctx.db.query("currencies").collect();
    for (const record of currencies) {
      await ctx.db.delete(record._id);
    }

    // Delete categories
    const categories = await ctx.db.query("categories").collect();
    for (const record of categories) {
      await ctx.db.delete(record._id);
    }

    // Delete users
    const users = await ctx.db.query("users").collect();
    for (const record of users) {
      await ctx.db.delete(record._id);
    }

    // Delete counters
    const counters = await ctx.db.query("counters").collect();
    for (const record of counters) {
      await ctx.db.delete(record._id);
    }

    return { message: "Database cleared successfully!" };
  },
});

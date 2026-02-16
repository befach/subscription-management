import type { MutationCtx, QueryCtx } from "../_generated/server";

// Input validation helpers

/**
 * Validates an email address with stricter rules:
 * - Proper local part characters (alphanumeric, dots, hyphens, underscores, plus)
 * - No consecutive dots
 * - TLD must be at least 2 characters
 */
export function validateEmail(email: string): boolean {
  // More robust email regex:
  // - Local part: alphanumeric, dots (not consecutive), hyphens, underscores, plus
  // - Domain: alphanumeric and hyphens
  // - TLD: at least 2 letters
  const emailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

  if (!email || email.length > 254) return false;

  // Check for consecutive dots
  if (/\.\./.test(email)) return false;

  return emailRegex.test(email);
}

/**
 * Escapes HTML special characters to prevent XSS in email templates.
 * Use this for any user-provided content that will be interpolated into HTML.
 */
export function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function validatePositiveNumber(value: number): boolean {
  return typeof value === "number" && !isNaN(value) && value >= 0;
}

export function validateDateString(dateString: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

export function validateHexColor(color: string): boolean {
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(color);
}

export function sanitizeString(str: string): string {
  if (!str) return "";
  // Remove potential XSS vectors while preserving normal text
  return str
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

// String length validation with custom error messages
export function validateStringLength(
  value: string,
  fieldName: string,
  min: number,
  max: number
): void {
  if (!value || value.length < min || value.length > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max} characters`);
  }
}

// Cost validation with max limit
export function validateCost(cost: number, maxAmount = 100000000): void {
  if (!validatePositiveNumber(cost)) {
    throw new Error("Cost must be a non-negative number");
  }
  if (cost > maxAmount) {
    throw new Error("Cost exceeds maximum allowed value");
  }
}

// Notification days validation
export function validateNotificationDays(days: number, maxDays = 365): void {
  if (!validatePositiveNumber(days) || days > maxDays) {
    throw new Error(`Notification days must be between 0 and ${maxDays}`);
  }
}

// Validate and sanitize subscription/request common fields
export interface CommonFieldsInput {
  name: string;
  description: string;
  provider?: string;
}

export interface SanitizedCommonFields {
  name: string;
  description: string;
  provider?: string;
}

export function validateAndSanitizeCommonFields(
  input: CommonFieldsInput,
  options: { descriptionMin?: number; descriptionMax?: number } = {}
): SanitizedCommonFields {
  const { descriptionMin = 0, descriptionMax = 1000 } = options;

  const name = sanitizeString(input.name);
  const description = sanitizeString(input.description);
  const provider = input.provider ? sanitizeString(input.provider) : undefined;

  validateStringLength(name, "Subscription name", 1, 200);

  if (descriptionMin > 0) {
    validateStringLength(description, "Description", descriptionMin, descriptionMax);
  } else if (description.length > descriptionMax) {
    throw new Error(`Description must not exceed ${descriptionMax} characters`);
  }

  if (provider) {
    validateStringLength(provider, "Provider", 1, 200);
  }

  return { name, description, provider };
}

// Calculate monthly cost from billing cycle
export function calculateMonthlyCost(
  cost: number,
  billingCycle: "monthly" | "quarterly" | "half-yearly" | "yearly"
): number {
  switch (billingCycle) {
    case "monthly":
      return cost;
    case "quarterly":
      return cost / 3;
    case "half-yearly":
      return cost / 6;
    case "yearly":
      return cost / 12;
    default:
      return cost;
  }
}

// Generate reference number with atomic counter
export async function generateReferenceNumber(
  ctx: MutationCtx,
  type: "subscription" | "request"
): Promise<string> {
  const year = new Date().getFullYear();
  const counterName = `${type}-${year}`;

  const counter = await ctx.db
    .query("counters")
    .withIndex("by_name", (q) => q.eq("name", counterName))
    .unique();

  let nextValue: number;
  if (counter) {
    nextValue = counter.value + 1;
    await ctx.db.patch(counter._id, { value: nextValue });
  } else {
    nextValue = 1;
    await ctx.db.insert("counters", { name: counterName, value: 1 });
  }

  const prefix = type === "subscription" ? "SUB" : "REQ";
  return `${prefix}-${year}-${nextValue.toString().padStart(3, "0")}`;
}

// Format date to ISO string
export function formatDateToISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Check if user is authenticated admin
export async function getCurrentUser(ctx: QueryCtx, sessionUserId: string | null) {
  if (!sessionUserId) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", sessionUserId))
    .unique();

  return user;
}

// Shared helper to fetch categories and currencies as Maps (reduces code duplication)
export async function getReferenceDataMaps(ctx: QueryCtx) {
  const [categories, currencies] = await Promise.all([
    ctx.db.query("categories").collect(),
    ctx.db.query("currencies").collect(),
  ]);

  return {
    categoryMap: new Map(categories.map((c) => [c._id.toString(), c])),
    currencyMap: new Map(currencies.map((c) => [c._id.toString(), c])),
  };
}

// Enrich subscription/request with category and currency data
export function enrichWithReferenceData<T extends { categoryId: any; currencyId: any }>(
  items: T[],
  categoryMap: Map<string, any>,
  currencyMap: Map<string, any>
) {
  return items.map((item) => ({
    ...item,
    category: categoryMap.get(item.categoryId.toString()),
    currency: currencyMap.get(item.currencyId.toString()),
  }));
}

// Bulk Import Utilities for CSV/Excel parsing and validation

type BillingCycle = "monthly" | "quarterly" | "half-yearly" | "yearly";
type PaymentMethod = "credit_card" | "debit_card" | "bank_transfer" | "upi" | "other";
type SubscriptionStatus = "active" | "expired" | "cancelled" | "pending";

// Subscription fields that can be mapped from CSV columns
export const SUBSCRIPTION_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "description", label: "Description", required: false },
  { key: "provider", label: "Provider", required: false },
  { key: "category", label: "Category", required: true },
  { key: "cost", label: "Cost", required: true },
  { key: "currency", label: "Currency", required: false },
  { key: "billingCycle", label: "Billing Cycle", required: false },
  { key: "nextRenewalDate", label: "Renewal Date", required: false },
  { key: "paymentMethod", label: "Payment Method", required: false },
  { key: "status", label: "Status", required: false },
] as const;

export type SubscriptionFieldKey = (typeof SUBSCRIPTION_FIELDS)[number]["key"];

// Column aliases for auto-detection (lowercase)
const COLUMN_ALIASES: Record<SubscriptionFieldKey, string[]> = {
  name: ["name", "subscription name", "subscription", "title", "service"],
  description: ["description", "desc", "details", "notes", "about"],
  provider: ["provider", "vendor", "company", "supplier", "publisher"],
  category: ["category", "type", "group", "cat"],
  cost: ["cost", "price", "amount", "fee", "charge", "rate"],
  currency: ["currency", "currency code", "curr", "cur"],
  billingCycle: ["billing cycle", "billing", "cycle", "frequency", "period", "billing period"],
  nextRenewalDate: ["renewal date", "next renewal", "renewal", "due date", "expiry", "expiry date", "next renewal date"],
  paymentMethod: ["payment method", "payment", "pay method", "payment type"],
  status: ["status", "state", "subscription status"],
};

/**
 * Auto-detect column mapping from CSV headers
 */
export function autoDetectMapping(headers: string[]): Record<string, SubscriptionFieldKey | "skip"> {
  const mapping: Record<string, SubscriptionFieldKey | "skip"> = {};
  const usedFields = new Set<string>();

  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    let matched = false;

    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (usedFields.has(field)) continue;

      // Exact match first
      if (aliases.includes(normalized)) {
        mapping[header] = field as SubscriptionFieldKey;
        usedFields.add(field);
        matched = true;
        break;
      }

      // Contains match
      if (aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized))) {
        mapping[header] = field as SubscriptionFieldKey;
        usedFields.add(field);
        matched = true;
        break;
      }
    }

    if (!matched) {
      mapping[header] = "skip";
    }
  }

  return mapping;
}

/**
 * Parse date from various formats
 */
export function parseDate(value: string): string | null {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim();

  // ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed + "T00:00:00");
    if (!isNaN(date.getTime())) return trimmed;
  }

  // DD/MM/YYYY or DD-MM-YYYY (common in India)
  const dmyMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  }

  // MM/DD/YYYY
  const mdyMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (mdyMatch) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  }

  // Try native Date parsing as fallback
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split("T")[0];
  }

  return null;
}

/**
 * Normalize billing cycle value
 */
export function normalizeBillingCycle(value: string): BillingCycle | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  const map: Record<string, BillingCycle> = {
    monthly: "monthly",
    month: "monthly",
    quarterly: "quarterly",
    quarter: "quarterly",
    "half-yearly": "half-yearly",
    "half yearly": "half-yearly",
    "semi-annual": "half-yearly",
    "semi-annually": "half-yearly",
    yearly: "yearly",
    year: "yearly",
    annual: "yearly",
    annually: "yearly",
  };
  return map[normalized] || null;
}

/**
 * Normalize payment method value
 */
export function normalizePaymentMethod(value: string): PaymentMethod | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim().replace(/[\s_-]+/g, "_");
  const map: Record<string, PaymentMethod> = {
    credit_card: "credit_card",
    creditcard: "credit_card",
    credit: "credit_card",
    debit_card: "debit_card",
    debitcard: "debit_card",
    debit: "debit_card",
    bank_transfer: "bank_transfer",
    banktransfer: "bank_transfer",
    bank: "bank_transfer",
    wire: "bank_transfer",
    upi: "upi",
    other: "other",
  };
  return map[normalized] || null;
}

/**
 * Normalize status value
 */
export function normalizeStatus(value: string): SubscriptionStatus | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  const map: Record<string, SubscriptionStatus> = {
    active: "active",
    expired: "expired",
    cancelled: "cancelled",
    canceled: "cancelled",
    pending: "pending",
  };
  return map[normalized] || null;
}

export interface CategoryInfo {
  _id: string;
  name: string;
}

export interface CurrencyInfo {
  _id: string;
  code: string;
  isActive: boolean;
}

export interface RowValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  data: Record<string, unknown> | null;
}

/**
 * Validate and resolve a single row of import data
 */
export function validateRow(
  row: Record<string, string>,
  mapping: Record<string, SubscriptionFieldKey | "skip">,
  categories: CategoryInfo[],
  currencies: CurrencyInfo[]
): RowValidationResult {
  const errors: Record<string, string> = {};

  // Helper to get mapped value
  const get = (field: SubscriptionFieldKey): string => {
    const csvCol = Object.entries(mapping).find(([, target]) => target === field)?.[0];
    return csvCol ? (row[csvCol]?.trim() || "") : "";
  };

  // Required: name
  const name = get("name");
  if (!name) errors.name = "Name is required";

  // Required: cost
  const costStr = get("cost");
  const cost = parseFloat(costStr);
  if (!costStr || isNaN(cost) || cost <= 0) errors.cost = "Must be a positive number";

  // Required: category (resolve by name)
  const categoryName = get("category");
  const category = categoryName
    ? categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase())
    : null;
  if (!categoryName) {
    errors.category = "Category is required";
  } else if (!category) {
    errors.category = `Unknown category: "${categoryName}"`;
  }

  // Optional: currency (default INR, resolve by code)
  const currencyCode = get("currency") || "INR";
  const currency = currencies.find(
    (c) => c.code.toLowerCase() === currencyCode.toLowerCase() && c.isActive
  );
  if (!currency) {
    errors.currency = `Unknown or inactive: "${currencyCode}"`;
  }

  // Optional: billingCycle
  const billingCycleRaw = get("billingCycle");
  const billingCycle = billingCycleRaw ? normalizeBillingCycle(billingCycleRaw) : "monthly";
  if (billingCycleRaw && !billingCycle) {
    errors.billingCycle = `Invalid: "${billingCycleRaw}"`;
  }

  // Optional: paymentMethod
  const paymentMethodRaw = get("paymentMethod");
  const paymentMethod = paymentMethodRaw ? normalizePaymentMethod(paymentMethodRaw) : "other";
  if (paymentMethodRaw && !paymentMethod) {
    errors.paymentMethod = `Invalid: "${paymentMethodRaw}"`;
  }

  // Optional: status
  const statusRaw = get("status");
  const status = statusRaw ? normalizeStatus(statusRaw) : "active";
  if (statusRaw && !status) {
    errors.status = `Invalid: "${statusRaw}"`;
  }

  // Optional: nextRenewalDate
  const dateRaw = get("nextRenewalDate");
  const nextRenewalDate = dateRaw ? parseDate(dateRaw) : new Date().toISOString().split("T")[0];
  if (dateRaw && !parseDate(dateRaw)) {
    errors.nextRenewalDate = `Invalid date: "${dateRaw}"`;
  }

  const description = get("description");
  const provider = get("provider");

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors, data: null };
  }

  return {
    valid: true,
    errors: {},
    data: {
      name,
      description: description || "",
      provider: provider || "",
      categoryId: category!._id,
      cost,
      currencyId: currency!._id,
      billingCycle: billingCycle || "monthly",
      nextRenewalDate: nextRenewalDate || new Date().toISOString().split("T")[0],
      paymentMethod: paymentMethod || "other",
      status: status || "active",
      notificationEnabled: true,
      notificationDaysBefore: 7,
    },
  };
}

/**
 * Generate a sample CSV template content
 */
export function generateCSVTemplate(): string {
  return `name,description,provider,category,cost,currency,billingCycle,nextRenewalDate,paymentMethod,status
Figma Pro,Design tool for UI/UX,Figma Inc.,Software & SaaS,1200,INR,monthly,2026-03-15,credit_card,active
AWS,Cloud hosting,Amazon,Cloud Infrastructure,45000,INR,monthly,2026-03-01,bank_transfer,active`;
}

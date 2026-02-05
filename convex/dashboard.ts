import { query } from "./_generated/server";
import { calculateMonthlyCost } from "./lib/helpers";

// Get dashboard statistics (admin)
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const subscriptions = await ctx.db.query("subscriptions").collect();
    const requests = await ctx.db.query("subscriptionRequests").collect();
    const currencies = await ctx.db.query("currencies").collect();

    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === "active"
    );

    // Use Map for O(1) lookups instead of array.find() O(n)
    const currencyMap = new Map(currencies.map((c) => [c._id, c]));

    // Calculate monthly spend in INR
    let monthlySpendINR = 0;
    for (const sub of activeSubscriptions) {
      const currency = currencyMap.get(sub.currencyId);
      const rate = currency?.exchangeRate || 1;
      const monthlyCost = calculateMonthlyCost(sub.cost, sub.billingCycle);
      monthlySpendINR += monthlyCost * rate;
    }

    // Calculate upcoming renewals
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcomingRenewals7Days = activeSubscriptions.filter((sub) => {
      const renewalDate = new Date(sub.nextRenewalDate);
      return renewalDate >= now && renewalDate <= in7Days;
    }).length;

    const upcomingRenewals30Days = activeSubscriptions.filter((sub) => {
      const renewalDate = new Date(sub.nextRenewalDate);
      return renewalDate >= now && renewalDate <= in30Days;
    }).length;

    const pendingApprovals = requests.filter(
      (r) => r.status === "pending"
    ).length;

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      monthlySpendINR: Math.round(monthlySpendINR),
      yearlySpendINR: Math.round(monthlySpendINR * 12),
      upcomingRenewals7Days,
      upcomingRenewals30Days,
      pendingApprovals,
    };
  },
});

// Get public dashboard statistics (no sensitive data)
export const getPublicStats = query({
  args: {},
  handler: async (ctx) => {
    const subscriptions = await ctx.db.query("subscriptions").collect();
    const requests = await ctx.db.query("subscriptionRequests").collect();
    const currencies = await ctx.db.query("currencies").collect();

    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === "active"
    );

    // Use Map for O(1) lookups instead of array.find() O(n)
    const currencyMap = new Map(currencies.map((c) => [c._id, c]));

    // Calculate monthly spend in INR
    let monthlySpendINR = 0;
    for (const sub of activeSubscriptions) {
      const currency = currencyMap.get(sub.currencyId);
      const rate = currency?.exchangeRate || 1;
      const monthlyCost = calculateMonthlyCost(sub.cost, sub.billingCycle);
      monthlySpendINR += monthlyCost * rate;
    }

    // Calculate upcoming renewals
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcomingRenewals = activeSubscriptions.filter((sub) => {
      const renewalDate = new Date(sub.nextRenewalDate);
      return renewalDate >= now && renewalDate <= in30Days;
    }).length;

    // Recently approved requests
    const recentlyApproved = requests
      .filter((r) => r.status === "approved")
      .sort(
        (a, b) =>
          new Date(b.reviewedAt || b._creationTime).getTime() -
          new Date(a.reviewedAt || a._creationTime).getTime()
      )
      .slice(0, 5);

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      monthlySpendINR: Math.round(monthlySpendINR),
      upcomingRenewals,
      recentlyApproved,
    };
  },
});

// Get spending by category
export const getSpendingByCategory = query({
  args: {},
  handler: async (ctx) => {
    const subscriptions = await ctx.db.query("subscriptions").collect();
    const categories = await ctx.db.query("categories").collect();
    const currencies = await ctx.db.query("currencies").collect();

    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === "active"
    );

    // Use Maps for O(1) lookups instead of array.find() O(n)
    const categoryMap = new Map(categories.map((c) => [c._id, c]));
    const currencyMap = new Map(currencies.map((c) => [c._id, c]));

    // Calculate spending by category
    const categorySpending: Record<
      string,
      { amountINR: number; categoryName: string; categoryColor: string }
    > = {};

    let totalSpendINR = 0;

    for (const sub of activeSubscriptions) {
      const currency = currencyMap.get(sub.currencyId);
      const category = categoryMap.get(sub.categoryId);
      const rate = currency?.exchangeRate || 1;
      const monthlyCost = calculateMonthlyCost(sub.cost, sub.billingCycle) * rate;

      totalSpendINR += monthlyCost;

      const catId = sub.categoryId;
      if (!categorySpending[catId]) {
        categorySpending[catId] = {
          amountINR: 0,
          categoryName: category?.name || "Unknown",
          categoryColor: category?.color || "#888888",
        };
      }
      categorySpending[catId].amountINR += monthlyCost;
    }

    // Convert to array with percentages
    return Object.entries(categorySpending).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.categoryName,
      categoryColor: data.categoryColor,
      amountINR: Math.round(data.amountINR),
      percentage:
        totalSpendINR > 0
          ? Math.round((data.amountINR / totalSpendINR) * 1000) / 10
          : 0,
    }));
  },
});

"use node";

/**
 * Cron Job Handlers
 *
 * These actions are called by the cron scheduler defined in crons.ts
 */

import { internalAction } from "../_generated/server";
import { internal, api } from "../_generated/api";

interface RenewalResult {
  sent: number;
  total: number;
  skipped?: number;
}

interface ExchangeRateResult {
  success: boolean;
  message: string;
  updated?: string[];
}

// Check for upcoming renewals and send reminders
export const checkRenewals = internalAction({
  args: {},
  handler: async (ctx): Promise<RenewalResult> => {
    // Get subscriptions with notifications enabled that renew in the next 14 days
    const renewals = await ctx.runQuery(api.subscriptions.listUpcomingRenewals, { days: 14 });

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.log("ADMIN_EMAIL not set, skipping renewal notifications");
      return { sent: 0, skipped: renewals?.length || 0, total: renewals?.length || 0 };
    }

    let sentCount = 0;
    const subscriptionList = renewals || [];

    for (const subscription of subscriptionList) {
      if (!subscription.notificationEnabled) continue;

      // Calculate days until renewal
      const today = new Date();
      const renewalDate = new Date(subscription.nextRenewalDate);
      const daysUntil = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Send notification when days until renewal matches the configured reminder days
      if (daysUntil === subscription.notificationDaysBefore) {
        try {
          await ctx.runAction(internal.actions.notifications.sendRenewalReminder, {
            subscriptionName: subscription.name,
            providerName: subscription.provider,
            renewalDate: subscription.nextRenewalDate,
            cost: subscription.cost,
            currencySymbol: subscription.currency?.symbol || "₹",
            recipientEmail: adminEmail,
            daysUntilRenewal: daysUntil,
          });
          sentCount++;
        } catch (error) {
          console.error(`Failed to send reminder for ${subscription.name}:`, error);
        }
      }
    }

    console.log(`Renewal check complete: ${sentCount} reminders sent`);
    return { sent: sentCount, total: subscriptionList.length };
  },
});

// Update exchange rates
export const updateExchangeRates = internalAction({
  args: {},
  handler: async (ctx): Promise<ExchangeRateResult> => {
    const result = await ctx.runAction(internal.actions.exchangeRates.fetchAndUpdateRates, {});
    console.log("Exchange rate update:", result.message);
    return result;
  },
});

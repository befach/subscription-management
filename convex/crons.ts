/**
 * Scheduled Tasks (Cron Jobs)
 *
 * Cron schedules that run automatically:
 * 1. Daily renewal check - sends reminders for upcoming renewals
 * 2. Weekly exchange rate update - fetches latest currency rates
 *
 * Handlers are defined in actions/cronHandlers.ts
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run renewal check daily at 9:00 AM UTC (2:30 PM IST)
crons.daily(
  "daily-renewal-check",
  { hourUTC: 9, minuteUTC: 0 },
  internal.actions.cronHandlers.checkRenewals
);

// Run exchange rate update weekly on Sunday at 2:00 AM UTC
crons.weekly(
  "weekly-exchange-rate-update",
  { dayOfWeek: "sunday", hourUTC: 2, minuteUTC: 0 },
  internal.actions.cronHandlers.updateExchangeRates
);

export default crons;

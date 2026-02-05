"use node";

/**
 * Exchange Rate Update Action
 *
 * Fetches latest exchange rates from ExchangeRate-API and updates the currencies table.
 * Uses INR as the base currency (exchangeRate = 1).
 *
 * Set up the API key via: npx convex env set EXCHANGERATE_API_KEY <your-key>
 * Get a free API key at: https://www.exchangerate-api.com
 *
 * Free tier: 1,500 requests/month (about 50/day)
 */

import { internalAction } from "../_generated/server";
import { api, internal } from "../_generated/api";

interface ExchangeRateResponse {
  result: "success" | "error";
  base_code: string;
  conversion_rates: Record<string, number>;
  error_type?: string;
}

// Internal action to fetch and update exchange rates
export const fetchAndUpdateRates = internalAction({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; message: string; updated?: string[] }> => {
    const apiKey = process.env.EXCHANGERATE_API_KEY;

    if (!apiKey) {
      console.log("EXCHANGERATE_API_KEY not set, skipping rate update");
      return {
        success: false,
        message: "EXCHANGERATE_API_KEY environment variable not set",
      };
    }

    try {
      // Fetch rates with INR as base
      const response = await fetch(
        `https://v6.exchangerate-api.com/v6/${apiKey}/latest/INR`
      );

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data: ExchangeRateResponse = await response.json();

      if (data.result !== "success") {
        throw new Error(data.error_type || "Unknown API error");
      }

      const rates = data.conversion_rates;

      // Get current currencies from the database
      const currencies = await ctx.runQuery(api.currencies.list);

      const updated: string[] = [];

      // Update each currency's exchange rate
      for (const currency of currencies) {
        if (currency.code === "INR") {
          // INR is base currency, always 1
          continue;
        }

        const inrToForeignRate = rates[currency.code];

        if (inrToForeignRate !== undefined) {
          // We need: "1 foreign = X INR"
          // API gives us: "1 INR = Y foreign"
          // So: "1 foreign = 1/Y INR"
          const foreignToInrRate = 1 / inrToForeignRate;

          await ctx.runMutation(internal.currencies.updateExchangeRate, {
            code: currency.code,
            exchangeRate: Math.round(foreignToInrRate * 100) / 100, // Round to 2 decimals
          });

          updated.push(currency.code);
        }
      }

      console.log(`Exchange rates updated: ${updated.join(", ")}`);

      return {
        success: true,
        message: `Updated ${updated.length} exchange rates`,
        updated,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to fetch exchange rates:", message);

      return {
        success: false,
        message: `Failed to fetch exchange rates: ${message}`,
      };
    }
  },
});

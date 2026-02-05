/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_cronHandlers from "../actions/cronHandlers.js";
import type * as actions_exchangeRates from "../actions/exchangeRates.js";
import type * as actions_notifications from "../actions/notifications.js";
import type * as auditLogs from "../auditLogs.js";
import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as credentials from "../credentials.js";
import type * as crons from "../crons.js";
import type * as currencies from "../currencies.js";
import type * as dashboard from "../dashboard.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_helpers from "../lib/helpers.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as seed from "../seed.js";
import type * as subscriptionRequests from "../subscriptionRequests.js";
import type * as subscriptions from "../subscriptions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/cronHandlers": typeof actions_cronHandlers;
  "actions/exchangeRates": typeof actions_exchangeRates;
  "actions/notifications": typeof actions_notifications;
  auditLogs: typeof auditLogs;
  auth: typeof auth;
  categories: typeof categories;
  credentials: typeof credentials;
  crons: typeof crons;
  currencies: typeof currencies;
  dashboard: typeof dashboard;
  "lib/encryption": typeof lib_encryption;
  "lib/helpers": typeof lib_helpers;
  "lib/permissions": typeof lib_permissions;
  seed: typeof seed;
  subscriptionRequests: typeof subscriptionRequests;
  subscriptions: typeof subscriptions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

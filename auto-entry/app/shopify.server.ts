import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
  BillingInterval,
  BillingReplacementBehavior,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January26,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    expiringOfflineAccessTokens: true,
  },
  billing: {
    "Starter": {
      amount: 19.99,
      currencyCode: "USD",
      interval: BillingInterval.Every30Days as any,
      replacementBehavior: BillingReplacementBehavior.ApplyImmediately,
    },
    "Growth": {
      amount: 49.99,
      currencyCode: "USD",
      interval: BillingInterval.Every30Days,
      replacementBehavior: BillingReplacementBehavior.ApplyImmediately,
    },
    "Power": {
      amount: 99.99,
      currencyCode: "USD",
      interval: BillingInterval.Every30Days,
      replacementBehavior: BillingReplacementBehavior.ApplyImmediately,
    },
    // Scan Top-Ups (One-time purchases)
    "TopUp100": {
      amount: 9.99,
      currencyCode: "USD",
      interval: BillingInterval.OneTime,
    },
    "TopUp500": {
      amount: 39.99,
      currencyCode: "USD",
      interval: BillingInterval.OneTime,
    },
    "TopUp1000": {
      amount: 69.99,
      currencyCode: "USD",
      interval: BillingInterval.OneTime,
    },
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

import { PLAN_LIMITS } from "./core/constants";

export { PLAN_LIMITS };

export default shopify;
export const apiVersion = ApiVersion.January26;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;

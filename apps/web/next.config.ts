import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui"],
  output: "standalone",
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Silent during builds — no noise in CI logs
  silent: !process.env.CI,

  // Upload source maps in production only
  sourcemaps: {
    disable: process.env.NODE_ENV !== "production",
  },

  // Disable the Sentry webpack plugin in development
  // Turbopack handles the rest
  disableLogger: true,

  // Automatically tree-shake Sentry logger statements
  automaticVercelMonitors: false,
});

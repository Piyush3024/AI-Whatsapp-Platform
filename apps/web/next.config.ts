import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { env } from "./src/env";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui"],
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
    // Add remote domains here when API returns image URLs
    // remotePatterns: [
    //   {
    //     protocol: "https",
    //     hostname: "your-s3-bucket.amazonaws.com",
    //   },
    // ],
  },
};

export default withSentryConfig(nextConfig, {
  org: env.SENTRY_ORG,
  project: env.SENTRY_PROJECT,
  authToken: env.SENTRY_AUTH_TOKEN,

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

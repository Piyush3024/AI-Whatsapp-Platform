import type { Metadata } from "next";
import "./globals.css";

import { Providers } from "@/components/layout/providers";
import NextTopLoader from "nextjs-toploader";

export const metadata: Metadata = {
  title: {
    default: "WA AI Platform",
    template: "%s | WA AI Platform",
  },
  description: "AI-powered WhatsApp automation for your business",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NextTopLoader
          color="hsl(217.2 91.2% 59.8%)"
          height={3}
          showSpinner={false}
          shadow={false}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

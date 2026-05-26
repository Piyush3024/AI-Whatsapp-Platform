import type { Metadata } from "next";
import "./globals.css";

import { Providers } from "@/components/layout/providers";

export const metadata: Metadata = {
  title: "WhatsApp AI Platform",
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

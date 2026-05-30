import type { Metadata } from "next";
import { AnalyticsPageContent } from "./_components/analytics-page-content";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Track your business performance metrics",
};

export default function AnalyticsPage() {
  return <AnalyticsPageContent />;
}

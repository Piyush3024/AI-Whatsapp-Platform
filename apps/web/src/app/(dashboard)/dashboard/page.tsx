import type { Metadata } from "next";
import { OverviewStats } from "./_components/overview-stats";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Overview of your business performance",
};

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground mt-1">
        Welcome to WhatsApp AI Platform
      </p>
      <div className="mt-6">
        <OverviewStats />
      </div>
    </div>
  );
}

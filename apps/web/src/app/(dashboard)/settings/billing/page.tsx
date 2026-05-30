import type { Metadata } from "next";
import { CurrentPlanCard } from "./_components/current-plan-card";
import { PlansList } from "./_components/plans-list";
import { InvoicesList } from "./_components/invoices-list";

export const metadata: Metadata = {
  title: "Billing",
  description: "Manage your subscription and invoices",
};

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and payment history
        </p>
      </div>
      <CurrentPlanCard />
      <PlansList />
      <InvoicesList />
    </div>
  );
}

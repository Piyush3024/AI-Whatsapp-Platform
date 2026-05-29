"use client";

import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import { Icons } from "@repo/ui/components/icons";
import { CustomerList } from "./_components/customer-list";
import { CustomerForm } from "./_components/customer-form";
import type { CustomerQuery } from "@/types/customer.types";

const DEFAULT_FILTERS: CustomerQuery = {
  page: 1,
  limit: 20,
};

export default function CustomersPage() {
  const [filters, setFilters] = useState<CustomerQuery>(DEFAULT_FILTERS);
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your customer base
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Icons.add className="size-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <CustomerList filters={filters} onFilterChange={setFilters} />

      <CustomerForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

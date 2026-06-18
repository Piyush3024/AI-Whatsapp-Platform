"use client";

import { useState } from "react";
import { useQueryStates } from "nuqs";
import { customerFilterParsers } from "../_lib/customer-filters.parsers";
import { Button } from "@repo/ui/components/button";
import { Icons } from "@repo/ui/components/icons";
import { CustomerList } from "./customer-list";
import { CustomerForm } from "./customer-form";
import type { CustomerQuery } from "@/types/customer.types";
import { useExportCustomers } from "../hooks/use-export-customers";
import { CustomerImportDialog } from "./customer-import-dialog";

export function CustomersPageContent() {
  const [filters, setFilters] = useQueryStates(customerFilterParsers);

  const customerQuery: CustomerQuery = {
    page: filters.page,
    limit: filters.limit,
    search: filters.search ?? undefined,
    status: filters.status ?? undefined,
    tag: filters.tag ?? undefined,
  };
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { exportCsv, isExporting } = useExportCustomers();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your customer base
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="cursor-pointer"
          >
            <Icons.upload className="size-4 mr-2" />
            Import CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(customerQuery)}
            disabled={isExporting}
            className="cursor-pointer"
          >
            {isExporting ? (
              <Icons.spinner className="size-4 mr-2 animate-spin" />
            ) : (
              <Icons.download className="size-4 mr-2" />
            )}
            {isExporting ? "Exporting…" : "Export CSV"}
          </Button>

          <Button onClick={() => setFormOpen(true)}>
            <Icons.add className="size-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      <CustomerList filters={customerQuery} onFilterChange={(q) => setFilters(q)} />

      <CustomerForm open={formOpen} onOpenChange={setFormOpen} />

      <CustomerImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

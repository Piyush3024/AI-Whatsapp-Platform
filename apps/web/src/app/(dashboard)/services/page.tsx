"use client";

import { useState } from "react";
import { ServiceList } from "./_components/service-list";
import type { ServiceQuery } from "@/types/service.types";

// export const metadata = { title: "Services" };

export default function ServicesPage() {
  const [filters, setFilters] = useState<ServiceQuery>({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Services</h1>
        <p className="text-muted-foreground mt-1">
          Manage your service offerings
        </p>
      </div>
      <ServiceList filters={filters} onFilterChange={setFilters} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { ServiceList } from "./service-list";
import type { ServiceQuery } from "@/types/service.types";

export function ServicesPageContent() {
  const [filters, setFilters] = useState<ServiceQuery>({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Services</h1>
        <p className="text-muted-foreground mt-1">
          Configure your business services
        </p>
      </div>
      <ServiceList filters={filters} onFilterChange={setFilters} />
    </div>
  );
}

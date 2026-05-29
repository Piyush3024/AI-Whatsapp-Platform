"use client";

import { useState } from "react";
import { StaffList } from "./_components/staff-list";
import type { StaffQuery } from "@/types/staff.types";

const DEFAULT_FILTERS: StaffQuery = {};

export default function StaffPage() {
  const [filters, setFilters] = useState<StaffQuery>(DEFAULT_FILTERS);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
        <p className="text-muted-foreground mt-1">Manage your team</p>
      </div>
      <StaffList filters={filters} onFilterChange={setFilters} />
    </div>
  );
}

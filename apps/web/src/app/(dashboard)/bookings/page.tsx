"use client";

import { useState } from "react";
import { BookingFilters } from "./_components/booking-filters";
import { BookingList } from "./_components/booking-list";
import type { BookingQuery } from "@/types/booking.types";
import { Button } from "@repo/ui/components/button";
import { Icons } from "@repo/ui/components/icons";
import { BookingForm } from "./_components/booking-form";

const DEFAULT_FILTERS: BookingQuery = {
  page: 1,
  limit: 20,
};

export default function BookingsPage() {
  const [filters, setFilters] = useState<BookingQuery>(DEFAULT_FILTERS);
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all your bookings
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Icons.add className="size-4 mr-2" />
          Create Booking
        </Button>
      </div>

      <BookingFilters
        filters={filters}
        onFilterChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      <BookingList filters={filters} onFilterChange={setFilters} />
      <BookingForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

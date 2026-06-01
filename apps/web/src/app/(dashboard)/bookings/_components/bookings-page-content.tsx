"use client";

import { useState } from "react";
import { BookingFilters } from "./booking-filters";
import { BookingList } from "./booking-list";
import type { BookingQuery } from "@/types/booking.types";
import { Button } from "@repo/ui/components/button";
import { Icons } from "@repo/ui/components/icons";
import { BookingForm } from "./booking-form";
import { useExportBookings } from "../hooks/use-export-booking";
import { CalendarViewToggle } from "../calendar/_components/calendar-view-toggle";

const DEFAULT_FILTERS: BookingQuery = {
  page: 1,
  limit: 20,
};

export function BookingsPageContent() {
  const [filters, setFilters] = useState<BookingQuery>(DEFAULT_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const { exportCsv, isExporting } = useExportBookings();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all your bookings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarViewToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(filters)}
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
            Create Booking
          </Button>
        </div>
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

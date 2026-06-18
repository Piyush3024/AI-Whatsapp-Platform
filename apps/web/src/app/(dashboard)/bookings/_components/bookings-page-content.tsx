"use client";

import { useState } from "react";
import { useQueryStates } from "nuqs";
import { bookingFilterParsers } from "../_lib/booking-filters.parsers";
import { BookingFilters } from "./booking-filters";
import { BookingList } from "./booking-list";
import type { BookingQuery } from "@/types/booking.types";
import { Button } from "@repo/ui/components/button";
import { Icons } from "@repo/ui/components/icons";
import { BookingForm } from "./booking-form";
import { useExportBookings } from "../hooks/use-export-booking";
import { CalendarViewToggle } from "../calendar/_components/calendar-view-toggle";

export function BookingsPageContent() {
  const [filters, setFilters] = useQueryStates(bookingFilterParsers);
  const [formOpen, setFormOpen] = useState(false);
  const { exportCsv, isExporting } = useExportBookings();

  const bookingQuery: BookingQuery = {
    page: filters.page,
    limit: filters.limit,
    status: filters.status ?? undefined,
    staffId: filters.staffId ?? undefined,
    customerId: filters.customerId ?? undefined,
    locationId: filters.locationId ?? undefined,
    source: filters.source ?? undefined,
    dateFrom: filters.dateFrom ?? undefined,
    dateTo: filters.dateTo ?? undefined,
  };

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
            onClick={() => exportCsv(bookingQuery)}
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
        filters={bookingQuery}
        onFilterChange={(q) => setFilters(q)}
        onReset={() =>
          setFilters({
            page: 1,
            limit: 20,
            status: null,
            staffId: null,
            customerId: null,
            locationId: null,
            source: null,
            dateFrom: null,
            dateTo: null,
          })
        }
      />

      <BookingList filters={bookingQuery} onFilterChange={(q) => setFilters(q)} />
      <BookingForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

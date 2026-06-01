"use client";

import { useState } from "react";
import { toast } from "sonner";
import { exportBookingsCsv } from "@/services/booking.service";
import { downloadCsv } from "@/lib/export";
import type { BookingQuery } from "@/types/booking.types";

export function useExportBookings() {
  const [isExporting, setIsExporting] = useState(false);

  const exportCsv = async (filters?: BookingQuery) => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const csv = await exportBookingsCsv(filters);
      const filename = `bookings-${new Date().toISOString().split("T")[0]}.csv`;
      downloadCsv(csv, filename);
      toast.success("Bookings exported successfully.");
    } catch {
      toast.error("Failed to export bookings. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportCsv, isExporting };
}

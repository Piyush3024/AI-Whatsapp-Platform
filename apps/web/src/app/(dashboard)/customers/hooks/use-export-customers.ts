"use client";

import { useState } from "react";
import { toast } from "sonner";
import { exportCustomersCsv } from "@/services/customer.service";
import { downloadCsv } from "@/lib/export";
import type { CustomerQuery } from "@/types/customer.types";

export function useExportCustomers() {
  const [isExporting, setIsExporting] = useState(false);

  const exportCsv = async (filters?: CustomerQuery) => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const csv = await exportCustomersCsv(filters);
      const filename = `customers-${new Date().toISOString().split("T")[0]}.csv`;
      downloadCsv(csv, filename);
      toast.success("Customers exported successfully.");
    } catch {
      toast.error("Failed to export customers. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportCsv, isExporting };
}

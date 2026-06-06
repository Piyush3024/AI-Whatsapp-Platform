"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { importCustomersCsv } from "@/services/customer.service";
import { QUERY_KEYS } from "@/constants/query-keys";

export function useImportCustomers() {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: Array<{ row: number; reason: string }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    e.target.value = "";

    if (!file.name.endsWith(".csv")) {
      toast.error("Only CSV files are supported.");
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      const data = await importCustomersCsv(file);
      setResult(data);

      if (data.created > 0) {
        toast.success(
          `Import complete — ${data.created} customer${data.created !== 1 ? "s" : ""} created.${data.skipped > 0 ? ` ${data.skipped} skipped.` : ""}`,
        );
        void queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.customers.list(),
        });
      } else {
        toast.warning(
          `No new customers imported. ${data.skipped} row${data.skipped !== 1 ? "s" : ""} skipped.`,
        );
      }
    } catch {
      toast.error("Import failed. Please check your CSV file and try again.");
    } finally {
      setIsImporting(false);
    }
  };

  return {
    isImporting,
    result,
    fileInputRef,
    openFilePicker,
    handleFileChange,
  };
}

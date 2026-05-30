"use client";

import { useEffect } from "react";
import { GeneralError } from "@/components/shared/error-display";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <GeneralError onReset={reset} />;
}

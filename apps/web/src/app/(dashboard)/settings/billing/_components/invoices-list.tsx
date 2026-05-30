"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Icons } from "@repo/ui/components/icons";
import { useInvoices } from "../hooks/use-billing";
import { formatPrice } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { InvoiceStatus } from "@/types/billing.types";

const statusVariant: Record<
  InvoiceStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PAID: "default",
  UNPAID: "destructive",
  VOID: "secondary",
  DRAFT: "outline",
};

export function InvoicesList() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useInvoices(page);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !data?.invoices.length ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No invoices yet.
                  </TableCell>
                </TableRow>
              ) : (
                data.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="text-sm">
                      {formatDate(invoice.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {invoice.subscription?.plan.name ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {invoice.currency === "NPR"
                        ? formatPrice(invoice.totalAmount)
                        : `${invoice.currency} ${(invoice.totalAmount / 100).toFixed(2)}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {invoice.currency}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[invoice.status]}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {data && data.pagination.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              Page {page} of {data.pagination.totalPages} —{" "}
              {data.pagination.total} invoices
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <Icons.chevronLeft className="size-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <Icons.chevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Icons } from "@repo/ui/components/icons";
import { BookingStatusBadge } from "./booking-status-badge";
import {
  useBookings,
  useUpdateBookingStatus,
  useDeleteBooking,
} from "../hooks/use-bookings";
import type { BookingQuery, BookingStatus } from "@/types/booking.types";
import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { EmptyState } from "@/components/shared/empty-state";
import { GeneralError } from "@/components/shared/error-display";

interface BookingListProps {
  filters: BookingQuery;
  onFilterChange: (filters: BookingQuery) => void;
}

const CANCELLABLE: BookingStatus[] = ["PENDING", "CONFIRMED"];
const CONFIRMABLE: BookingStatus[] = ["PENDING"];

export function BookingList({ filters, onFilterChange }: BookingListProps) {
  const router = useRouter();
  const { data, isPending, isError } = useBookings(filters);
  const { mutate: updateStatus } = useUpdateBookingStatus();
  const { mutate: deleteBooking } = useDeleteBooking();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (isError) return <GeneralError minimal />;

  const handleDelete = (id: string) => {
    setDeletingId(id);
    deleteBooking(id, {
      onSettled: () => setDeletingId(null),
    });
  };

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Service(s)</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    icon="calendar"
                    title="No bookings found"
                    description="Try adjusting your filters or create a new booking."
                  />
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">
                    {booking.customer.name}
                    <p className="text-xs text-muted-foreground">
                      {booking.customer.phone}
                    </p>
                  </TableCell>
                  <TableCell>
                    {booking.services.map((s) => s.name).join(", ")}
                  </TableCell>
                  <TableCell>
                    {booking.staff?.name ?? (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(booking.startTime).toLocaleString()}
                  </TableCell>
                  <TableCell>{formatPrice(booking.totalAmount)}</TableCell>
                  <TableCell>
                    <BookingStatusBadge status={booking.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Icons.dotsVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(ROUTES.bookings.detail(booking.id))
                          }
                        >
                          <Icons.eye className="size-4 mr-2" />
                          View Details
                        </DropdownMenuItem>

                        {CONFIRMABLE.includes(booking.status) && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateStatus({
                                id: booking.id,
                                dto: { status: "CONFIRMED" },
                              })
                            }
                          >
                            <Icons.circleCheck className="size-4 mr-2" />
                            Confirm
                          </DropdownMenuItem>
                        )}

                        {CANCELLABLE.includes(booking.status) && (
                          <DropdownMenuItem
                            onClick={() =>
                              updateStatus({
                                id: booking.id,
                                dto: { status: "CANCELLED" },
                              })
                            }
                          >
                            <Icons.circleX className="size-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={deletingId === booking.id}
                          onClick={() => handleDelete(booking.id)}
                        >
                          <Icons.delete className="size-4 mr-2" />
                          {deletingId === booking.id ? "Deleting..." : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {(filters.page ?? 1 - 1) * (filters.limit ?? 20) + 1}–
            {Math.min(
              (filters.page ?? 1) * (filters.limit ?? 20),
              data.meta.total,
            )}{" "}
            of {data.meta.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!filters.page || filters.page <= 1}
              onClick={() =>
                onFilterChange({ ...filters, page: (filters.page ?? 1) - 1 })
              }
            >
              <Icons.chevronLeft className="size-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {filters.page ?? 1} of {data.meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={(filters.page ?? 1) >= data.meta.totalPages}
              onClick={() =>
                onFilterChange({ ...filters, page: (filters.page ?? 1) + 1 })
              }
            >
              Next
              <Icons.chevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { use } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Icons } from "@repo/ui/components/icons";
import { BookingStatusBadge } from "../_components/booking-status-badge";
import { useBooking, useUpdateBookingStatus } from "../hooks/use-bookings";
import { formatPrice, formatDate } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import type { BookingStatus } from "@/types/booking.types";
import { NotFoundError } from "@/components/shared/error-display";

const STATUS_ACTIONS: {
  label: string;
  status: BookingStatus;
  icon: keyof typeof Icons;
}[] = [
  { label: "Confirm", status: "CONFIRMED", icon: "circleCheck" },
  { label: "Complete", status: "COMPLETED", icon: "check" },
  { label: "Cancel", status: "CANCELLED", icon: "circleX" },
  { label: "No Show", status: "NO_SHOW", icon: "warning" },
];

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: booking, isPending, isError } = useBooking(id);
  const { mutate: updateStatus, isPending: isUpdating } =
    useUpdateBookingStatus();

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[160px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !booking) {
    return <NotFoundError />;
  }

  const allowedStatuses = ALLOWED_TRANSITIONS[booking.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(ROUTES.bookings.list)}
          >
            <Icons.arrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Booking Details
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              ID: {booking.id}
            </p>
          </div>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {/* Status Actions */}
      {allowedStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {STATUS_ACTIONS.filter((a) => allowedStatuses.includes(a.status)).map(
            (action) => {
              const Icon = Icons[action.icon];
              return (
                <Button
                  key={action.status}
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                  onClick={() =>
                    updateStatus({
                      id: booking.id,
                      dto: { status: action.status },
                    })
                  }
                >
                  <Icon className="size-4 mr-2" />
                  {action.label}
                </Button>
              );
            },
          )}
        </div>
      )}

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Customer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-medium">{booking.customer.name}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Icons.phone className="size-3" />
              {booking.customer.phone}
            </p>
            {booking.customer.email && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Icons.mail className="size-3" />
                {booking.customer.email}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Appointment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Appointment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Start: </span>
              {formatDate(booking.startTime)}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">End: </span>
              {formatDate(booking.endTime)}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Location: </span>
              {booking.location?.name ?? "—"}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Staff: </span>
              {booking.staff?.name ?? "Unassigned"}
            </p>
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Services
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {booking.services.map((s) => (
              <div key={s.id} className="flex justify-between text-sm">
                <span>{s.name}</span>
                <span className="text-muted-foreground">
                  {formatPrice(s.price)} · {s.duration}min
                </span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between text-sm font-medium">
              <span>Total</span>
              <span>{formatPrice(booking.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Meta */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Source: </span>
              {booking.source}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Created: </span>
              {formatDate(booking.createdAt)}
            </p>
            {booking.notes && (
              <p className="text-sm">
                <span className="text-muted-foreground">Notes: </span>
                {booking.notes}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

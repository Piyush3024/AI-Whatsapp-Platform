"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@repo/ui/components/skeleton";

export const BookingsCalendar = dynamic(
  () =>
    import("./bookings-calendar").then((mod) => mod.BookingsCalendar),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[600px] w-full rounded-md" />,
  },
);

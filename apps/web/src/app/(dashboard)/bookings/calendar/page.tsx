import type { Metadata } from "next";
import { CalendarLegend } from "./_components/calendar-legend";
import { CalendarViewToggle } from "./_components/calendar-view-toggle";

import dynamic from "next/dynamic";
import { Skeleton } from "@repo/ui/components/skeleton";

const BookingsCalendar = dynamic(
  () =>
    import("./_components/bookings-calendar").then(
      (mod) => mod.BookingsCalendar,
    ),
  {
    ssr: false, 
    loading: () => <Skeleton className="h-[600px] w-full rounded-md" />,
  },
);

export const metadata: Metadata = {
  title: "Bookings Calendar",
  description: "View bookings in calendar format",
};

export default function BookingsCalendarPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            View and manage bookings in calendar format
          </p>
        </div>
        <CalendarViewToggle />
      </div>
      <CalendarLegend />
      <BookingsCalendar />
    </div>
  );
}

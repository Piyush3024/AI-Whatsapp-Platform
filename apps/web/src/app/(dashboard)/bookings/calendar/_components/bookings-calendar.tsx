"use client";

// CSS imports must be at the top of a client component
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/styles/big-calendar.css";

import { useCallback, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import {
  Calendar,
  dateFnsLocalizer,
  Views,
  type View,
} from "react-big-calendar";
import { format } from "date-fns/format";
import { parse } from "date-fns/parse";
import { startOfWeek } from "date-fns/startOfWeek";
import { getDay } from "date-fns/getDay";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek as sowFns,
  endOfWeek,
  startOfDay,
  endOfDay,
} from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  useBookingsCalendar,
  getEventStyle,
} from "../../hooks/use-bookings-calendar";
import { ROUTES } from "@/constants/routes";
import type { CalendarEvent } from "@/types/booking.types";

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

function getDateRange(
  date: Date,
  view: View,
): { dateFrom: string; dateTo: string } {
  switch (view) {
    case Views.MONTH: {
      const start = sowFns(startOfMonth(date), { weekStartsOn: 0 });
      const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 });
      return {
        dateFrom: start.toISOString(),
        dateTo: end.toISOString(),
      };
    }
    case Views.WEEK: {
      const start = sowFns(date, { weekStartsOn: 0 });
      const end = endOfWeek(date, { weekStartsOn: 0 });
      return {
        dateFrom: start.toISOString(),
        dateTo: end.toISOString(),
      };
    }
    case Views.DAY: {
      return {
        dateFrom: startOfDay(date).toISOString(),
        dateTo: endOfDay(date).toISOString(),
      };
    }
    default: {
      const start = sowFns(startOfMonth(date), { weekStartsOn: 0 });
      const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 });
      return {
        dateFrom: start.toISOString(),
        dateTo: end.toISOString(),
      };
    }
  }
}

export function BookingsCalendar() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>(Views.WEEK);

  const dateRange = getDateRange(currentDate, currentView);
  const { events, isPending } = useBookingsCalendar(dateRange);

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      router.push(ROUTES.bookings.detail(event.id));
    },
    [router],
  );

  const handleNavigate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const handleViewChange = useCallback((view: View) => {
    setCurrentView(view);
  }, []);

  if (isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-150 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div style={{ height: 650 }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        titleAccessor="title"
        view={currentView}
        date={currentDate}
        onNavigate={handleNavigate}
        onView={handleViewChange}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={getEventStyle}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        step={30}
        timeslots={2}
        popup
        style={{ height: "100%" }}
      />
    </div>
  );
}

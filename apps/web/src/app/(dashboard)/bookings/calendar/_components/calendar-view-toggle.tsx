"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "@repo/ui/components/icons";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { ROUTES } from "@/constants/routes";

export function CalendarViewToggle() {
  const pathname = usePathname();
  const isCalendar = pathname.startsWith(ROUTES.bookings.calendar);

  return (
    <div className="flex items-center rounded-md border p-0.5 gap-0.5">
      <Link href={ROUTES.bookings.list}>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "cursor-pointer h-7 px-2.5 gap-1.5",
            !isCalendar && "bg-background shadow-sm",
          )}
        >
          <Icons.list className="size-3.5" />
          List
        </Button>
      </Link>
      <Link href={ROUTES.bookings.calendar}>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "cursor-pointer h-7 px-2.5 gap-1.5",
            isCalendar && "bg-background shadow-sm",
          )}
        >
          <Icons.calendar className="size-3.5" />
          Calendar
        </Button>
      </Link>
    </div>
  );
}

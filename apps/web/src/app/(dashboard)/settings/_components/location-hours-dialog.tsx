"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Button } from "@repo/ui/components/button";
import {
  businessHoursSchema,
  type BusinessHoursFormValues,
} from "../schema/settings.schema";
import { useBusinessHours, useSetBusinessHours } from "../hooks/use-tenant";
import { DayOfWeek } from "@/types/staff.types";
import type { Location } from "@/types/tenant.types";

const DAY_ORDER = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

const DEFAULT_HOURS = DAY_ORDER.map((day) => ({
  dayOfWeek: day,
  isOpen: day !== DayOfWeek.SUNDAY,
  openTime: "09:00",
  closeTime: "18:00",
}));

interface LocationHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location;
}

export function LocationHoursDialog({
  open,
  onOpenChange,
  location,
}: LocationHoursDialogProps) {
  const { data: hoursData, isLoading } = useBusinessHours(location.id);
  const setHours = useSetBusinessHours(location.id);

  const form = useForm<BusinessHoursFormValues>({
    resolver: zodResolver(businessHoursSchema),
    defaultValues: { hours: DEFAULT_HOURS },
  });

  const { fields } = useFieldArray({ control: form.control, name: "hours" });

  useEffect(() => {
    if (hoursData && hoursData.length === 7) {
      const sorted = [...hoursData].sort(
        (a, b) =>
          DAY_ORDER.indexOf(a.dayOfWeek as DayOfWeek) -
          DAY_ORDER.indexOf(b.dayOfWeek as DayOfWeek),
      );
      form.reset({ hours: sorted });
    } else if (hoursData?.length === 0) {
      form.reset({ hours: DEFAULT_HOURS });
    }
  }, [hoursData, form]);

  function onSubmit(values: BusinessHoursFormValues) {
    void setHours.mutateAsync(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Business Hours — {location.name}</DialogTitle>
          <DialogDescription>
            Configure the weekly operational hours and availability for this
            location.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : (
              fields.map((field, index) => {
                const day = DAY_ORDER[index]!;
                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-[80px_1fr] items-start gap-3"
                  >
                    <div className="flex items-center gap-2 pt-1">
                      <FormField
                        control={form.control}
                        name={`hours.${index}.isOpen`}
                        render={({ field: f }) => (
                          <Checkbox
                            checked={f.value}
                            onCheckedChange={f.onChange}
                          />
                        )}
                      />
                      <span className="text-sm font-medium">
                        {DAY_LABELS[day]}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name={`hours.${index}.openTime`}
                        render={({ field: f }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input type="time" {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`hours.${index}.closeTime`}
                        render={({ field: f }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input type="time" {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                );
              })
            )}
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={setHours.isPending}>
                {setHours.isPending ? "Saving..." : "Save Hours"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

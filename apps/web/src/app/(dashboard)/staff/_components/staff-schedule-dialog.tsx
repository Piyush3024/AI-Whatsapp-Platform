"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Badge } from "@repo/ui/components/badge";
import { Separator } from "@repo/ui/components/separator";
import {
  staffScheduleSchema,
  scheduleOverrideSchema,
  type StaffScheduleFormValues,
  type ScheduleOverrideFormValues,
} from "../schema/staff.schema";
import {
  useStaffSchedule,
  useSetStaffSchedule,
  useStaffOverrides,
  useCreateStaffOverride,
  useDeleteStaffOverride,
} from "../hooks/use-staff";
import { DayOfWeek } from "@/types/staff.types";
import type { StaffOption } from "@/types/staff.types";

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

const DEFAULT_SCHEDULE = DAY_ORDER.map((day) => ({
  dayOfWeek: day,
  isWorking: day !== DayOfWeek.SUNDAY,
  startTime: "09:00",
  endTime: "18:00",
}));

interface StaffScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffOption;
}

export function StaffScheduleDialog({
  open,
  onOpenChange,
  staff,
}: StaffScheduleDialogProps) {
  const [tab, setTab] = useState<"schedule" | "overrides">("schedule");

  const { data: scheduleData, isLoading: scheduleLoading } = useStaffSchedule(
    staff.id,
  );
  const { data: overridesData, isLoading: overridesLoading } =
    useStaffOverrides(staff.id);
  const setSchedule = useSetStaffSchedule(staff.id);
  const createOverride = useCreateStaffOverride(staff.id);
  const deleteOverride = useDeleteStaffOverride(staff.id);

  // ── Schedule form ──────────────────────────────────────────────────────────
  const scheduleForm = useForm<StaffScheduleFormValues>({
    resolver: zodResolver(staffScheduleSchema),
    defaultValues: { schedule: DEFAULT_SCHEDULE },
  });

  const { fields } = useFieldArray({
    control: scheduleForm.control,
    name: "schedule",
  });

  useEffect(() => {
    if (scheduleData && scheduleData.length === 7) {
      const sorted = [...scheduleData].sort(
        (a, b) =>
          DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek),
      );
      scheduleForm.reset({ schedule: sorted });
    } else if (scheduleData && scheduleData.length === 0) {
      scheduleForm.reset({ schedule: DEFAULT_SCHEDULE });
    }
  }, [scheduleData, scheduleForm]);

  function onScheduleSubmit(values: StaffScheduleFormValues) {
    void setSchedule.mutateAsync(values);
  }

  // ── Override form ──────────────────────────────────────────────────────────
  const overrideForm = useForm<ScheduleOverrideFormValues>({
    resolver: zodResolver(scheduleOverrideSchema),
    defaultValues: {
      date: "",
      isWorking: false,
      startTime: "",
      endTime: "",
      reason: "",
    },
  });

  const isWorking = overrideForm.watch("isWorking");

  function onOverrideSubmit(values: ScheduleOverrideFormValues) {
    const dto = {
      date: values.date,
      isWorking: values.isWorking,
      startTime: values.startTime || undefined,
      endTime: values.endTime || undefined,
      reason: values.reason || undefined,
    };
    void createOverride.mutateAsync(dto).then(() => overrideForm.reset());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Schedule — {staff.name}</DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={tab === "schedule" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab("schedule")}
          >
            Weekly Schedule
          </Button>
          <Button
            variant={tab === "overrides" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab("overrides")}
          >
            Overrides
          </Button>
        </div>

        {/* ── Weekly Schedule Tab ── */}
        {tab === "schedule" && (
          <Form {...scheduleForm}>
            <form
              onSubmit={scheduleForm.handleSubmit(onScheduleSubmit)}
              className="space-y-3"
            >
              {scheduleLoading ? (
                <p className="text-muted-foreground text-sm">Loading...</p>
              ) : (
                fields.map((field, index) => {
                  const day = DAY_ORDER[index];
                  return (
                    <div
                      key={field.id}
                      className="grid grid-cols-[80px_1fr] items-start gap-3"
                    >
                      <div className="flex items-center gap-2 pt-1">
                        <FormField
                          control={scheduleForm.control}
                          name={`schedule.${index}.isWorking`}
                          render={({ field: f }) => (
                            <Checkbox
                              checked={f.value}
                              onCheckedChange={f.onChange}
                            />
                          )}
                        />
                        <span className="text-sm font-medium">
                          {DAY_LABELS[day!]}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <FormField
                          control={scheduleForm.control}
                          name={`schedule.${index}.startTime`}
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
                          control={scheduleForm.control}
                          name={`schedule.${index}.endTime`}
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
                <Button type="submit" disabled={setSchedule.isPending}>
                  {setSchedule.isPending ? "Saving..." : "Save Schedule"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* ── Overrides Tab ── */}
        {tab === "overrides" && (
          <div className="space-y-4">
            {/* Add override form */}
            <Form {...overrideForm}>
              <form
                onSubmit={overrideForm.handleSubmit(onOverrideSubmit)}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={overrideForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={overrideForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason</FormLabel>
                        <FormControl>
                          <Input placeholder="Holiday, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={overrideForm.control}
                  name="isWorking"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer">
                        Working on this day
                      </FormLabel>
                    </FormItem>
                  )}
                />
                {isWorking && (
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={overrideForm.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={overrideForm.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={createOverride.isPending}
                >
                  {createOverride.isPending ? "Adding..." : "Add Override"}
                </Button>
              </form>
            </Form>

            <Separator />

            {/* Existing overrides list */}
            {overridesLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : !overridesData?.length ? (
              <p className="text-muted-foreground text-sm">
                No upcoming overrides.
              </p>
            ) : (
              <div className="space-y-2">
                {overridesData.map((override) => (
                  <div
                    key={override.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {override.date.slice(0, 10)}
                      </span>
                      <Badge
                        variant={override.isWorking ? "default" : "secondary"}
                      >
                        {override.isWorking
                          ? `${override.startTime} – ${override.endTime}`
                          : "Day Off"}
                      </Badge>
                      {override.reason && (
                        <span className="text-muted-foreground">
                          {override.reason}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deleteOverride.isPending}
                      onClick={() => void deleteOverride.mutate(override.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

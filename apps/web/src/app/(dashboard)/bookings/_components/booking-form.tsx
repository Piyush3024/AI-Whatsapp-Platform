"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/components/form";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Icons } from "@repo/ui/components/icons";
import { cn } from "@repo/ui/lib/utils";
import { useCreateBooking } from "../hooks/use-bookings";
import {
  useCustomerOptions,
  useStaffOptions,
  useServiceOptions,
} from "../hooks/use-booking-form-options";
import {
  createBookingSchema,
  type CreateBookingFormValues,
} from "../schema/booking.schema";
import { formatPrice } from "@/lib/utils";

interface BookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingForm({ open, onOpenChange }: BookingFormProps) {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);

  const { mutate: createBooking, isPending } = useCreateBooking();
  const { data: customersData } = useCustomerOptions(customerSearch);
  const { data: staffList } = useStaffOptions();
  const { data: serviceList } = useServiceOptions();

  const form = useForm<CreateBookingFormValues>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      customerId: "",
      serviceIds: [],
      startTime: "",
      staffId: undefined,
      locationId: undefined,
      notes: "",
      source: "MANUAL",
    },
  });

  const selectedServiceIds = form.watch("serviceIds");

  const handleSubmit = (values: CreateBookingFormValues) => {
    // Convert datetime-local string to ISO string
    const startTime = new Date(values.startTime).toISOString();

    createBooking(
      { ...values, startTime },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      },
    );
  };

  const customers = customersData?.items ?? [];
  const staff = staffList ?? [];
  const services = serviceList ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Booking</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new booking.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5"
          >
            {/* Customer — searchable combobox */}
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Popover
                    open={customerPopoverOpen}
                    onOpenChange={setCustomerPopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value
                            ? (customers.find((c) => c.id === field.value)
                                ?.name ?? "Select customer")
                            : "Select customer"}
                          <Icons.chevronDown className="ml-2 size-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search customer..."
                          value={customerSearch}
                          onValueChange={setCustomerSearch}
                        />
                        <CommandList>
                          <CommandEmpty>No customers found.</CommandEmpty>
                          <CommandGroup>
                            {customers.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                value={customer.id}
                                onSelect={() => {
                                  field.onChange(customer.id);
                                  setCustomerPopoverOpen(false);
                                }}
                              >
                                <div>
                                  <p className="text-sm font-medium">
                                    {customer.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {customer.phone}
                                  </p>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Services — multi-select checkboxes */}
            <Controller
              control={form.control}
              name="serviceIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Services</FormLabel>
                  <div className="space-y-2 rounded-md border p-3 max-h-[180px] overflow-y-auto">
                    {services.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No services available
                      </p>
                    ) : (
                      services.map((service) => {
                        const checked = field.value.includes(service.id);
                        return (
                          <div
                            key={service.id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={service.id}
                                checked={checked}
                                onCheckedChange={(val) => {
                                  if (val) {
                                    field.onChange([
                                      ...field.value,
                                      service.id,
                                    ]);
                                  } else {
                                    field.onChange(
                                      field.value.filter(
                                        (id) => id !== service.id,
                                      ),
                                    );
                                  }
                                }}
                              />
                              <label
                                htmlFor={service.id}
                                className="text-sm cursor-pointer"
                              >
                                {service.name}
                              </label>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatPrice(service.price)} · {service.duration}
                              min
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {/* Selected count */}
                  {selectedServiceIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedServiceIds.length} service
                      {selectedServiceIds.length > 1 ? "s" : ""} selected
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start Time */}
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Staff — optional */}
            <FormField
              control={form.control}
              name="staffId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff (Optional)</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(val) =>
                      field.onChange(val === "none" ? undefined : val)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Assign staff" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Source */}
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <Select
                    value={field.value ?? "MANUAL"}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MANUAL">Manual</SelectItem>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                      <SelectItem value="ONLINE">Online</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Any additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Icons.spinner className="size-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Booking"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

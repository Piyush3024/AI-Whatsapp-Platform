"use client";

import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
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
  FormLabel,
  FormMessage,
} from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import { staffSchema, type StaffFormValues } from "../schema/staff.schema";
import { useCreateStaff, useUpdateStaff } from "../hooks/use-staff";
import type { StaffOption } from "@/types/staff.types";

interface StaffFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: StaffOption;
}

export function StaffForm({ open, onOpenChange, staff }: StaffFormProps) {
  const isEdit = !!staff;
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff(staff?.id ?? "");

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema) as Resolver<StaffFormValues>,
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      locationId: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (staff) {
      form.reset({
        name: staff.name,
        phone: staff.phone ?? "",
        email: staff.email ?? "",
        locationId: staff.locationId ?? "",
        isActive: staff.isActive,
      });
    } else {
      form.reset({
        name: "",
        phone: "",
        email: "",
        locationId: "",
        isActive: true,
      });
    }
  }, [staff, form]);

  const isPending = createStaff.isPending || updateStaff.isPending;

  function onSubmit(values: StaffFormValues) {
    const dto = {
      name: values.name,
      phone: values.phone || undefined,
      email: values.email || undefined,
      locationId: values.locationId || undefined,
      isActive: values.isActive,
    };

    const mutation = isEdit
      ? updateStaff.mutateAsync(dto)
      : createStaff.mutateAsync(dto);
    void mutation.then(() => onOpenChange(false));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Staff Member" : "Add Staff Member"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the staff member's details below."
              : "Fill in the details to add a new staff member."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Priya Sharma" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+9779801234567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="priya@salon.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer">Active</FormLabel>
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

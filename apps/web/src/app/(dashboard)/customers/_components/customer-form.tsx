"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { Icons } from "@repo/ui/components/icons";
import { useCreateCustomer, useUpdateCustomer } from "../hooks/use-customers";
import {
  createCustomerSchema,
  updateCustomerSchema,
  type CreateCustomerFormValues,
  type UpdateCustomerFormValues,
} from "../schema/customer.schema";
import type { Customer } from "@/types/customer.types";

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer; // edit mode — customer pass karo
}

export function CustomerForm({
  open,
  onOpenChange,
  customer,
}: CustomerFormProps) {
  const isEdit = !!customer;

  const { mutate: createCustomer, isPending: isCreating } = useCreateCustomer();
  const { mutate: updateCustomer, isPending: isUpdating } = useUpdateCustomer(
    customer?.id ?? "",
  );

  const isPending = isCreating || isUpdating;

  const form = useForm<CreateCustomerFormValues | UpdateCustomerFormValues>({
    resolver: zodResolver(isEdit ? updateCustomerSchema : createCustomerSchema),
    defaultValues: {
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      notes: customer?.notes ?? "",
      optInStatus: customer?.optInStatus ?? "PENDING",
    },
  });

  // Edit mode mein customer change hone pe form reset karo
  useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name ?? "",
        phone: customer.phone ?? "",
        email: customer.email ?? "",
        notes: customer.notes ?? "",
        optInStatus: customer.optInStatus ?? "PENDING",
      });
    } else {
      form.reset({
        name: "",
        phone: "",
        email: "",
        notes: "",
        optInStatus: "PENDING",
      });
    }
  }, [customer, form]);

  const handleSubmit = (
    values: CreateCustomerFormValues | UpdateCustomerFormValues,
  ) => {
    // Empty email → undefined (backend expects undefined, not "")
    const payload = {
      ...values,
      email: values.email === "" ? undefined : values.email,
    };

    if (isEdit) {
      updateCustomer(payload as UpdateCustomerFormValues, {
        onSuccess: () => {
          onOpenChange(false);
        },
      });
    } else {
      createCustomer(payload as CreateCustomerFormValues, {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Customer" : "Create Customer"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the customer's details below."
              : "Fill in the details below to create a new customer."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+9779801234567"
                      {...field}
                      disabled={isEdit}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Opt-in Status */}
            <FormField
              control={form.control}
              name="optInStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Opt-in Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="OPTED_IN">Opted In</SelectItem>
                      <SelectItem value="OPTED_OUT">Opted Out</SelectItem>
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
                    <Textarea
                      placeholder="Any additional notes..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
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
                    {isEdit ? "Saving..." : "Creating..."}
                  </>
                ) : isEdit ? (
                  "Save Changes"
                ) : (
                  "Create Customer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

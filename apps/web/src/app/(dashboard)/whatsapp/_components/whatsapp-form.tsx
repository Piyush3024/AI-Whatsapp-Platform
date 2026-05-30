"use client";

import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
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
import { Textarea } from "@repo/ui/components/textarea";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
  createWhatsAppSchema,
  updateWhatsAppSchema,
  type CreateWhatsAppFormValues,
  type UpdateWhatsAppFormValues,
} from "../schema/whatsapp.schema";
import {
  useCreateWhatsAppNumber,
  useUpdateWhatsAppNumber,
} from "../hooks/use-whatsapp";
import type { WhatsAppNumber } from "@/types/whatsapp.types";

interface WhatsAppFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  number?: WhatsAppNumber;
}

export function WhatsAppForm({
  open,
  onOpenChange,
  number,
}: WhatsAppFormProps) {
  const isEdit = !!number;
  const create = useCreateWhatsAppNumber();
  const update = useUpdateWhatsAppNumber(number?.id ?? "");

  // ── Create form ───────────────────────────────────────────────────────────
  const createForm = useForm<CreateWhatsAppFormValues>({
    resolver: zodResolver(
      createWhatsAppSchema,
    ) as Resolver<CreateWhatsAppFormValues>,
    defaultValues: {
      phoneNumber: "",
      displayName: "",
      phoneNumberId: "",
      greetingMessage: "",
      autoReplyEnabled: true,
      isDefault: false,
    },
  });

  // ── Edit form ─────────────────────────────────────────────────────────────
  const editForm = useForm<UpdateWhatsAppFormValues>({
    resolver: zodResolver(updateWhatsAppSchema),
    defaultValues: {
      displayName: "",
      greetingMessage: "",
      autoReplyEnabled: true,
      isActive: true,
    },
  });

  useEffect(() => {
    if (number) {
      editForm.reset({
        displayName: number.displayName,
        greetingMessage: number.greetingMessage ?? "",
        autoReplyEnabled: number.autoReplyEnabled,
        isActive: number.isActive,
      });
    } else {
      createForm.reset();
    }
  }, [number, createForm, editForm]);

  const isPending = create.isPending || update.isPending;

  function onCreateSubmit(values: CreateWhatsAppFormValues) {
    void create
      .mutateAsync({
        phoneNumber: values.phoneNumber,
        displayName: values.displayName,
        phoneNumberId: values.phoneNumberId || undefined,
        greetingMessage: values.greetingMessage || undefined,
        autoReplyEnabled: values.autoReplyEnabled,
        isDefault: values.isDefault,
      })
      .then(() => onOpenChange(false));
  }

  function onEditSubmit(values: UpdateWhatsAppFormValues) {
    void update
      .mutateAsync({
        displayName: values.displayName,
        greetingMessage: values.greetingMessage || undefined,
        autoReplyEnabled: values.autoReplyEnabled,
        isActive: values.isActive,
      })
      .then(() => onOpenChange(false));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit WhatsApp Number" : "Add WhatsApp Number"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Create Form ── */}
        {!isEdit && (
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(onCreateSubmit)}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+9779801234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Business Main Line" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="phoneNumberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Meta Phone Number ID{" "}
                      <span className="text-muted-foreground text-xs">
                        (optional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="1032984729847" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="greetingMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Greeting Message{" "}
                      <span className="text-muted-foreground text-xs">
                        (optional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Hello! Welcome to our business..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-6">
                <FormField
                  control={createForm.control}
                  name="autoReplyEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer">
                        Auto Reply
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer">
                        Set as Default
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Adding..." : "Add Number"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* ── Edit Form ── */}
        {isEdit && (
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onEditSubmit)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="greetingMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Greeting Message</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-6">
                <FormField
                  control={editForm.control}
                  name="autoReplyEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer">
                        Auto Reply
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
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
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

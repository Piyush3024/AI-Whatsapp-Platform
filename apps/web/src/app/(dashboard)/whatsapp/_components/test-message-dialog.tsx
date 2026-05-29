"use client";

import { useForm } from "react-hook-form";
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
import {
  testMessageSchema,
  type TestMessageFormValues,
} from "../schema/whatsapp.schema";
import { useSendTestMessage } from "../hooks/use-whatsapp";
import type { WhatsAppNumber } from "@/types/whatsapp.types";

interface TestMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  number: WhatsAppNumber;
}

export function TestMessageDialog({
  open,
  onOpenChange,
  number,
}: TestMessageDialogProps) {
  const sendTest = useSendTestMessage(number.id);

  const form = useForm<TestMessageFormValues>({
    resolver: zodResolver(testMessageSchema),
    defaultValues: { recipientPhone: "", message: "" },
  });

  function onSubmit(values: TestMessageFormValues) {
    void sendTest.mutateAsync(values).then(() => {
      form.reset();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Test Message</DialogTitle>
          <p className="text-muted-foreground text-sm">
            From: <span className="font-medium">{number.phoneNumber}</span> (
            {number.displayName})
          </p>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recipientPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+9779807654321" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="This is a test message..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
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
              <Button type="submit" disabled={sendTest.isPending}>
                {sendTest.isPending ? "Sending..." : "Send Test"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

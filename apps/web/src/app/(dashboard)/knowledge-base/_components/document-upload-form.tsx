"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Icons } from "@repo/ui/components/icons";
import { useUploadDocument } from "../hooks/use-knowledge-base";

const ALLOWED_TYPES = ["application/pdf", "text/plain"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const uploadSchema = z.object({
  title: z.string().min(1, "Title required").max(255),
  file: z
    .instanceof(File, { message: "File required" })
    .refine(
      (f) => ALLOWED_TYPES.includes(f.type),
      "Only PDF and TXT files allowed",
    )
    .refine((f) => f.size <= MAX_SIZE_BYTES, "File must be under 10MB"),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

interface DocumentUploadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentUploadForm({
  open,
  onOpenChange,
}: DocumentUploadFormProps) {
  const upload = useUploadDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: "",
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    form.setValue("file", file, { shouldValidate: true });
    // auto-fill title from filename if empty
    if (!form.getValues("title")) {
      form.setValue("title", file.name.replace(/\.[^/.]+$/, ""));
    }
  }

  function onSubmit(values: UploadFormValues) {
    void upload
      .mutateAsync({
        title: values.title,
        fileName: values.file.name,
        file: values.file,
      })
      .then(() => {
        onOpenChange(false);
        form.reset();
        setFileName("");
      });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Salon Services Menu" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="file"
              render={() => (
                <FormItem>
                  <FormLabel>File</FormLabel>
                  <FormControl>
                    <div
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Icons.upload className="mx-auto mb-2 size-8 text-muted-foreground" />
                      {fileName ? (
                        <p className="text-sm font-medium">{fileName}</p>
                      ) : (
                        <>
                          <p className="text-sm font-medium">Click to upload</p>
                          <p className="text-muted-foreground text-xs mt-1">
                            PDF or TXT — max 10MB
                          </p>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.txt"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
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
              <Button type="submit" disabled={upload.isPending}>
                {upload.isPending ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

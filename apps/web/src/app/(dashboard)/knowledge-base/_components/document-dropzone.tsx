"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Progress } from "@repo/ui/components/progress";
import { Button } from "@repo/ui/components/button";
import { Icons } from "@repo/ui/components/icons";
import { cn } from "@repo/ui/lib/utils";

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface DocumentDropzoneProps {
  onUpload: (file: File, onProgress: (p: number) => void) => Promise<void>;
  accept?: Record<string, string[]>;
  maxSizeMb?: number;
  maxFiles?: number;
}

function randomId(): string {
  return typeof crypto !== "undefined"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function DocumentDropzone({
  onUpload,
  accept = { "application/pdf": [".pdf"], "text/plain": [".txt"] },
  maxSizeMb = 10,
  maxFiles = 5,
}: DocumentDropzoneProps) {
  const [items, setItems] = useState<UploadItem[]>([]);

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const startUpload = useCallback(
    async (file: File) => {
      const id = randomId();
      setItems((prev) => [
        ...prev,
        { id, file, progress: 0, status: "pending" },
      ]);

      updateItem(id, { status: "uploading" });

      try {
        await onUpload(file, (progress) => {
          updateItem(id, { progress });
        });
        updateItem(id, { status: "done", progress: 100 });
        // auto-remove after 2s on success
        setTimeout(() => removeItem(id), 2000);
      } catch {
        updateItem(id, { status: "error", error: "Upload failed" });
      }
    },
    [onUpload, updateItem, removeItem],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        void startUpload(file);
      }
    },
    [startUpload],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept,
      maxSize: maxSizeMb * 1024 * 1024,
      maxFiles,
      onDropRejected: (rejections) => {
        for (const { file, errors } of rejections) {
          const msg = errors[0]?.message ?? "File rejected";
          setItems((prev) => [
            ...prev,
            {
              id: randomId(),
              file,
              progress: 0,
              status: "error",
              error: msg,
            },
          ]);
        }
      },
    });

  const uploading = items.filter((i) => i.status === "uploading");
  const failed = items.filter((i) => i.status === "error");
  const done = items.filter((i) => i.status === "done");

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragActive && !isDragReject && "border-primary bg-primary/5",
          isDragReject && "border-destructive bg-destructive/5",
          !isDragActive &&
            "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
        )}
      >
        <input {...getInputProps()} />
        <Icons.upload className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          {isDragActive ? "Drop files here" : "Drag & drop or click to upload"}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          PDF or TXT — max {maxSizeMb}MB per file
        </p>
      </div>

      {/* Uploading */}
      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <Icons.spinner className="size-3 animate-spin" />
                  {item.file.name}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {item.progress}%
                </span>
              </div>
              <Progress value={item.progress} className="h-1.5" />
            </div>
          ))}
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <div className="space-y-1">
          {done.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
            >
              <Icons.circleCheck className="size-4 shrink-0" />
              <span className="truncate">{item.file.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Failed */}
      {failed.length > 0 && (
        <div className="space-y-1">
          {failed.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2 text-destructive">
                <Icons.circleX className="size-4 shrink-0" />
                <span className="truncate">{item.file.name}</span>
                {item.error && (
                  <span className="text-muted-foreground text-xs">
                    — {item.error}
                  </span>
                )}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => removeItem(item.id)}
              >
                <Icons.close className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Progress } from "@repo/ui/components/progress";
import { Button } from "@repo/ui/components/button";
import { Icons } from "@repo/ui/components/icons";
import { cn } from "@repo/ui/lib/utils";
import { toast } from "sonner";

interface DocumentDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  isUploading?: boolean;
  progress?: number;
  accept?: Record<string, string[]>;
  maxSizeMb?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentDropzone({
  file,
  onFileChange,
  isUploading = false,
  progress = 0,
  accept = { "application/pdf": [".pdf"], "text/plain": [".txt"] },
  maxSizeMb = 10,
}: DocumentDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0 && acceptedFiles[0]) {
        onFileChange(acceptedFiles[0]);
      }
    },
    [onFileChange],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept,
      maxSize: maxSizeMb * 1024 * 1024,
      maxFiles: 1,
      disabled: isUploading,
      onDropRejected: (rejections) => {
        const rejection = rejections[0];
        if (rejection) {
          const { file: rejectedFile, errors } = rejection;
          const msg = errors[0]?.message ?? "File rejected";
          toast.error(`Failed to stage "${rejectedFile.name}": ${msg}`);
        }
      },
    });

  return (
    <div className="space-y-4">
      {!file ? (
        /* Drop zone */
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            isDragActive && !isDragReject && "border-primary bg-primary/5",
            isDragReject && "border-destructive bg-destructive/5",
            !isDragActive &&
              "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
            isUploading && "pointer-events-none opacity-50",
          )}
        >
          <input {...getInputProps()} />
          <Icons.upload className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {isDragActive ? "Drop file here" : "Drag & drop or click to select"}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            PDF or TXT — max {maxSizeMb}MB
          </p>
        </div>
      ) : (
        /* Staged File Card */
        <div className="relative overflow-hidden rounded-xl border bg-muted/20 p-4 transition-all duration-200 hover:bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icons.knowledgeBase className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {file.name}
              </p>
              <p className="text-muted-foreground text-xs">
                {formatFileSize(file.size)}
              </p>
            </div>
            {!isUploading ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onFileChange(null)}
              >
                <Icons.close className="size-4" />
              </Button>
            ) : (
              <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Icons.spinner className="size-3.5 animate-spin text-primary" />
                <span className="tabular-nums">{progress}%</span>
              </div>
            )}
          </div>

          {/* Progress bar inside card for premium look */}
          {isUploading && (
            <div className="mt-3">
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { DocumentDropzone } from "./document-dropzone";
import { useUploadDocument } from "../hooks/use-knowledge-base";

interface DocumentUploadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentUploadForm({
  open,
  onOpenChange,
}: DocumentUploadFormProps) {
  const [title, setTitle] = useState("");
  const upload = useUploadDocument();

  async function handleUpload(file: File, onProgress: (p: number) => void) {
    const resolvedTitle = title.trim() || file.name.replace(/\.[^/.]+$/, "");
    await upload.mutateAsync({
      dto: {
        title: resolvedTitle,
        fileName: file.name,
        file,
      },
      onProgress,
    });
    setTitle("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload files (PDF, TXT, DOCX, etc.) to your AI&apos;s knowledge base
            to help train your assistant.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="doc-title">
              Title{" "}
              <span className="text-muted-foreground text-xs">
                (optional — auto-filled from filename)
              </span>
            </Label>
            <Input
              id="doc-title"
              placeholder="Salon Services Menu"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <DocumentDropzone onUpload={handleUpload} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

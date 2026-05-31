"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Button } from "@repo/ui/components/button";
import { Icons } from "@repo/ui/components/icons";
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
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const upload = useUploadDocument();

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      // Clean up form state when modal closes
      setFile(null);
      setTitle("");
      setProgress(0);
      setIsUploading(false);
    }
  };

  const handleFileChange = (newFile: File | null) => {
    setFile(newFile);
    if (newFile) {
      // Auto-fill title with filename without extension if title is empty
      if (!title.trim()) {
        setTitle(newFile.name.replace(/\.[^/.]+$/, ""));
      }
    } else {
      setTitle("");
    }
  };

  async function handleSubmit() {
    if (!file || isUploading) return;

    setIsUploading(true);
    setProgress(0);

    const resolvedTitle = title.trim() || file.name.replace(/\.[^/.]+$/, "");

    try {
      await upload.mutateAsync({
        dto: {
          title: resolvedTitle,
          fileName: file.name,
          file,
        },
        onProgress: (p) => setProgress(p),
      });

      // Close modal and reset state on successful upload
      handleOpenChange(false);
    } catch {
      // Keep modal open on error, mutation hook handles error notification
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload files (PDF, TXT, DOCX, etc.) to your AI&apos;s knowledge base
            to help train your assistant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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
              disabled={isUploading}
            />
          </div>

          <DocumentDropzone
            file={file}
            onFileChange={handleFileChange}
            isUploading={isUploading}
            progress={progress}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <Icons.spinner className="mr-2 size-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

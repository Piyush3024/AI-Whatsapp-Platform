"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Icons } from "@repo/ui/components/icons";
import { DocumentStatusBadge } from "./document-status-badge";
import { DocumentUploadForm } from "./document-upload-form";
import { useDocuments, useDeleteDocument } from "../hooks/use-knowledge-base";
import { formatDate } from "@/lib/utils";
import type {
  DocumentStatus,
  KnowledgeBaseQuery,
} from "@/types/knowledge-base.types";
import { EmptyState } from "@/components/shared/empty-state";
import { GeneralError } from "@/components/shared/error-display";

const STATUS_OPTIONS: { label: string; value: DocumentStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Ready", value: "READY" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Embedding", value: "EMBEDDING" },
  { label: "Failed", value: "FAILED" },
  { label: "Archived", value: "ARCHIVED" },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [filters, setFilters] = useState<KnowledgeBaseQuery>({
    page: 1,
    limit: 10,
  });

  const { data, isLoading, isError } = useDocuments(filters);
  const deleteDocument = useDeleteDocument();

  if (isError) return <GeneralError minimal />;

  function handleStatusChange(val: string) {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      status: val === "ALL" ? undefined : (val as DocumentStatus),
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Select
          value={filters.status ?? "ALL"}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setUploadOpen(true)}>
          <Icons.upload className="mr-2 size-4" />
          Upload Document
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    icon="googleDrive"
                    title="No documents found"
                    description="Try adjusting your filters or upload a new document."
                  />
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.title}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {doc.fileName}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatFileSize(doc.fileSize)}
                  </TableCell>
                  <TableCell>
                    <DocumentStatusBadge status={doc.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(doc.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={deleteDocument.isPending}
                      onClick={() => void deleteDocument.mutate(doc.id)}
                    >
                      <Icons.delete className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            Showing {((filters.page ?? 1) - 1) * (filters.limit ?? 10) + 1}–
            {Math.min(
              (filters.page ?? 1) * (filters.limit ?? 10),
              data.meta.total,
            )}{" "}
            of {data.meta.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!filters.page || filters.page <= 1}
              onClick={() =>
                setFilters((p) => ({ ...p, page: (p.page ?? 1) - 1 }))
              }
            >
              <Icons.chevronLeft className="size-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {filters.page ?? 1} of {data.meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={(filters.page ?? 1) >= data.meta.totalPages}
              onClick={() =>
                setFilters((p) => ({ ...p, page: (p.page ?? 1) + 1 }))
              }
            >
              Next
              <Icons.chevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <DocumentUploadForm open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}

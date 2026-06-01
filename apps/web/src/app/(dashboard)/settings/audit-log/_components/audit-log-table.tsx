"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Badge } from "@repo/ui/components/badge";
import { Icons } from "@repo/ui/components/icons";
import { useAuditLogs } from "../_hooks/use-audit-logs";
import { GeneralError } from "@/components/shared/error-display";
import type { AuditAction } from "@/types/audit-log.types";

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATED: "Created",
  UPDATED: "Updated",
  DELETED: "Deleted",
  LOGIN: "Login",
  LOGOUT: "Logout",
  INVITED: "Invited",
  PLAN_CHANGED: "Plan Changed",
  WHATSAPP_CONNECTED: "WhatsApp Connected",
  DOCUMENT_UPLOADED: "Document Uploaded",
};

const ACTION_VARIANTS: Record<
  AuditAction,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CREATED: "default",
  UPDATED: "secondary",
  DELETED: "destructive",
  LOGIN: "outline",
  LOGOUT: "outline",
  INVITED: "default",
  PLAN_CHANGED: "default",
  WHATSAPP_CONNECTED: "default",
  DOCUMENT_UPLOADED: "secondary",
};

const ALL_ACTIONS: AuditAction[] = [
  "CREATED",
  "UPDATED",
  "DELETED",
  "LOGIN",
  "LOGOUT",
  "INVITED",
  "PLAN_CHANGED",
  "WHATSAPP_CONNECTED",
  "DOCUMENT_UPLOADED",
];

export function AuditLogTable() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<AuditAction | "ALL">("ALL");

  const { data, isPending, isError } = useAuditLogs({
    page,
    limit: 20,
    action: action === "ALL" ? undefined : action,
  });

  if (isError) return <GeneralError minimal />;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select
          value={action}
          onValueChange={(v) => {
            setAction(v as AuditAction | "ALL");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Actions</SelectItem>
            {ALL_ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {ACTION_LABELS[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {data && (
          <p className="text-sm text-muted-foreground ml-auto">
            {data.meta.total.toLocaleString()} total entries
          </p>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !data?.items.length ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground text-sm"
                >
                  No audit log entries found.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    {log.user ? (
                      <div>
                        <p className="text-sm font-medium">{log.user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.user.email}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        System
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ACTION_VARIANTS[log.action]}>
                      {ACTION_LABELS[log.action]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{log.resource}</p>
                    {log.resourceId && (
                      <p className="text-xs text-muted-foreground font-mono truncate max-w-35">
                        {log.resourceId}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.ipAddress ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1 || isPending}
              className="cursor-pointer"
            >
              <Icons.arrowLeft className="size-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page === data.meta.totalPages || isPending}
              className="cursor-pointer"
            >
              Next
              <Icons.arrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

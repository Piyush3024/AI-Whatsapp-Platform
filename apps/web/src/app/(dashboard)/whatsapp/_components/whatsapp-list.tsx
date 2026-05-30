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
import { Badge } from "@repo/ui/components/badge";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Icons } from "@repo/ui/components/icons";
import { WhatsAppVerificationBadge } from "./whatsapp-verification-badge";
import { WhatsAppForm } from "./whatsapp-form";
import { TestMessageDialog } from "./test-message-dialog";
import {
  useWhatsAppNumbers,
  useDeleteWhatsAppNumber,
} from "../hooks/use-whatsapp";
import type { WhatsAppNumber } from "@/types/whatsapp.types";
import { EmptyState } from "@/components/shared/empty-state";
import { GeneralError } from "@/components/shared/error-display";

export function WhatsAppList() {
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WhatsAppNumber | undefined>();
  const [testTarget, setTestTarget] = useState<WhatsAppNumber | undefined>();

  const { data, isLoading, isError } = useWhatsAppNumbers();
  const deleteNumber = useDeleteWhatsAppNumber();

  if (isError) return <GeneralError minimal />;

  function handleEdit(number: WhatsAppNumber) {
    setEditTarget(number);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditTarget(undefined);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">
            {data?.total ?? 0} number{(data?.total ?? 0) !== 1 ? "s" : ""}{" "}
            registered
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Icons.plus className="mr-2 size-4" />
          Add Number
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phone Number</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead>Auto Reply</TableHead>
              <TableHead>Default</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !data?.data.length ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    icon="whatsapp"
                    title="No WhatsApp numbers found"
                    description="Try adjusting your filters or add your first WhatsApp number."
                  />
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((number) => (
                <TableRow key={number.id}>
                  <TableCell className="font-mono text-sm">
                    {number.phoneNumber}
                  </TableCell>
                  <TableCell className="font-medium">
                    {number.displayName}
                  </TableCell>
                  <TableCell>
                    <Badge variant={number.isActive ? "default" : "secondary"}>
                      {number.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <WhatsAppVerificationBadge
                      status={number.verificationStatus}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={number.autoReplyEnabled ? "default" : "outline"}
                    >
                      {number.autoReplyEnabled ? "On" : "Off"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {number.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Send Test Message"
                        onClick={() => setTestTarget(number)}
                      >
                        <Icons.message className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit"
                        onClick={() => handleEdit(number)}
                      >
                        <Icons.edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        disabled={deleteNumber.isPending}
                        onClick={() => void deleteNumber.mutate(number.id)}
                      >
                        <Icons.trash className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <WhatsAppForm
        open={formOpen}
        onOpenChange={handleFormClose}
        number={editTarget}
      />

      {testTarget && (
        <TestMessageDialog
          open={!!testTarget}
          onOpenChange={(open) => {
            if (!open) setTestTarget(undefined);
          }}
          number={testTarget}
        />
      )}
    </div>
  );
}

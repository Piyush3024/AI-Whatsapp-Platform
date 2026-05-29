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
import { Icons } from "@repo/ui/components/icons";
import { StaffStatusBadge } from "./staff-status-badge";
import { StaffForm } from "./staff-form";
import { StaffScheduleDialog } from "./staff-schedule-dialog";
import { useStaffList, useDeleteStaff } from "../hooks/use-staff";
import type { StaffOption } from "@/types/staff.types";

export function StaffList() {
  const { data: staff, isLoading } = useStaffList();
  const deleteStaff = useDeleteStaff();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffOption | undefined>();
  const [scheduleTarget, setScheduleTarget] = useState<
    StaffOption | undefined
  >();

  function handleEdit(member: StaffOption) {
    setEditTarget(member);
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditTarget(undefined);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Staff</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Icons.add className="mr-2 size-4" />
          Add Staff
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !staff?.length ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground py-8 text-center"
                >
                  No staff members yet. Add your first one.
                </TableCell>
              </TableRow>
            ) : (
              staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.phone ?? "—"}</TableCell>
                  <TableCell>{member.email ?? "—"}</TableCell>
                  <TableCell>
                    <StaffStatusBadge isActive={member.isActive} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setScheduleTarget(member)}
                        title="Manage Schedule"
                      >
                        <Icons.calendar className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(member)}
                        title="Edit"
                      >
                        <Icons.edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deleteStaff.isPending}
                        onClick={() => void deleteStaff.mutate(member.id)}
                        title="Delete"
                      >
                        <Icons.delete className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <StaffForm
        open={formOpen}
        onOpenChange={handleFormClose}
        staff={editTarget}
      />

      {scheduleTarget && (
        <StaffScheduleDialog
          open={!!scheduleTarget}
          onOpenChange={(open) => {
            if (!open) setScheduleTarget(undefined);
          }}
          staff={scheduleTarget}
        />
      )}
    </div>
  );
}

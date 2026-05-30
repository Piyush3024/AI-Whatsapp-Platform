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
import type { StaffOption, StaffQuery } from "@/types/staff.types";
import { Input } from "@repo/ui/components/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Checkbox } from "@repo/ui/components/checkbox";
import { EmptyState } from "@/components/shared/empty-state";
import { GeneralError } from "@/components/shared/error-display";

interface StaffListProps {
  filters: StaffQuery;
  onFilterChange: (filters: StaffQuery) => void;
}

// export function StaffList() {
export function StaffList({ filters, onFilterChange }: StaffListProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const debouncedSearch = useDebounce(searchInput, 400);

  const {
    data: staff,
    isLoading,
    isError,
  } = useStaffList({
    ...filters,
    search: debouncedSearch || undefined,
  });
  // const { data: staff, isLoading } = useStaffList();
  const deleteStaff = useDeleteStaff();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffOption | undefined>();
  const [scheduleTarget, setScheduleTarget] = useState<
    StaffOption | undefined
  >();

  if (isError) return <GeneralError minimal />;

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
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              onFilterChange({ ...filters });
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={filters.includeInactive ?? false}
              onCheckedChange={(checked) =>
                onFilterChange({ ...filters, includeInactive: !!checked })
              }
            />
            Show inactive
          </label>
          <Button onClick={() => setFormOpen(true)}>
            <Icons.add className="mr-2 size-4" />
            Add Staff
          </Button>
        </div>
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
                <TableCell colSpan={7}>
                  <EmptyState
                    icon="user"
                    title="No staff found"
                    description="Try adjusting your filters or create a new staff member."
                  />
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

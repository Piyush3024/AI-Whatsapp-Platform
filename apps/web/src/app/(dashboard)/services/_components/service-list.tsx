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
import { Input } from "@repo/ui/components/input";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Icons } from "@repo/ui/components/icons";
import { ServiceStatusBadge } from "./service-status-badge";
import { ServiceForm } from "./service-form";
import { useServiceList, useDeleteService } from "../hooks/use-services";
import { useDebounce } from "@/hooks/use-debounce";
import { formatPrice } from "@/lib/utils";
import type { Service, ServiceQuery } from "@/types/service.types";
import { EmptyState } from "@/components/shared/empty-state";
import { GeneralError } from "@/components/shared/error-display";

interface ServiceListProps {
  filters: ServiceQuery;
  onFilterChange: (filters: ServiceQuery) => void;
}

export function ServiceList({ filters, onFilterChange }: ServiceListProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Service | undefined>();

  const debouncedSearch = useDebounce(searchInput, 400);
  const {
    data: services,
    isLoading,
    isError,
  } = useServiceList({
    ...filters,
    search: debouncedSearch || undefined,
  });
  const deleteService = useDeleteService();

  if (isError) return <GeneralError minimal />;

  function handleEdit(service: Service) {
    setEditTarget(service);
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
            placeholder="Search by name, description..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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
            Add Service
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
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
            ) : !services?.length ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    icon="slack"
                    title="No services found"
                    description="Try adjusting your filters or create your first service."
                  />
                </TableCell>
              </TableRow>
            ) : (
              services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {service.description ?? "—"}
                  </TableCell>
                  <TableCell>{service.duration} min</TableCell>
                  <TableCell>{formatPrice(service.price)}</TableCell>
                  <TableCell>
                    <ServiceStatusBadge isActive={service.isActive} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(service)}
                        title="Edit"
                      >
                        <Icons.edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deleteService.isPending}
                        onClick={() => void deleteService.mutate(service.id)}
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

      <ServiceForm
        open={formOpen}
        onOpenChange={handleFormClose}
        service={editTarget}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Icons } from "@repo/ui/components/icons";
import { CustomerOptInBadge } from "./customer-opt-in-badge";
import { CustomerForm } from "./customer-form";
import { useCustomers, useDeleteCustomer } from "../hooks/use-customers";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDate } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import type { Customer, CustomerQuery } from "@/types/customer.types";
import { GeneralError } from "@/components/shared/error-display";
import { EmptyState } from "@/components/shared/empty-state";

interface CustomerListProps {
  filters: CustomerQuery;
  onFilterChange: (filters: CustomerQuery) => void;
}

export function CustomerList({ filters, onFilterChange }: CustomerListProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchInput, 400);
  const { data, isPending, isError } = useCustomers({
    ...filters,
    search: debouncedSearch || undefined,
  });
  const { mutate: deleteCustomer } = useDeleteCustomer();

  const handleDelete = (id: string) => {
    setDeletingId(id);
    deleteCustomer(id, {
      onSettled: () => setDeletingId(null),
    });
  };

  if (isError) return <GeneralError minimal />;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, email..."
          className="pl-9"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            onFilterChange({ ...filters, page: 1 });
          }}
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>WhatsApp Status</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    icon="users"
                    title="No customers found"
                    description="Try adjusting your filters or create a new customer."
                  />
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    {customer.name ?? "—"}
                  </TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>
                    {customer.email ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <CustomerOptInBadge status={customer.optInStatus} />
                  </TableCell>
                  <TableCell>
                    {customer.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {customer.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-muted px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {customer.tags.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{customer.tags.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(customer.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Icons.dotsVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(ROUTES.customers.detail(customer.id))
                          }
                        >
                          <Icons.eye className="size-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setEditCustomer(customer)}
                        >
                          <Icons.edit className="size-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={deletingId === customer.id}
                          onClick={() => handleDelete(customer.id)}
                        >
                          <Icons.delete className="size-4 mr-2" />
                          {deletingId === customer.id
                            ? "Deleting..."
                            : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
            Showing {((filters.page ?? 1) - 1) * (filters.limit ?? 20) + 1}–
            {Math.min(
              (filters.page ?? 1) * (filters.limit ?? 20),
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
                onFilterChange({ ...filters, page: (filters.page ?? 1) - 1 })
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
                onFilterChange({ ...filters, page: (filters.page ?? 1) + 1 })
              }
            >
              Next
              <Icons.chevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <CustomerForm
        open={!!editCustomer}
        onOpenChange={(open) => !open && setEditCustomer(null)}
        customer={editCustomer ?? undefined}
      />
    </div>
  );
}

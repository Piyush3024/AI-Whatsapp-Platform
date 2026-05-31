"use client";

import { use, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Icons } from "@repo/ui/components/icons";
import { CustomerOptInBadge } from "../_components/customer-opt-in-badge";
import { CustomerForm } from "../_components/customer-form";
import {
  useCustomer,
  useCustomerConversations,
  useDeleteCustomer,
} from "../hooks/use-customers";
import { formatDate } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { NotFoundError } from "@/components/shared/error-display";

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const { data: customer, isPending, isError } = useCustomer(id);
  const { data: conversationsData, isPending: isConvPending } =
    useCustomerConversations(id);
  const { mutate: deleteCustomer, isPending: isDeleting } = useDeleteCustomer();

  const handleDelete = () => {
    deleteCustomer(id, {
      onSuccess: () => router.push(ROUTES.customers.list),
    });
  };

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !customer) {
    return <NotFoundError />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(ROUTES.customers.list)}
          >
            <Icons.arrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {customer.name ?? customer.phone}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              ID: {customer.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Icons.edit className="size-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? (
              <Icons.spinner className="size-4 mr-2 animate-spin" />
            ) : (
              <Icons.delete className="size-4 mr-2" />
            )}
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contact Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Icons.phone className="size-4 text-muted-foreground" />
              {customer.phone}
            </div>
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Icons.mail className="size-4 text-muted-foreground" />
                {customer.email}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Icons.whatsapp className="size-4 text-muted-foreground" />
              <CustomerOptInBadge status={customer.optInStatus} />
            </div>
          </CardContent>
        </Card>

        {/* Meta */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              <span className="text-muted-foreground">Joined: </span>
              {formatDate(customer.createdAt)}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Last updated: </span>
              {formatDate(customer.updatedAt)}
            </p>
            {customer.whatsappId && (
              <p className="text-sm">
                <span className="text-muted-foreground">WhatsApp ID: </span>
                {customer.whatsappId}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tags */}
        {customer.tags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {customer.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-muted px-2 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {customer.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{customer.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Conversations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Conversation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isConvPending ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !conversationsData?.items.length ? (
            <p className="text-sm text-muted-foreground">
              No conversations yet
            </p>
          ) : (
            <div className="space-y-2">
              {conversationsData.items.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {conv.messageCount} messages
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last activity: {formatDate(conv.lastMessageAt)}
                    </p>
                  </div>
                  <span className="text-xs bg-muted px-2 py-1 rounded-full">
                    {conv.state}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <CustomerForm
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
      />
    </div>
  );
}

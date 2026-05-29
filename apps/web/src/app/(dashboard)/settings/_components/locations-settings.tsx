"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Icons } from "@repo/ui/components/icons";
import { LocationHoursDialog } from "./location-hours-dialog";
import {
  locationSchema,
  type LocationFormValues,
} from "../schema/settings.schema";
import {
  useLocations,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
} from "../hooks/use-tenant";
import type { Location } from "@/types/tenant.types";

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: Location;
}

function LocationFormDialog({
  open,
  onOpenChange,
  location,
}: LocationFormDialogProps) {
  const isEdit = !!location;
  const create = useCreateLocation();
  const update = useUpdateLocation(location?.id ?? "");

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema) as Resolver<LocationFormValues>,
    defaultValues: { name: "", address: "", phone: "", isDefault: false },
  });

  useEffect(() => {
    if (location) {
      form.reset({
        name: location.name,
        address: location.address ?? "",
        phone: location.phone ?? "",
        isDefault: location.isDefault,
      });
    } else {
      form.reset({ name: "", address: "", phone: "", isDefault: false });
    }
  }, [location, form]);

  function onSubmit(values: LocationFormValues) {
    const dto = {
      name: values.name,
      address: values.address || undefined,
      phone: values.phone || undefined,
      isDefault: values.isDefault,
    };
    const mutation = isEdit ? update.mutateAsync(dto) : create.mutateAsync(dto);
    void mutation.then(() => onOpenChange(false));
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Location" : "Add Location"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details for this branch location."
              : "Add a new branch location to your business."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Thamel Branch" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Thamel, Kathmandu" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+9779801234567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer">
                    Set as Default
                  </FormLabel>
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : isEdit ? "Update" : "Add Location"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function LocationsSettings() {
  const { data: locations, isLoading } = useLocations();
  const deleteLocation = useDeleteLocation();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Location | undefined>();
  const [hoursTarget, setHoursTarget] = useState<Location | undefined>();

  function handleEdit(loc: Location) {
    setEditTarget(loc);
    setFormOpen(true);
  }
  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditTarget(undefined);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Locations</CardTitle>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Icons.plus className="mr-2 size-4" />
            Add Location
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !locations?.length ? (
          <p className="text-muted-foreground py-4 text-sm">
            No locations yet.
          </p>
        ) : (
          <div className="space-y-2">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="flex items-center justify-between rounded-md border px-4 py-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{loc.name}</span>
                    {loc.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>
                  {loc.address && (
                    <p className="text-muted-foreground text-sm">
                      {loc.address}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Business Hours"
                    onClick={() => setHoursTarget(loc)}
                  >
                    <Icons.calendar className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Edit"
                    onClick={() => handleEdit(loc)}
                  >
                    <Icons.edit className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete"
                    disabled={deleteLocation.isPending || loc.isDefault}
                    onClick={() => void deleteLocation.mutate(loc.id)}
                  >
                    <Icons.trash className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <LocationFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        location={editTarget}
      />
      {hoursTarget && (
        <LocationHoursDialog
          open={!!hoursTarget}
          onOpenChange={(open) => {
            if (!open) setHoursTarget(undefined);
          }}
          location={hoursTarget}
        />
      )}
    </Card>
  );
}

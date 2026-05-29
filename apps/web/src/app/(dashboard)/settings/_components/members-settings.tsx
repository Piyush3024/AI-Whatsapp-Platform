"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Icons } from "@repo/ui/components/icons";
import {
  useMembers,
  useUpdateMemberRole,
  useRemoveMember,
} from "../hooks/use-tenant";
import { useAuthStore } from "@/stores/auth.store";
import type { UserRole } from "@/types/tenant.types";

const ROLE_OPTIONS: { label: string; value: UserRole }[] = [
  { label: "Admin", value: "ADMIN" },
  { label: "Staff", value: "STAFF" },
];

const roleVariant: Record<UserRole, "default" | "secondary" | "outline"> = {
  OWNER: "default",
  ADMIN: "secondary",
  STAFF: "outline",
};

export function MembersSettings() {
  const { data: members, isLoading } = useMembers();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const { user } = useAuthStore();
  const [changingRole, setChangingRole] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !members?.length ? (
          <p className="text-muted-foreground text-sm">No members found.</p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const isCurrentUser = member.userId === user?.id;
              const isOwner = member.role === "OWNER";

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-muted flex size-8 items-center justify-center rounded-full">
                      <Icons.user className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {member.userId}
                        {isCurrentUser && (
                          <span className="text-muted-foreground ml-1 text-xs">
                            (you)
                          </span>
                        )}
                      </p>
                      <Badge
                        variant={roleVariant[member.role]}
                        className="mt-0.5 text-xs"
                      >
                        {member.role}
                      </Badge>
                    </div>
                  </div>

                  {!isOwner && !isCurrentUser && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        disabled={changingRole === member.userId}
                        onValueChange={(val) => {
                          setChangingRole(member.userId);
                          void updateRole
                            .mutateAsync({
                              userId: member.userId,
                              dto: { role: val as UserRole },
                            })
                            .finally(() => setChangingRole(null));
                        }}
                      >
                        <SelectTrigger className="h-8 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Remove member"
                        disabled={removeMember.isPending}
                        onClick={() => void removeMember.mutate(member.userId)}
                      >
                        <Icons.trash className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/components/button";
import type { IconName } from "@repo/ui/components/icons";
import { Icons } from "@repo/ui/components/icons";

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const Icon = Icons[icon];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className,
      )}
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="size-7 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <Button size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

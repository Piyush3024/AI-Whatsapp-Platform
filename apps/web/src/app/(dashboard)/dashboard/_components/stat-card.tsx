import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Icons, type IconName } from "@repo/ui/components/icons";
import { cn } from "@repo/ui/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: IconName;
  description?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  description,
  className,
}: StatCardProps) {
  const Icon = Icons[icon];

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

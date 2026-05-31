import { Skeleton } from "@repo/ui/components/skeleton";

export default function ConversationsLoading() {
  return (
    <div className="h-full -m-4 lg:-m-6">
      <div className="p-4 border-b space-y-3">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="divide-y">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
        ))}
      </div>
    </div>
  );
}

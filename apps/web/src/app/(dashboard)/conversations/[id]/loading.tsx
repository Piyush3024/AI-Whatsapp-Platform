import { Skeleton } from "@repo/ui/components/skeleton";

export default function ConversationDetailLoading() {
  return (
    <div className="h-full -m-4 lg:-m-6 flex">
      <div className="flex flex-col flex-1">
        <div className="border-b px-4 py-3 flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-9 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
            >
              <Skeleton className="h-12 w-48 rounded-2xl" />
            </div>
          ))}
        </div>
        <div className="border-t p-4">
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      </div>
      <div className="w-72 border-l p-4 space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}

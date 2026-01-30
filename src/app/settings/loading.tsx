import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="max-w-2xl">
      <Skeleton className="h-8 w-32 mb-6" />
      <div className="glass-card-strong rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <Skeleton className="h-24 w-24 rounded-full shrink-0" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        </div>
        <div className="space-y-4 mt-8">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl ml-auto" />
        </div>
      </div>
    </div>
  );
}

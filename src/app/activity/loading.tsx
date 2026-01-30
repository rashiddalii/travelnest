import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Skeleton className="h-8 w-40 mb-6" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

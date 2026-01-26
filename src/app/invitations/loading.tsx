import { Skeleton } from "@/components/ui/skeleton";
import { Navbar } from "@/components/layout/navbar";

export default function InvitationsLoading() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-4 w-80" />
            </div>
          </div>
        </div>

        {/* Invitations List Skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
            >
              <div className="flex flex-col md:flex-row gap-6">
                {/* Cover Photo Skeleton */}
                <div className="shrink-0">
                  <Skeleton className="w-full md:w-48 h-48 rounded-lg" />
                </div>

                {/* Content Skeleton */}
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Title */}
                    <Skeleton className="h-7 w-3/4" />
                    
                    {/* Message */}
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>

                    {/* Trip Details */}
                    <div className="flex flex-wrap items-center gap-4">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>

                  {/* Actions Skeleton */}
                  <div className="flex items-center gap-3 mt-4">
                    <Skeleton className="h-11 w-28 rounded-lg" />
                    <Skeleton className="h-11 w-24 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

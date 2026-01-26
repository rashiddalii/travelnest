import { Skeleton, SkeletonProfile } from "@/components/ui/skeleton";
import { Navbar } from "@/components/layout/navbar";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title Skeleton */}
        <Skeleton className="h-8 w-32 mb-6" />

        {/* Tabs Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <Skeleton className="flex-1 h-14" />
            <Skeleton className="flex-1 h-14" />
            <Skeleton className="flex-1 h-14" />
          </div>

          {/* Content Skeleton */}
          <div className="p-6">
            <div className="space-y-8">
              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <Skeleton className="h-24 w-24 rounded-full shrink-0" />
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-10 w-32 rounded-lg" />
                    <Skeleton className="h-10 w-24 rounded-lg" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>
                <div className="flex justify-end">
                  <Skeleton className="h-10 w-32 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { Navbar } from "@/components/layout/navbar";

export default function SectionDetailLoading() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Navigation Skeleton */}
        <div className="mb-6">
          <Skeleton className="h-6 w-40" />
        </div>

        {/* Section Header Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>

        {/* Cards Section Skeleton */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
          
          {/* Cards Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4"
              >
                {/* Type Badge */}
                <Skeleton className="h-6 w-16 rounded" />
                
                {/* Title */}
                <Skeleton className="h-6 w-3/4" />
                
                {/* Content */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
                
                {/* Image placeholder (some cards) */}
                {i % 3 === 0 && (
                  <Skeleton className="h-48 w-full rounded-lg mt-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

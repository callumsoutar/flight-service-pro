import { Skeleton } from "@/components/ui/skeleton";

export default function EquipmentLoading() {
  return (
    <main className="flex flex-col gap-8 p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-80" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
            <Skeleton className="h-6 w-6 mb-2" />
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-9 w-16" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-6">
        <div className="max-w-fit mb-2">
          <Skeleton className="h-11 w-96" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <Skeleton className="h-7 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>

        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}


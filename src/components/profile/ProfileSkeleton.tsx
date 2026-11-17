function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-raised ${className}`} />;
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading profile">
      <div className="card flex items-center gap-5 p-5 sm:p-6">
        <Bar className="size-20 rounded-2xl sm:size-24" />
        <div className="space-y-2">
          <Bar className="h-3 w-24" />
          <Bar className="h-8 w-56 max-w-full" />
        </div>
      </div>
      <div className="grid gap-x-6 gap-y-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Bar className="h-32" />
          <Bar className="h-32" />
          <Bar className="h-64 max-lg:hidden" />
        </div>
        <div className="space-y-4">
          <Bar className="h-11" />
          <Bar className="h-44" />
          {Array.from({ length: 5 }, (_, i) => (
            <Bar key={i} className="h-28" />
          ))}
        </div>
      </div>
    </div>
  );
}

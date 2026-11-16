function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-raised ${className}`} />;
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading profile">
      <div className="flex items-center gap-5">
        <Bar className="size-20 rounded-2xl sm:size-24" />
        <div className="space-y-2">
          <Bar className="h-3 w-24" />
          <Bar className="h-8 w-56" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Bar className="h-32" />
          <Bar className="h-32" />
          <Bar className="h-64" />
        </div>
        <div className="space-y-4">
          <Bar className="h-11" />
          <Bar className="h-44" />
          {Array.from({ length: 5 }, (_, i) => (
            <Bar key={i} className="h-24" />
          ))}
        </div>
      </div>
    </div>
  );
}

export const CancelledState = () => {
  return (
    <div className="bg-white rounded-lg border">
      <div className="px-4 py-5 grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)] xl:items-start">
        <div className="rounded-lg border bg-muted/10 px-4 py-3 xl:sticky xl:top-24 xl:self-start xl:h-fit">
          <h3 className="text-base font-medium">Cancelled</h3>
        </div>
        <div className="rounded-lg border bg-muted/10 px-4 py-5">
          <p className="text-sm text-muted-foreground">
            This conversation was cancelled.
          </p>
        </div>
      </div>
    </div>
  );
};

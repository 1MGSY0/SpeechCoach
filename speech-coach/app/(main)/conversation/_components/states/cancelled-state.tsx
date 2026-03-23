export const CancelledState = () => {
  return (
    <div className="bg-white rounded-lg border">
      <div className="px-4 py-5 flex flex-col gap-y-2">
        <h3 className="text-base font-medium">Cancelled</h3>
        <p className="text-sm text-muted-foreground">
          This conversation was cancelled.
        </p>
      </div>
    </div>
  );
};

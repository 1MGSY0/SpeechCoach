export const ProcessingState = () => {
  return (
    <div className="bg-white rounded-lg border">
      <div className="px-4 py-5 flex flex-col gap-y-2">
        <h3 className="text-base font-medium">Practice Completed</h3>
        <p className="text-sm text-muted-foreground">
          Conversation completed, processing the recording and transcript.
        </p>
      </div>
    </div>
  );
};

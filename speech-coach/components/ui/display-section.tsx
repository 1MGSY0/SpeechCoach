export const Section = ({
  title,
  content,
}: {
  title: string;
  content?: string;
}) => {
  if (!content) return null;

  return (
    <div className="border rounded-lg p-3 bg-muted/10">
      <p className="text-lg font-semibold text-muted-foreground mb-1">
        {title}
      </p>
      <p className="text-sm text-neutral-800 whitespace-pre-wrap">
        {content}
      </p>
    </div>
  );
};
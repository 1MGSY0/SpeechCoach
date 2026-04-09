export const Section = ({
  title,
  content,
}: {
  title: string;
  content?: string;
}) => {
  if (!content) return null;

  return (
    <div className="rounded-xl border border-white/70 bg-white/75 p-3 shadow-sm">
      <p className="mb-1 text-base font-semibold tracking-tight text-primary">
        {title}
      </p>
      <p className="text-sm text-neutral-800 whitespace-pre-wrap">
        {content}
      </p>
    </div>
  );
};

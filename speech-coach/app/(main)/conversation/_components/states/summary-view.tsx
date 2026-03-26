"use client";

type SummaryViewProps = {
  summary?: string | null;
};

type ParsedSection = {
  title: string;
  content: string[];
};

function parseSummary(summary: string): ParsedSection[] {
  const lines = summary
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^###\s+(.*)$/);

    if (headingMatch) {
      currentSection = {
        title: headingMatch[1],
        content: [],
      };
      sections.push(currentSection);
      continue;
    }

    if (!currentSection) {
      currentSection = {
        title: "Summary",
        content: [],
      };
      sections.push(currentSection);
    }

    currentSection.content.push(line);
  }

  return sections;
}

function renderLine(line: string, index: number) {
  const bulletMatch = line.match(/^-\s+(.*)$/);

  if (bulletMatch) {
    return (
      <li key={index} className="leading-6 text-sm text-muted-foreground">
        {bulletMatch[1]}
      </li>
    );
  }

  return (
    <p key={index} className="leading-6 text-sm text-muted-foreground whitespace-pre-wrap">
      {line}
    </p>
  );
}

export function SummaryView({ summary }: SummaryViewProps) {
  if (!summary?.trim()) return null;

  const sections = parseSummary(summary);

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold tracking-tight">Conversation Summary</h3>
        <p className="text-xs text-muted-foreground">
          Auto-generated overview of the completed interaction
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section, sectionIndex) => {
          const bulletLines = section.content.filter((line) => /^-\s+/.test(line));
          const normalLines = section.content.filter((line) => !/^-\s+/.test(line));

          return (
            <div key={`${section.title}-${sectionIndex}`} className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">
                {section.title}
              </h4>

              {normalLines.length > 0 && (
                <div className="space-y-2">
                  {normalLines.map((line, index) => renderLine(line, index))}
                </div>
              )}

              {bulletLines.length > 0 && (
                <ul className="list-disc space-y-1 pl-5">
                  {bulletLines.map((line, index) => renderLine(line, index))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
"use client";

import { parseSemanticMemory } from "@/lib/semantic-memory";
import { Button } from "@/components/ui/button";
import { timestampToSeconds } from "./transcript-utils";

type SummaryViewProps = {
  summary?: string | null;
  onTimestampClick?: (seconds: number, timestamp: string) => void;
};

type ParsedSection = {
  title: string;
  content: string[];
};

function parseSummary(summary: string): ParsedSection[] {
  const memory = parseSemanticMemory(summary);

  if (memory) {
    return [
      {
        title: "Overview",
        content: memory.rollingSummary ? [memory.rollingSummary] : [],
      },
      {
        title: "Notes",
        content: memory.progressionReason.map(
          (item) => `- **[${item.timestamp}]** ${item.progressionLog}`
        ),
      },
    ].filter((section) => section.content.length > 0);
  }

  return [
    {
      title: "Overview",
      content: [summary],
    },
  ];
}

const TIMESTAMP_PART_REGEX = /^(?:\d{1,2}:)?\d{1,2}:\d{2}$/;
const TIMESTAMP_MARKER_REGEX = /\*\*\[([^\]]+)\]\*\*/g;
const TIMESTAMP_MARKER_AT_START_REGEX = /^\*\*\[([^\]]+)\]\*\*/;
const BULLET_OR_TIMESTAMP_LINE_REGEX = /^(?:-\s+(.*)|(\*\*\[[^\]]+\]\*\*.*))$/;
const TIMESTAMP_END_PART_REGEX = /^end$/i;

function getTimestampRangeParts(value: string) {
  const normalized = value.replace(/[\u2013\u2014]/g, "-");
  const parts = normalized.split("-").map((part) => part.trim());
  const start = parts[0];
  const end = parts[1];

  if (!start || !TIMESTAMP_PART_REGEX.test(start)) {
    return null;
  }

  if (end && !TIMESTAMP_PART_REGEX.test(end) && !TIMESTAMP_END_PART_REGEX.test(end)) {
    return null;
  }

  return {
    start,
    end,
    label: end ? `${start} - ${end}` : start,
  };
}

function renderTextWithTimestamps(
  line: string,
  keyPrefix: string,
  onTimestampClick?: (seconds: number, timestamp: string) => void
) {
  const matches = Array.from(line.matchAll(TIMESTAMP_MARKER_REGEX));

  if (matches.length === 0) {
    return line;
  }

  const content: React.ReactNode[] = [];
  let lastIndex = 0;

  matches.forEach((match, matchIndex) => {
    const fullMatch = match[0];
    const timestampValue = match[1];
    const startIndex = match.index ?? 0;
    const timestampRange = getTimestampRangeParts(timestampValue);

    if (startIndex > lastIndex) {
      content.push(line.slice(lastIndex, startIndex));
    }

    if (!timestampRange) {
      content.push(fullMatch);
    } else {
      content.push(
        <Button
          key={`${keyPrefix}-timestamp-${matchIndex}-${startIndex}`}
          type="button"
          variant="ghost"
          size="xs"
          className="mx-1 inline-flex h-auto rounded-full bg-primary/20 px-2 py-0.5 align-baseline text-[11px] font-semibold text-primary hover:bg-primary/30"
          onClick={() =>
            onTimestampClick?.(
              timestampToSeconds(timestampRange.start),
              timestampRange.label
            )
          }
        >
          {timestampRange.label}
        </Button>
      );
    }

    lastIndex = startIndex + fullMatch.length;
  });

  if (lastIndex < line.length) {
    content.push(line.slice(lastIndex));
  }

  return content;
}

function renderLine(
  line: string,
  index: number,
  onTimestampClick?: (seconds: number, timestamp: string) => void
) {
  const bulletMatch = line.match(BULLET_OR_TIMESTAMP_LINE_REGEX);
  const bulletContent = bulletMatch?.[1] ?? bulletMatch?.[2] ?? "";
  const startsWithTimestampMarker = TIMESTAMP_MARKER_AT_START_REGEX.test(bulletContent);

  if (bulletMatch) {
    return (
      <li
        key={index}
        className={`leading-6 text-sm text-muted-foreground ${
          startsWithTimestampMarker ? "list-none ml-[-1.25rem]" : ""
        }`}
      >
        {renderTextWithTimestamps(bulletContent, `bullet-${index}`, onTimestampClick)}
      </li>
    );
  }

  return (
    <p key={index} className="leading-6 text-sm text-muted-foreground whitespace-pre-wrap">
      {renderTextWithTimestamps(line, `line-${index}`, onTimestampClick)}
    </p>
  );
}

export function SummaryView({ summary, onTimestampClick }: SummaryViewProps) {
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
          const bulletLines = section.content.filter((line) =>
            BULLET_OR_TIMESTAMP_LINE_REGEX.test(line)
          );
          const normalLines = section.content.filter(
            (line) => !BULLET_OR_TIMESTAMP_LINE_REGEX.test(line)
          );

          return (
            <div key={`${section.title}-${sectionIndex}`} className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">
                {section.title}
              </h4>

              {normalLines.length > 0 && (
                <div className="space-y-2">
                  {normalLines.map((line, index) =>
                    renderLine(line, index, onTimestampClick)
                  )}
                </div>
              )}

              {bulletLines.length > 0 && (
                <ul className="list-disc space-y-1 pl-5">
                  {bulletLines.map((line, index) =>
                    renderLine(line, index, onTimestampClick)
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

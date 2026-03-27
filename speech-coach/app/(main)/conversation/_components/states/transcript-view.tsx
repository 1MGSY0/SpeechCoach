"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TranscriptTurn } from "./transcript-utils";
import { parseTranscriptJson, secondsToTimestamp, timestampToSeconds } from "./transcript-utils";

interface Props {
  transcript: string;
  onUserLineClick?: (turn: TranscriptTurn, index: number) => void;
}

export const TranscriptView = ({ transcript, onUserLineClick }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [sliderValue, setSliderValue] = useState(0);

  const parsedTranscript = parseTranscriptJson(transcript);

  const transcriptWithSeconds = useMemo(
    () =>
      parsedTranscript.map((turn, index) => ({
        ...turn,
        index,
        seconds: timestampToSeconds(turn.timestamp),
      })),
    [parsedTranscript]
  );

  const maxSeconds = useMemo(() => {
    if (transcriptWithSeconds.length === 0) return 0;
    return transcriptWithSeconds[transcriptWithSeconds.length - 1]?.seconds ?? 0;
  }, [transcriptWithSeconds]);

  useEffect(() => {
    setSliderValue(0);
  }, [transcript]);

  const findClosestTurnIndex = (targetSeconds: number) => {
    if (transcriptWithSeconds.length === 0) return -1;

    let closestIndex = 0;
    let closestDistance = Math.abs(transcriptWithSeconds[0].seconds - targetSeconds);

    for (let i = 1; i < transcriptWithSeconds.length; i++) {
      const distance = Math.abs(transcriptWithSeconds[i].seconds - targetSeconds);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }

    return closestIndex;
  };

  const scrollToTimestamp = (targetSeconds: number) => {
    const turnIndex = findClosestTurnIndex(targetSeconds);
    if (turnIndex < 0) return;

    const row = rowRefs.current[turnIndex];
    if (!row) return;

    row.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    scrollToTimestamp(value);
  };

  return (
    <div className="flex h-full flex-col gap-y-4">
      <div className="rounded-xl border bg-background p-4">
        <div className="mb-2 flex items-center justify-between gap-x-4">
          <h3 className="text-sm font-semibold">Transcript timeline</h3>
          <span className="text-xs text-muted-foreground">
            {secondsToTimestamp(sliderValue)}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(maxSeconds, 1)}
          step={1}
          value={sliderValue}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          className="w-full cursor-pointer"
        />

        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>0:00:00</span>
          <span>{secondsToTimestamp(maxSeconds)}</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="max-h-[70vh] overflow-y-auto rounded-xl border bg-background p-4"
      >
        <div className="flex flex-col gap-y-3">
          {transcriptWithSeconds.map((turn, index) => {
            const isUser = turn.speaker === "User";

            const row = (
              <div
                ref={(node) => {
                  rowRefs.current[index] = node;
                }}
                className={`grid grid-cols-[72px_1fr] gap-x-4 rounded-lg border px-4 py-3 ${
                  isUser ? "bg-muted/10 hover:bg-muted/20 transition" : ""
                }`}
              >
                <div className="pt-0.5 text-xs font-medium text-muted-foreground">
                  {turn.timestamp}
                </div>

                <div className="min-w-0">
                  <div className="mb-1">
                    <span
                      className={`font-semibold ${
                        isUser ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {turn.speaker}
                    </span>
                  </div>

                  <div className="whitespace-pre-wrap break-words text-sm leading-6">
                    {turn.text}
                  </div>
                </div>
              </div>
            );

            if (isUser) {
              return (
                <button
                  key={turn.id ?? `${turn.timestamp}-${index}`}
                  type="button"
                  onClick={() => onUserLineClick?.(turn, index)}
                  className="w-full text-left"
                >
                  {row}
                </button>
              );
            }

            return (
              <div key={turn.id ?? `${turn.timestamp}-${index}`}>
                {row}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


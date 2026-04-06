"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TranscriptTurn } from "./transcript-utils";
import { parseTranscriptJson, secondsToTimestamp, timestampToSeconds } from "./transcript-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

type TurnFeedback = {
  _id: string;
  score?: number;
  maxScore?: number;
  feedback?: string;
  evidence?: string[];
  turnRefs?: Array<{ text: string; timestamp: string }>;
  category?: {
    _id: string;
    name: string;
  } | null;
  criterion?: {
    _id: string;
    name: string;
  } | null;
};

interface Props {
  transcript: string;
  gradingResults?: TurnFeedback[];
  transcriptSeekSeconds?: number | null;
  onUserLineClick?: (turn: TranscriptTurn, index: number) => void;
}

export const TranscriptView = ({
  transcript,
  gradingResults = [],
  transcriptSeekSeconds,
  onUserLineClick,
}: Props) => {
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

  const feedbackMap = useMemo(() => {
    const map = new Map<number, TurnFeedback[]>();

    for (const result of gradingResults) {
      for (const ref of result.turnRefs ?? []) {
        const targetSeconds = timestampToSeconds(ref.timestamp);
        const zeroIndex = transcriptWithSeconds.findIndex(
          (turn) => turn.seconds === targetSeconds
        );

        if (zeroIndex < 0) continue;

        const existing = map.get(zeroIndex) ?? [];
        existing.push(result);
        map.set(zeroIndex, existing);
      }
    }

    return map;
  }, [gradingResults, transcriptWithSeconds]);

  const maxSeconds = useMemo(() => {
    if (transcriptWithSeconds.length === 0) return 0;
    return transcriptWithSeconds[transcriptWithSeconds.length - 1]?.seconds ?? 0;
  }, [transcriptWithSeconds]);

  useEffect(() => {
    setSliderValue(0);
  }, [transcript]);

  useEffect(() => {
    if (transcriptSeekSeconds == null) return;

    const clampedSeconds = Math.max(0, Math.min(transcriptSeekSeconds, maxSeconds));
    setSliderValue(clampedSeconds);
    scrollToTimestamp(clampedSeconds);
  }, [maxSeconds, transcriptSeekSeconds]);

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
    <TooltipProvider>
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
              const turnFeedback = feedbackMap.get(index) ?? [];

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
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`font-semibold ${
                          isUser ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {turn.speaker}
                      </span>

                      {turnFeedback.length > 0 ? (
                        <Badge variant="secondary" className={undefined}>
                          {turnFeedback.length} feedback item{turnFeedback.length > 1 ? "s" : ""}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="whitespace-pre-wrap break-words text-sm leading-6">
                      {turn.text}
                    </div>
                  </div>
                </div>
              );

              if (isUser && turnFeedback.length > 0) {
                return (
                  <Tooltip key={turn.id ?? `${turn.timestamp}-${index}`}>
                    
                        <TooltipTrigger className="w-full text-left">
                        {row}
                        </TooltipTrigger>
                    
                    <TooltipContent side="bottom" align="end" className="space-y-3 max-w-md rounded-md border bg-primary p-4">
                      {turnFeedback.map((item, feedbackIndex) => {
                        const matchingExample = item.turnRefs?.find(
                          (ref) => ref.timestamp === turn.timestamp
                        );

                        return (
                          <div
                            key={item._id ?? `${turn.timestamp}-${index}-${feedbackIndex}`}
                            className="space-y-1"
                          >
                            {item.criterion?.name ? (
                              <p className="text-xs font-semibold text-primary-foreground/80">
                                {item.criterion.name}
                              </p>
                            ) : null}
                            <p className="text-sm">
                              {matchingExample?.text || item.feedback || "No feedback."}
                            </p>
                          </div>
                        );
                      })}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={turn.id ?? `${turn.timestamp}-${index}`}>{row}</div>;
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessagesSquareIcon, XIcon } from "lucide-react";

type TranscriptTurn = {
  id?: string;
  speaker: string;
  text: string;
  timestamp: string;
  isLive?: boolean;
};

interface Props {
  transcript?: string | null;
  personaName?: string | null;
  livePartial?: TranscriptTurn | null;
}

function parseTranscriptJson(value?: string | null): TranscriptTurn[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is TranscriptTurn =>
        item &&
        typeof item === "object" &&
        typeof item.speaker === "string" &&
        typeof item.text === "string" &&
        typeof item.timestamp === "string"
    );
  } catch {
    return [];
  }
}

function getSpeakerLabel(speaker: string, personaName?: string | null) {
  if (speaker === "Assistant" || speaker === "Persona") {
    return personaName?.trim() || "Coach";
  }

  return speaker;
}

export const CallTranscript = ({ transcript, personaName, livePartial }: Props) => {
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const turns = useMemo(() => {
    const parsed = parseTranscriptJson(transcript);
    const latest = parsed.at(-1);
    const shouldShowLivePartial =
      livePartial &&
      (!latest ||
        latest.speaker !== livePartial.speaker ||
        latest.text !== livePartial.text);

    return shouldShowLivePartial ? [...parsed, livePartial] : parsed;
  }, [livePartial, transcript]);
  const turnCount = turns.length;

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    element.scrollTop = element.scrollHeight;
  }, [turnCount]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsPanelOpen((current) => !current)}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/65 px-3 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-md transition hover:bg-black/80 lg:hidden"
      >
        {isPanelOpen ? <XIcon className="size-4" /> : <MessagesSquareIcon className="size-4" />}
        <span>{isPanelOpen ? "Hide transcript" : "Show transcript"}</span>
      </button>

      <aside
        className={[
          "min-h-0 flex-1 rounded-3xl border border-white/10 bg-black/70 text-white shadow-2xl backdrop-blur-md transition lg:flex-[1]",
          isPanelOpen ? "block" : "hidden lg:block",
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Live transcript</p>
              <p className="text-xs text-white/60">
                Chat-style history that keeps the full call context in view
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPanelOpen(false)}
              className="rounded-full p-1 text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Close transcript"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {turns.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm leading-6 text-white/55">
                Transcript messages will appear here as the conversation progresses.
              </div>
            ) : null}

            {turns.map((turn, index) => {
              const isAssistant =
                turn.speaker === "Assistant" || turn.speaker === "Persona";

              return (
                <div
                  key={turn.id ?? `${turn.timestamp}-${index}`}
                  className={[
                    "rounded-2xl px-3 py-2",
                    turn.isLive
                      ? "border border-white/15 bg-white/5"
                      : isAssistant
                        ? "bg-white/10"
                        : "bg-[#1b2333]",
                  ].join(" ")}
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-white/80">
                      {getSpeakerLabel(turn.speaker, personaName)}
                    </span>
                    <span className="text-[11px] text-white/50">{turn.timestamp}</span>
                  </div>
                  <p className="text-sm leading-6 text-white/95">{turn.text}</p>
                  {turn.isLive ? (
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
                      Live
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
};

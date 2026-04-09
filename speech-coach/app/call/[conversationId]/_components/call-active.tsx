"use client";

import Link from "next/link";
import Image from "next/image";
import {
  CallControls,
  SpeakerLayout,
} from "@stream-io/video-react-sdk";
import { CallTranscript } from "./call-transcript";

interface Props {
  onLeave: () => void;
  conversationName: string;
  userGoal?: string | null;
  transcriptText?: string | null;
  personaName?: string | null;
  livePartialTranscript?: {
    speaker: string;
    text: string;
    timestamp: string;
    isLive?: boolean;
  } | null;
};

export const CallActive = ({
  onLeave,
  conversationName,
  userGoal,
  transcriptText,
  personaName,
  livePartialTranscript,
}: Props) => {
  return (
    <div className="relative flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4 text-white">
      <div className="flex items-center gap-4 rounded-full bg-[#101213] p-4">
        <Link href="/" className="flex items-center justify-center p-1 bg-white/10 rounded-full w-fit">
          <Image src="/logo.svg" width={22} height={22} alt="Logo" />
        </Link>
        <div className="min-w-0">
          <h4 className="truncate text-base">{conversationName}</h4>
          {userGoal ? (
            <p className="truncate text-xs text-white/60">Goal: {userGoal}</p>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0 overflow-hidden flex-col gap-4 lg:flex-row">
          <div className="speechcoach-call-speaker min-h-0 min-w-0 flex-[2] overflow-hidden rounded-3xl bg-black/30">
            <div className="h-full min-h-0 overflow-hidden rounded-3xl">
              <SpeakerLayout />
            </div>
          </div>
          <CallTranscript
            transcript={transcriptText}
            personaName={personaName}
            livePartial={livePartialTranscript}
          />
        </div>
      </div>
      <div className="shrink-0 self-center overflow-hidden rounded-full bg-[#101213] px-4 py-2">
        <CallControls onLeave={onLeave} />
      </div>
    </div>
  );
};

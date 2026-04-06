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
  transcriptText,
  personaName,
  livePartialTranscript,
}: Props) => {
  return (
    <div className="relative flex h-full flex-col justify-between p-4 text-white">
      <div className="bg-[#101213] rounded-full p-4 flex items-center gap-4">
        <Link href="/" className="flex items-center justify-center p-1 bg-white/10 rounded-full w-fit">
          <Image src="/logo.svg" width={22} height={22} alt="Logo" />
        </Link>
        <h4 className="text-base">
          {conversationName}
        </h4>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 py-4 lg:flex-row">
        <div className="aspect-video min-h-[220px] flex-[2] overflow-hidden rounded-3xl bg-black/30 lg:aspect-auto lg:min-h-0">
          <SpeakerLayout />
        </div>
        <CallTranscript
          transcript={transcriptText}
          personaName={personaName}
          livePartial={livePartialTranscript}
        />
      </div>
      <div className="bg-[#101213] rounded-full px-4">
        <CallControls onLeave={onLeave} />
      </div>
    </div>
  );
};

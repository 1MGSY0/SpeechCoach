"use client";

import { LoaderIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Call,
  CallingState,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-sdk";
import { toast } from "sonner";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import { CallUI } from "./call-ui";
import { api } from "@/convex/_generated/api";

interface Props {
  conversationId: string;
  conversationName: string;
  userId: Id<"User">;
  userName: string;
  userImage: string;
  userGoal?: string | null;
  transcriptText?: string | null;
  personaName?: string | null;
};

export const CallConnect = ({
  conversationId,
  conversationName,
  userId,
  userName,
  userImage,
  userGoal,
  transcriptText,
  personaName,
}: Props) => {
  const generateToken = useAction(api.conversations_stream.generateToken);
  const ensureCallReady = useAction(api.conversations_stream.ensureCallReady);
  const [clientError, setClientError] = useState<string | null>(null);

  const [client, setClient] = useState<StreamVideoClient>();
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;

    if (!apiKey) {
      setClientError("Stream Video is not configured. Set NEXT_PUBLIC_STREAM_VIDEO_API_KEY.");
      return;
    }

    setClientError(null);

    const _client = new StreamVideoClient({
      apiKey,
      user: {
        id: userId,
        name: userName,
        image: userImage,
      },
      tokenProvider: () =>
        generateToken({
          userId,
          name: userName,
          image: userImage,
        }),
    });

    setClient(_client);

    return () => {
      _client.disconnectUser();
      setClient(undefined);
    };
  }, [userId, userName, userImage, generateToken]);

  const [call, setCall] = useState<Call>();
  useEffect(() => {
      if (!client) return;

      const _call = client.call("default", conversationId);
      _call.camera.disable();
      _call.microphone.disable();
      setCall(_call);

      return () => {
        setCall(undefined);
        if (_call.state.callingState !== CallingState.LEFT) {
          void _call.leave().catch(() => {});
        }
      };
  }, [client, conversationId]);

  if (clientError) {
    return (
      <div className="flex h-screen items-center justify-center bg-radial from-sidebar-accent to-sidebar px-4">
        <div className="rounded-xl bg-background p-6 text-center shadow-sm">
          <h2 className="text-lg font-medium">Call setup failed</h2>
          <p className="mt-2 text-sm text-muted-foreground">{clientError}</p>
        </div>
      </div>
    );
  }

  if (!client || !call) {
    return (
      <div className="flex h-screen items-center justify-center bg-radial from-sidebar-accent to-sidebar">
        <LoaderIcon className="size-6 animate-spin text-white" />
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <CallUI
          conversationName={conversationName}
          conversationId={conversationId}
          userId={userId}
          onEnsureCallReady={() =>
            ensureCallReady({
              userId,
              conversationId: conversationId as Id<"Conversations">,
            })
          }
          onJoinError={(message) => {
            setClientError(message);
            toast.error(message);
          }}
          userGoal={userGoal}
          transcriptText={transcriptText}
          personaName={personaName}
        />
      </StreamCall>
    </StreamVideo>
  );
};

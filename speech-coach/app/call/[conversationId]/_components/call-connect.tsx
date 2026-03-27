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

import "@stream-io/video-react-sdk/dist/css/styles.css";
import { CallUI } from "./call-ui";
import { api } from "@/convex/_generated/api";

interface Props {
  conversationId: string;
  conversationName: string;
  userId: Id<"User">;
  userName: string;
  userImage: string;
};

export const CallConnect = ({
  conversationId,
  conversationName,
  userId,
  userName,
  userImage,
}: Props) => {
  const generateToken = useAction(api.conversations_stream.generateToken);

  const [client, setClient] = useState<StreamVideoClient>();
  useEffect(() => {
    const _client = new StreamVideoClient({
      apiKey: process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!,
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
        />
      </StreamCall>
    </StreamVideo>
  );
};
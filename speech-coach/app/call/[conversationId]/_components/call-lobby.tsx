import Link from "next/link";
import { LogInIcon } from "lucide-react";
import {
  DefaultVideoPlaceholder,
  StreamVideoParticipant,
  ToggleAudioPreviewButton,
  ToggleVideoPreviewButton,
  useCallStateHooks,
  VideoPreview,
} from "@stream-io/video-react-sdk";

import { Button } from "@/components/ui/button";
import { generateAvatarUri } from "@/lib/avartar";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import { useContext } from "react";
import { UserContext } from "@/app/_context/UserContext";

interface Props {
  onJoin: () => void;
};

const DisabledVideoPreview = () => {
  const { user, userData } = useContext(UserContext) ?? {};

  return (
    <DefaultVideoPlaceholder
      participant={
        {
          name: userData?.name ?? user?.displayName ?? "",
          image:
            user?.profileImageUrl ??
            userData?.image ??
            generateAvatarUri({
              seed: userData?.name ?? user?.displayName ?? "",
              variant: "initials",
            }),
        } as StreamVideoParticipant
      }
    />
  )
}

const AllowBrowserPermissions = () => {
  return (
    <p className="max-w-sm text-center text-sm text-muted-foreground">
      Please grant your browser permission to access your microphone and camera.
    </p>
  );
};

export const CallLobby = ({ onJoin }: Props) => {
  const { useCameraState, useMicrophoneState } = useCallStateHooks();

  const { hasBrowserPermission: hasMicPermission } = useMicrophoneState();
  const { hasBrowserPermission: hasCameraPermission } = useCameraState();
  const hasPermissions = hasMicPermission || hasCameraPermission;

  return (
    <div className="flex h-full flex-col items-center justify-center bg-radial from-sidebar-accent to-sidebar px-4 py-8">
      <div className="grid w-full max-w-5xl gap-6 overflow-hidden rounded-[2rem] border border-white/10 bg-background/95 p-6 shadow-2xl md:grid-cols-[1.4fr_1fr] md:p-8">
        <div className="aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] bg-black/90">
          {hasPermissions ? (
            <VideoPreview
              className="speechcoach-lobby-video !h-full !w-full !min-w-0 !border-0 !bg-transparent [&_.str-video__video-placeholder]:!h-full [&_.str-video__video-placeholder]:!w-full [&_.str-video__video-preview]:!h-full [&_.str-video__video-preview]:!w-full"
              DisabledVideoPreview={DisabledVideoPreview}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <AllowBrowserPermissions />
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-8">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Speech coach session
            </p>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Ready to join?</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                Check your microphone and optional camera before entering. The agent joins by audio only; video is only for you.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <ToggleAudioPreviewButton />
            <ToggleVideoPreviewButton />
          </div>

          <div className="flex w-full justify-between gap-3">
            <Link href="/conversation">
              <Button variant="ghost">Cancel</Button>
            </Link>
            <Button onClick={onJoin}>
              <LogInIcon />
              Join Call
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

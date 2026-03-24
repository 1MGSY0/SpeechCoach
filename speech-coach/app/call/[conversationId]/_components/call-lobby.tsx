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
    <p className="text-sm">
      Please grant your browser a permission to access your camera and
      microphone.
    </p>
  );
};

export const CallLobby = ({ onJoin }: Props) => {
  const { useCameraState, useMicrophoneState } = useCallStateHooks();

  const { hasBrowserPermission: hasMicPermission } = useMicrophoneState();
  const { hasBrowserPermission: hasCameraPermission } = useCameraState();

  const hasBrowserMediaPermission = hasCameraPermission && hasMicPermission;

  return (
    <div className="flex flex-col items-center justify-center h-full bg-radial from-sidebar-accent to-sidebar">
      <div className="py-4 px-8 flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-y-6 bg-background rounded-lg p-10 shadow-sm">
          <div className="flex flex-col gap-y-2 text-center">
            <h6 className="text-lg font-medium">Ready to join?</h6>
            <p className="text-sm">Set up call before joining</p>
          </div>
          <VideoPreview
            DisabledVideoPreview={
              hasBrowserMediaPermission
                ? DisabledVideoPreview
                : AllowBrowserPermissions 
            }
          />
          <div className="flex gap-x-2">
            <ToggleAudioPreviewButton />
            <ToggleVideoPreviewButton />
          </div>
          <div className="flex gap-x-2 justify-between w-full">
              <Link href="/conversation">
                <Button variant="ghost">
                  Cancel
                </Button>
              </Link>
            <Button
              onClick={onJoin}
            >
              <LogInIcon />
              Join Call
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
"use client";

import {LoaderIcon } from "lucide-react";

import { generateAvatarUri } from "@/lib/avartar";

import { UserContext } from "@/app/_context/UserContext";
import { useContext } from "react";
import { CallConnect } from "./call-connect";

interface Props {
  conversationId: string;
  conversationName: string;
}

export const CallProvider = ({ conversationId, conversationName }: Props) => {
  const { user, userData } = useContext(UserContext) ?? {};

  if (!userData?._id) {
    return (
      <div className="flex h-screen items-center justify-center bg-radial from-sidebar-accent to-sidebar">
        <LoaderIcon className="size-6 animate-spin text-white" />
      </div>
    );
  }

  return (
    <CallConnect
      conversationId={conversationId}
      conversationName={conversationName}
      userId={userData._id}
      userName={userData.name}
      userImage={
        user?.profileImageUrl ??
        userData?.image ??
        generateAvatarUri({ seed: userData.name, variant: "initials" })
      }
    />
  );
};
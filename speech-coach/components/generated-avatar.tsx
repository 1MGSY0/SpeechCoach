import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { botttsNeutral, initials } from "@dicebear/collection";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GeneratedAvatarProps {
  seed: string;
  className?: string;
  variant: "botttsNeutral" | "initials";
}

export const GeneratedAvatar = ({
  seed,
  className,
  variant
}: GeneratedAvatarProps) => {
  const avatarDataUri = useMemo(() => {
    if (variant === "botttsNeutral") {
    return createAvatar(botttsNeutral, { seed }).toDataUri();
  }
  return createAvatar(initials, {
    seed,
    fontWeight: 500,
    fontSize: 42,
    }).toDataUri();
  }, [seed, variant]);

  return (
    <Avatar className={cn(className)}>
      <AvatarImage className='' src={avatarDataUri} alt="Avatar" />
      <AvatarFallback className=''>{seed ? seed.charAt(0).toUpperCase() : "?"}</AvatarFallback>
    </Avatar>
  );
};
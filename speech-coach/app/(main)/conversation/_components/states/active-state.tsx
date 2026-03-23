import Link from "next/link"
import { VideoIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

interface Props {
  conversationId: string;
}


export const ActiveState = ({ 
    conversationId,
 }: Props) => {

  return (
    <div className="bg-white rounded-lg px-4 py-5 flex flex-col gap-y-2 ">
        <div className="flex flex-col-reverse lg:flex-row lg:justify-center items-center gap-2 w-full">
            <Button className="w-full lg:w-auto">
            <Link href={`/call/${conversationId}`}>
                <div className="flex items-center gap-x-2">
                    <VideoIcon />
                    Join Conversation
                </div>
            </Link>
            </Button>
        </div>
        <div className="px-4 py-5 flex flex-col gap-y-2">
            <h3 className="text-base font-medium text-bold">Active</h3>
            <p className="text-sm text-muted-foreground">
            This conversation is currently active.
            </p>
        </div>
    </div>
  );
};


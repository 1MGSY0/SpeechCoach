import Link from "next/link"
import { VideoIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

interface Props {
  conversationId: string;
/*   onCancelConversation: () => void;
  isCancelling: boolean; */
}


export const UpcomingState = ({ 
    conversationId,
/*     onCancelConversation,
    isCancelling, */
 }: Props) => {

  return (
    <div className="bg-white rounded-lg px-4 py-5 flex flex-col gap-y-2 ">
        <div className="flex flex-col-reverse lg:flex-row lg:justify-center items-center gap-2 w-full">
    {/*         <Button variant="secondary" className="w-full lg:w-auto" onClick={onCancelConversation} disabled={isCancelling}>
            Cancel conversation
            </Button> */}
            <Link href={`/call/${conversationId}`}>
                <Button /* disabled={isCancelling} */ className="w-full lg:w-auto">
                    <div className="flex items-center gap-x-2">
                        <VideoIcon />
                        Start Conversation
                    </div>
                </Button>
            </Link>
        </div>
        <div className="px-4 py-5 flex flex-col gap-y-2">
            <h3 className="text-base font-medium text-bold">Not Started yet</h3>
            <p className="text-sm text-muted-foreground">
            This conversation is scheduled but has not started yet.
            </p>
        </div>
    </div>
  );
};

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
    <div className="bg-white rounded-lg px-4 py-5 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
        <div className="xl:sticky xl:top-24 xl:self-start xl:h-fit">
            <div className="rounded-lg border bg-muted/10 p-4">
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
            </div>
        </div>

        <div className="px-4 py-5 flex flex-col gap-y-2 rounded-lg border bg-muted/10">
            <h3 className="text-base font-medium text-bold">Active</h3>
            <p className="text-sm text-muted-foreground">
            This conversation is currently active.
            </p>
        </div>
    </div>
  );
};


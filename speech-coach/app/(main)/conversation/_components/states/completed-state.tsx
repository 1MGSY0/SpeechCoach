import { Badge } from "@/components/ui/badge";

import type { ConversationGetOne } from "../../types";
import { TranscriptView } from "./transcript-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SummaryView } from "./summary-view";

type ConversationDetails = NonNullable<ConversationGetOne>;

interface Props {
  data: ConversationDetails;
}

export const CompletedState = ({ data }: Props) => {
  const durationSeconds = data.durationSeconds ?? data.duration ?? 0;

  return (
    <div className="rounded-lg border bg-white">
      <div className="px-4 py-5">
        <Tabs defaultValue="summary" className="w-full">
          <TabsList variant="line" className="mb-4">
            <TabsTrigger value="summary" className="text-sm font-bold text-primary">Summary</TabsTrigger>
            <TabsTrigger value="transcript" className="text-sm font-bold text-primary">Transcript</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-0">
            {data.summary ? (
              <SummaryView summary={data.summary} />
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No summary available.
              </div>
            )}
          </TabsContent>

          <TabsContent value="transcript" className="mt-0">
            <div className="flex flex-col gap-y-2">
              <TranscriptView
                transcript={data.transcriptText}
                onUserLineClick={(turn, index) => {
                  console.log("User line clicked:", index, turn);
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

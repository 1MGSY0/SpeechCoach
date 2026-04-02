import { Badge } from "@/components/ui/badge";
import type { ConversationGetOne } from "../../types";

import { TranscriptView } from "./transcript-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryView } from "./summary-view";
import { GradingBreakdownView } from "./grading-breakdown-view";

type ConversationDetails = NonNullable<ConversationGetOne>;

interface Props {
  data: ConversationDetails;
  gradingData?: {
    overallScore?: number | null;
    summary?: string | null;
    recommendations?: string[] | null;
    framework?: {
      name: string;
      description?: string | null;
    } | null;
    results: Array<{
      _id: string;
      score?: number;
      maxScore?: number;
      count?: number;
      feedback?: string;
      evidence?: string[];
      turnRefs?: number[];
      category?: { _id: string; name: string } | null;
      criterion?: { _id: string; name: string } | null;
    }>;
  } | null;
}

export const CompletedState = ({ data, gradingData }: Props) => {
const durationSeconds = data.durationSeconds ?? data.duration ?? 0;

  return (
    <div className="rounded-lg border bg-white">
      <div className="px-4 py-5">
        <Tabs defaultValue="summary" className="w-full">
          <TabsList variant="line" className="mb-4">
            <TabsTrigger value="summary" className="text-sm font-bold text-primary">
              Summary
            </TabsTrigger>
            <TabsTrigger value="grading" className="text-sm font-bold text-primary">
              Grading
            </TabsTrigger>
            <TabsTrigger value="transcript" className="text-sm font-bold text-primary">
              Transcript
            </TabsTrigger>
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

          <TabsContent value="grading" className="mt-0">
            <GradingBreakdownView data={gradingData ?? null} />
          </TabsContent>

          <TabsContent value="transcript" className="mt-0">
            <div className="flex flex-col gap-y-2">
              <TranscriptView
                transcript={data.transcriptText}
                gradingResults={gradingData?.results ?? []}
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
import { useState } from "react";
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
      turnRefs?: Array<{ text: string; timestamp: string }>;
      category?: { _id: string; name: string } | null;
      criterion?: { _id: string; name: string } | null;
    }>;
  } | null;
}

export const CompletedState = ({ data, gradingData }: Props) => {
  const [activeTab, setActiveTab] = useState("summary");
  const [transcriptSeekSeconds, setTranscriptSeekSeconds] = useState<number | null>(null);
  const semanticMemoryEnabled =
    (data as { semanticMemoryEnabled?: boolean | null }).semanticMemoryEnabled !== false;
  const displaySummary = semanticMemoryEnabled
    ? data.summary || gradingData?.summary
    : gradingData?.summary || data.summary;

  return (
    <div className="rounded-lg border bg-white">
      <div className="px-4 py-5">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
            {displaySummary ? (
              <SummaryView
                summary={displaySummary}
                onTimestampClick={(seconds) => {
                  setTranscriptSeekSeconds(seconds);
                  setActiveTab("transcript");
                }}
              />
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No summary available.
              </div>
            )}
          </TabsContent>

          <TabsContent value="grading" className="mt-0">
            <GradingBreakdownView
              data={gradingData ?? null}
              onTimestampClick={(seconds) => {
                setTranscriptSeekSeconds(seconds);
                setActiveTab("transcript");
              }}
            />
          </TabsContent>

          <TabsContent value="transcript" className="mt-0">
            <div className="flex flex-col gap-y-2">
              <TranscriptView
                transcript={data.transcriptText}
                gradingResults={gradingData?.results ?? []}
                transcriptSeekSeconds={transcriptSeekSeconds}
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

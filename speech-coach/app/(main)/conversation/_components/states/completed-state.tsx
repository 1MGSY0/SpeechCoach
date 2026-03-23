import { Badge } from "@/components/ui/badge";

import type { ConversationGetOne } from "../../types";

type ConversationDetails = NonNullable<ConversationGetOne>;

interface Props {
  data: ConversationDetails;
}

export const CompletedState = ({ data }: Props) => {
  const durationSeconds = data.durationSeconds ?? data.duration ?? 0;

  return (
    <div className="bg-white rounded-lg border">
      <div className="px-4 py-5 flex flex-col gap-y-4">
        <div className="flex items-center gap-x-2">
          <Badge variant="outline" className="w-fit capitalize">
            Completed
          </Badge>
          {durationSeconds > 0 && (
            <span className="text-sm text-muted-foreground">
              Duration: {Math.round(durationSeconds)}s
            </span>
          )}
        </div>

        {data.summary && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Summary</p>
            <p className="text-sm text-muted-foreground">{data.summary}</p>
          </div>
        )}

        <div className="flex flex-col gap-y-2">
          {data.transcriptUrl && (
            <a
              className="text-sm text-primary hover:underline"
              href={data.transcriptUrl}
              target="_blank"
              rel="noreferrer"
            >
              View transcript
            </a>
          )}
          {data.recordingUrl && (
            <a
              className="text-sm text-primary hover:underline"
              href={data.recordingUrl}
              target="_blank"
              rel="noreferrer"
            >
              Listen to recording
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

import { Badge } from "@/components/ui/badge";

interface Props {
  conversationId: string;
}

export const ActiveState = ({ conversationId }: Props) => {
  return (
    <div className="bg-white rounded-lg border">
      <div className="px-4 py-5 flex flex-col gap-y-2">
        <Badge variant="outline" className="w-fit capitalize">
          Active
        </Badge>
        <p className="text-sm text-muted-foreground">
          Conversation {conversationId} is currently active.
        </p>
      </div>
    </div>
  );
};

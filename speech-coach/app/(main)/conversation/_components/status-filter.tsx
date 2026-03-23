import {
  CircleCheckIcon,
  CircleXIcon,
  CornerDownRightIcon,
  ClockIcon,
  LoaderIcon,
  VideoIcon,
} from "lucide-react"

import { CommandSelect } from "@/components/command-select"

import { ConversationStatus } from "@/services/conversation-status";
import { useConversationFilters } from "../hooks/use-conversation-filters";

const options = [
  {
    id: ConversationStatus.UPCOMING,
    value: ConversationStatus.UPCOMING,
    children: (
      <div className="flex items-center gap-x-2 capitalize">
        <ClockIcon />
        {ConversationStatus.UPCOMING}
      </div>
    )
  },
  {
    id: ConversationStatus.COMPLETED,
    value: ConversationStatus.COMPLETED,
    children: (
      <div className="flex items-center gap-x-2 capitalize">
        <CircleCheckIcon />
        {ConversationStatus.COMPLETED}
      </div>
    ),
  },
  {
    id: ConversationStatus.ACTIVE,
    value: ConversationStatus.ACTIVE,
    children: (
      <div className="flex items-center gap-x-2 capitalize">
        <VideoIcon />
        {ConversationStatus.ACTIVE}
      </div>
    ),
  },
  {
    id: ConversationStatus.PROCESSING,
    value: ConversationStatus.PROCESSING,
    children: (
      <div className="flex items-center gap-x-2 capitalize">
        <LoaderIcon />
        {ConversationStatus.PROCESSING}
      </div>
    ),
  },
  {
    id: ConversationStatus.CANCELLED,
    value: ConversationStatus.CANCELLED,
    children: (
      <div className="flex items-center gap-x-2 capitalize">
        <CircleXIcon />
        {ConversationStatus.CANCELLED}
      </div>
    ),
  },
];

export const StatusFilter = () => {
  const [filters, setFilters] = useConversationFilters();

  return (
    <CommandSelect
      placeholder="Status"
      className="h-9"
      options={options}
      onSelect={(value) =>
        setFilters({
          status: value as (typeof ConversationStatus)[keyof typeof ConversationStatus],
        })
      }
      value={filters.status ?? ""}
    />
  );
};
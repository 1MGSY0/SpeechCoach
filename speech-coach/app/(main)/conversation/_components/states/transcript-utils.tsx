export interface TranscriptTurn {
  id?: string;
  speaker: string;
  text: string;
  timestamp: string;
}

export function parseTranscriptJson(value?: string | null): TranscriptTurn[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is TranscriptTurn =>
        item &&
        typeof item === "object" &&
        typeof item.speaker === "string" &&
        typeof item.text === "string" &&
        typeof item.timestamp === "string"
    );
  } catch {
    return [];
  }
}

export function timestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(":").map(Number);

  if (parts.some((n) => Number.isNaN(n))) return 0;

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  return 0;
}

export function secondsToTimestamp(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
export type ProgressionLogEntry = {
  timestamp: string;
  progressionLog: string;
};

export type SemanticMemory = {
  rollingSummary: string;
  progressionReason: ProgressionLogEntry[];
  extractedEntities: string[];
  lastProcessedTurnCount: number;
};

export function emptySemanticMemory(): SemanticMemory {
  return {
    rollingSummary: "",
    progressionReason: [],
    extractedEntities: [],
    lastProcessedTurnCount: 0,
  };
}

export function parseSemanticMemory(value?: string | null): SemanticMemory | null {
  if (!value?.trim()) return null;

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;

    return {
      rollingSummary:
        typeof parsed.rollingSummary === "string" ? parsed.rollingSummary : "",
      progressionReason: Array.isArray(parsed.progressionReason)
        ? parsed.progressionReason
            .filter((item) => item && typeof item === "object")
            .map((item: any) => ({
              timestamp: typeof item.timestamp === "string" ? item.timestamp : "0:00:00",
              progressionLog:
                typeof item.progressionLog === "string" ? item.progressionLog : "",
            }))
            .filter((item) => item.progressionLog)
        : [],
      extractedEntities: Array.isArray(parsed.extractedEntities)
        ? parsed.extractedEntities.filter(
            (item: unknown): item is string => typeof item === "string"
          )
        : [],
      lastProcessedTurnCount:
        typeof parsed.lastProcessedTurnCount === "number"
          ? parsed.lastProcessedTurnCount
          : 0,
    };
  } catch {
    return null;
  }
}

export function stringifySemanticMemory(memory: SemanticMemory) {
  return JSON.stringify(memory);
}

export function composeRoleplayInstructions(args: {
  baseInstructions?: string | null;
  memoryJson?: string | null;
}) {
  const baseInstructions = args.baseInstructions?.trim() ?? "";
  const memory = parseSemanticMemory(args.memoryJson);

  if (!memory) {
    return baseInstructions;
  }

  const recentProgression = dedupeProgressionLogs(memory.progressionReason);

  const additions = [
    "## Scenario Continuity",
    memory.rollingSummary
      ? `Keep continuity with this updated situation and emotional state: ${memory.rollingSummary}`
      : null,
    recentProgression.length
      ? [
          "Recent scenario changes:",
          ...recentProgression.map(
            (item) => `- [${item.timestamp}] ${item.progressionLog}`
          ),
        ].join("\n")
      : null,
    memory.extractedEntities.length
      ? `Important confirmed details: ${memory.extractedEntities.join("; ")}`
      : null,
    "If the user demonstrates rubric-aligned support, let the persona progress toward the original user goal through a concrete state change, while staying realistic.",
    "Do not break character or replace the original persona. Treat this as a live update to the existing role-play situation.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return [baseInstructions, additions].filter(Boolean).join("\n\n").trim();
}

function dedupeProgressionLogs(
  entries: ProgressionLogEntry[]
): ProgressionLogEntry[] {
  const seen = new Set<string>();
  const result: ProgressionLogEntry[] = [];

  for (const entry of entries) {
    const key = normalizeProgressionLog(entry.progressionLog);
    if (!key) continue;
    const duplicateIndex = result.findIndex((item) =>
      isProgressionDuplicate(item.progressionLog, entry.progressionLog)
    );

    if (duplicateIndex >= 0) {
      if (
        entry.progressionLog.trim().length >
        result[duplicateIndex].progressionLog.length
      ) {
        result[duplicateIndex] = {
          timestamp: entry.timestamp,
          progressionLog: entry.progressionLog.trim(),
        };
      }
      continue;
    }

    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      timestamp: entry.timestamp,
      progressionLog: entry.progressionLog.trim(),
    });
  }

  return result;
}

function normalizeProgressionLog(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(the user|user|student|coach)\b/g, "user")
    .replace(/\b(persona|assistant)\b/g, "persona")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(may|might|likely|seems|seem|a bit|more|still|current|currently)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isProgressionDuplicate(a: string, b: string) {
  const normalizedA = normalizeProgressionLog(a);
  const normalizedB = normalizeProgressionLog(b);
  if (!normalizedA || !normalizedB) return false;
  if (normalizedA === normalizedB) return true;

  const shorter =
    normalizedA.length <= normalizedB.length ? normalizedA : normalizedB;
  const longer = normalizedA.length > normalizedB.length ? normalizedA : normalizedB;
  if (shorter.length >= 48 && longer.includes(shorter)) return true;

  const tokensA = new Set(normalizedA.split(" ").filter((token) => token.length > 2));
  const tokensB = new Set(normalizedB.split(" ").filter((token) => token.length > 2));
  if (!tokensA.size || !tokensB.size) return false;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection += 1;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return intersection / union >= 0.72;
}

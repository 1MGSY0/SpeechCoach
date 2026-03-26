export const PERSONA_META_START = "<persona_meta>";
export const PERSONA_META_END = "</persona_meta>";

export type PersonaMeta = {
  char_name?: string;
  scenario?: string;
  wiAfter?: string;
  wiBefore?: string;
  mesExamples?: string;
  description?: string;
  personality?: string;
  conversation_goal?: string;
};

export function extractPersonaData(instructions?: string): PersonaMeta | null {
  if (!instructions) return null;

  const start = instructions.indexOf(PERSONA_META_START);
  const end = instructions.indexOf(PERSONA_META_END);

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  const jsonText = instructions
    .slice(start + PERSONA_META_START.length, end)
    .trim();

  try {
    return JSON.parse(jsonText) as PersonaMeta;
  } catch {
    return null;
  }
}


export function stripPersonaMeta(instructions?: string): string {
  if (!instructions) return "";

  const start = instructions.indexOf(PERSONA_META_START);
  const end = instructions.indexOf(PERSONA_META_END);

  if (start === -1 || end === -1 || end <= start) {
    return instructions.trim();
  }

  const before = instructions.slice(0, start).trim();
  const after = instructions.slice(end + PERSONA_META_END.length).trim();

  return [before, after].filter(Boolean).join("\n\n").trim();
}
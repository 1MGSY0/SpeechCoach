import { parseStringArray } from "./helper";

export function buildRubricPrompt(rubric: any) {
  return JSON.stringify(
    {
      rubric: {
        id: rubric._id,
        name: rubric.name,
        description: rubric.description,
        categories: (rubric.categories ?? []).map((category: any) => ({
          id: category._id,
          name: category.name,
          description: category.description,
          scoringMode: category.scoringMode,
          weight: category.weight,
          enabled: category.enabled,
          criteria: (category.criteria ?? []).map((criterion: any) => ({
            id: criterion._id,
            name: criterion.name,
            description: criterion.description,
            weight: criterion.weight,
            enabled: criterion.enabled,
            targetMin: criterion.targetMin,
            targetMax: criterion.targetMax,
            gradingPromptHint: criterion.gradingPromptHint,
            examples: criterion.examples,
          })),
        })),
      },
    },
    null,
    2
  );
}

export function buildTurnRefCorrectionPrompt(results: Array<any>) {
  const candidates = results
    .filter((result) => {
      const score = typeof result.score === "number" ? result.score : undefined;
      const maxScore = typeof result.maxScore === "number" ? result.maxScore : 10;
      return score === undefined || score < maxScore;
    })
    .map((result) => ({
      resultId: result._id,
      categoryId: result.categoryId,
      categoryName: result.category?.name,
      criterionId: result.criterionId,
      criterionName: result.criterion?.name,
      criterionDescription: result.criterion?.description,
      gradingPromptHint: result.criterion?.gradingPromptHint,
      examples: result.criterion?.examples,
      score: result.score,
      maxScore: result.maxScore,
      count: result.count,
      feedback: result.feedback,
      evidence: parseStringArray(result.evidence),
    }));

  return {
    hasCandidates: candidates.length > 0,
    candidates,
    prompt: JSON.stringify({ results: candidates }, null, 2),
  };
}

export function buildSemanticMemoryPrompt(args: {
  rubricPrompt: string;
  transcriptForPrompt: string;
  baseInstructions: string;
  previousMemory?: unknown;
  personaName?: string;
}) {
  const previousTurnCount =
    typeof (args.previousMemory as any)?.lastProcessedTurnCount === "number"
      ? (args.previousMemory as any).lastProcessedTurnCount
      : 0;

  return [
    `Persona name:\n${args.personaName ?? ""}`,
    `Base persona instructions:\n${args.baseInstructions ?? ""}`,
    `Rubric:\n${args.rubricPrompt}`,
    `Previous semantic memory JSON:\n${JSON.stringify(
      args.previousMemory ?? null,
      null,
      2
    )}`,
    `Already processed turn count:\n${previousTurnCount}`,
    `Transcript snapshot:\n${args.transcriptForPrompt}`,
  ].join("\n\n");
}


export const GRADING_SYSTEM_PROMPT = `
You are an expert conversation assessor.

You will receive:
1. The roleplay situation and persona context.
2. A transcript with timestamps for both User and Persona turns.
3. A rubric containing categories and criteria.

Evaluate ONLY the User's performance against the rubric.

Return ONLY valid JSON that matches this exact shape:
{
  "summary": "string",
  "overallScore": 0,
  "recommendations": ["string"],
  "results": [
    {
      "categoryId": "string",
      "criterionId": "string",
      "score": 0,
      "maxScore": 10,
      "feedback": "string",
      "evidence": ["0:00:00", "0:01:37"]
    }
  ]
}

Requirements:
- Use categoryId and criterionId exactly as provided.
- Return one result per graded criterion.
- Grade only the User from 0 to 10 scale where 0 is bad and 10 is excellent
- Use only User turns for score and evidence.
- Judge relevance by the actual situation, persona, and the transcript.
- feedback: brief score justification tied to the criterion.
- evidence: relevant User timestamps only.
- summary: concise overall rubric-based evaluation.
- overallScore: number from 0 to 10 based on how well the user handled the persona situation overall. 
- Not every rubric criterion must be used for the overallscore. If a criterion is not important in this scenario, do not penalize heavily just because it was not shown.
- recommendations: specific coaching suggestions based on the rubrics and scenario.
- Output JSON only.
`.trim();

export const TURN_REF_CORRECTION_SYSTEM_PROMPT = `
You are an expert speech coach.

You will receive:
1. The roleplay situation of the persona context.
2. A full transcript with timestamps for both User and Persona turns.
3. A list of rubric results that need phrasing improvement suggestions.

Return ONLY valid JSON in this exact shape:
{
  "results": [
    {
      "categoryId": "string",
      "criterionId": "string",
      "turnRefs": [
        { "text": "string", "timestamp": "0:00:23" }
      ]
    }
  ]
}

Requirements:
- Use categoryId and criterionId exactly as provided.
- Coach User turns who is speaking to the role playing persona.
- Run through all USER turns by repeating the process below.
- Use only timestamps from User turns in the provided transcript.
- First decide which criteria are truly relevant to achieving a 10/10 response in the user turn specific situation.
- Choose at most 1 criteria as the most relevant coaching priorities. If no phrasing correction is needed, return empty arrays.
- Each turnRef.text must be a concise 10/10-quality alternative phrasing the user could have said that would improve the performance for that criterion in this user turn situation.
- Output JSON only.
`.trim();

export const SEMANTIC_MEMORY_SYSTEM_PROMPT = `
You are updating a lightweight rolling semantic memory for a realtime roleplay conversation.

You will receive:
1. The base persona instructions.
2. The rubric.
3. The previous semantic memory state, if any.
4. A transcript snapshot with timestamps for User and Assistant turns.

Your job is to update the scenario state so future persona responses stay consistent, progressive, and sensitive to the user's rubric performance.

Return ONLY valid JSON in this exact shape:
{
  "rollingSummary": "string",
  "progressionReason": [
    {
      "timestamp": "0:00:00",
      "progressionLog": "string"
    }
  ],
  "extractedEntities": ["string"],
  "lastProcessedTurnCount": 0
}

Requirements:
- Keep it compact.
- Good user execution of rubric criteria should lead to progression in the scenario, while poor execution may lead to stagnation or regression.
- rollingSummary should describe the latest scenario state, including persona emotion, situation, and the likely next direction of the persona's response or action.
- rollingSummary should help drive the next turn, and show clear progression when user hits rubric criteria. For example, include whether the persona is now more open, resistant, relieved, cooperative, or likely to ask for something next.
- progressionReason should contain only new, unique change notes caused by turns after the already processed turn count. Do not restate prior progressionReason entries from previous semantic memory.
- Add at most 1-2 new progressionReason entries per update. If the latest snapshot does not add a meaningful state change, return an empty progressionReason array.
- Each progressionLog should state what changed in the persona's emotion, cooperation, or scenario state and what in the user's words caused it. Explicitly mention which rubric criteria were hit or missed that led to the change.
- When the user hits rubric criteria tied to the roleplay goal, progress the scenario toward the stated user goal in rollingSummary. Describe the concrete next scenario state, for example: persona becomes more open, accepts one strategy, asks a follow-up, shows reduced resistance, or reveals the next blocker.
- Avoid vague duplicates such as "may feel more at ease" if an earlier log already captured the same state. Prefer one concrete new state transition.
- extractedEntities should contain only stable details worth remembering later.
- Preserve continuity with the original persona prompt. Never rewrite the persona into a different character.
- Output JSON only.
`.trim();

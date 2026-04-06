import OpenAI from "openai";

export const GROQ_LLM_BASE_URL = "https://api.groq.com/openai/v1";
export const GROQ_LLM_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
export const OPENROUTER_LLM_BASE_URL = "https://openrouter.ai/api/v1";
export const OPENROUTER_LLM_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

const inngestLlmProvider = (
  process.env.INNGEST_LLM_PROVIDER ?? "groq"
).toLowerCase();

export const INNGEST_LLM_BASE_URL =
  process.env.INNGEST_LLM_BASE_URL ??
  (inngestLlmProvider === "openrouter"
    ? OPENROUTER_LLM_BASE_URL
    : GROQ_LLM_BASE_URL);

export const INNGEST_LLM_MODEL =
  process.env.INNGEST_LLM_MODEL ??
  (inngestLlmProvider === "openrouter"
    ? OPENROUTER_LLM_MODEL
    : process.env.GROQ_MODEL ?? GROQ_LLM_MODEL);

const inngestLlmApiKey =
  process.env.INNGEST_LLM_API_KEY ??
  (inngestLlmProvider === "openrouter"
    ? process.env.OPENROUTER_API_KEY
    : process.env.GROQ_API_KEY);

export function createInngestLlmClient() {
  if (!inngestLlmApiKey) {
    throw new Error(
      "Missing INNGEST_LLM_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY"
    );
  }

  return new OpenAI({
    baseURL: INNGEST_LLM_BASE_URL,
    apiKey: inngestLlmApiKey,
  });
}

import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const TARGET_CONVERSATION_IDS = [
  "jn7bqxnscfydw64179hwy0e72s84c0v2",
  "jn7brzb52bqtb4gftn1hsrk3ts84db9m",
  "jn7cmh0mt3q0sakj7jsex71z9d84d0tz",
  "jn7endmxrt55mtkajnrny5e0t984egc9",
  "jn7bsz97cfekw568c48rcsgqs584dwbr"
];

function resolveRoots() {
  const cwd = process.cwd();
  const cwdName = path.basename(cwd).toLowerCase();
  if (cwdName === "speech-coach") {
    return {
      workspaceRoot: path.dirname(cwd),
      speechCoachRoot: cwd,
    };
  }

  return {
    workspaceRoot: cwd,
    speechCoachRoot: path.resolve(cwd, "speech-coach"),
  };
}

const { workspaceRoot, speechCoachRoot } = resolveRoots();
const OUTPUT_PATH = path.resolve(workspaceRoot, "reports", "fyp-data", "eval_u.md");



for (const envName of [".env.local", ".env", ".env.docker"]) {
  dotenv.config({
    path: path.join(speechCoachRoot, envName),
    override: false,
    quiet: true,
  });
}

function getConvexUrl() {
  return (
    process.env.NEXT_PUBLIC_CONVEX_URL ||
    process.env.CONVEX_URL_INTERNAL ||
    process.env.CONVEX_URL
  );
}

function getConvexAdminKey() {
  return (
    process.env.CONVEX_SELF_HOSTED_ADMIN_KEY ||
    process.env.CONVEX_ADMIN_KEY ||
    null
  );
}

async function fetchConversationExport(client, conversationId) {
  const conversation = await client.query(api.Conversations.GetConversationById, {
    conversationId,
  });

  if (!conversation) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  return {
    conversationId,
    conversationName: conversation.name ?? "",
    personaName: conversation.personaName ?? "",
    startedAt: conversation.startedAt ?? null,
    endedAt: conversation.endedAt ?? null,
    transcriptText: conversation.transcriptText ?? null,
    summary: conversation.summary ?? null,
    speechMetrics: conversation.speechMetrics
      ? {
          mode: conversation.speechMetrics.mode ?? null,
          turnCount: conversation.speechMetrics.turnCount ?? null,
          summary: conversation.speechMetrics.summary ?? null,
          turns: Array.isArray(conversation.speechMetrics.turns)
            ? conversation.speechMetrics.turns.map((turn) => ({
                turnIndex: turn.turnIndex ?? null,
                source: turn.source ?? null,
                ttfpMs: turn.ttfpMs ?? null,
                ttfrMs: turn.ttfrMs ?? null,
                e2eMs: turn.e2eMs ?? null,
                asrMs: turn.asrMs ?? null,
                llmMs: turn.llmMs ?? null,
                ttsMs: turn.ttsMs ?? null,
                playbackMs: turn.playbackMs ?? null,
              }))
            : [],
        }
      : null,
    memoryMetrics: conversation.memoryMetrics
      ? {
          summary: conversation.memoryMetrics.summary ?? null,
          runs: Array.isArray(conversation.memoryMetrics.runs)
            ? conversation.memoryMetrics.runs.map((run) => ({
                trigger: run.trigger ?? null,
                startedAt: run.startedAt ?? null,
                completedAt: run.completedAt ?? null,
                durationMs: run.durationMs ?? null,
                turnCount: run.turnCount ?? null,
                progressionLogs: run.progressionLogs ?? null,
                promptInputChars: run.promptInputChars ?? null,
                memoryOutputChars: run.memoryOutputChars ?? null,
                stageDurationsMs: run.stageDurationsMs ?? null,
              }))
            : [],
        }
      : null,
  };
}

async function main() {
  const conversationIds = TARGET_CONVERSATION_IDS.filter(
    (item) => typeof item === "string" && item.trim() && !item.startsWith("replace-with-")
  );

  if (!conversationIds.length) {
    throw new Error(
      "No conversation IDs configured. Update TARGET_CONVERSATION_IDS in speech-coach/scripts/export-eval-from-md.mjs."
    );
  }

  const convexUrl = getConvexUrl();
  if (!convexUrl) {
    throw new Error("Missing CONVEX_URL_INTERNAL or NEXT_PUBLIC_CONVEX_URL.");
  }

  const client = new ConvexHttpClient(convexUrl, {
    skipConvexDeploymentUrlCheck: true,
  });
  const adminKey = getConvexAdminKey();
  if (adminKey) {
    client.setAdminAuth(adminKey);
  }

  const sessions = [];
  for (const conversationId of conversationIds) {
    sessions.push(await fetchConversationExport(client, conversationId));
  }

  const exported = {
    generatedAt: new Date().toISOString(),
    conversationIds,
    sessions,
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(exported, null, 2) + "\n", "utf8");
  console.log(`Wrote JSON export for ${sessions.length} conversation(s) to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});

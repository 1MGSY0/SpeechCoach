# SpeechCoach Evaluation

This evaluation flow is for the `speech-coach` application itself.

It focuses on two layers:

- `Speech layer`: response timing, transcript fidelity, utterance structure
- `Conversation layer`: continuity, contradiction proxy, entity carryover, semantic-memory alignment

## 1. Prepare session export data

Create a JSON file with either:

- one session object, or
- an object with a `sessions` array, or
- a raw array of session objects

Each session may include:

```json
{
  "conversationName": "Permit inquiry session 01",
  "personaName": "Permit Officer",
  "transcriptText": [
    { "speaker": "User", "text": "Good morning, I would like to check my permit status.", "timestamp": "0:00:01" },
    { "speaker": "Assistant", "text": "Certainly. May I have your case number?", "timestamp": "0:00:04" }
  ],
  "summary": {
    "rollingSummary": "The officer is helping the user check a pending permit application.",
    "progressionReason": [
      { "timestamp": "0:00:04", "progressionLog": "The officer asks for the case number to continue verification." }
    ],
    "extractedEntities": ["permit application", "case number"],
    "lastProcessedTurnCount": 2
  },
  "memoryMetrics": {
    "runs": [
      {
        "trigger": "snapshot",
        "startedAt": "2026-04-05T12:00:00.000Z",
        "completedAt": "2026-04-05T12:00:01.200Z",
        "durationMs": 1200,
        "turnCount": 2,
        "progressionLogs": 1
      }
    ],
    "summary": {
      "runCount": 1,
      "averageDurationMs": 1200,
      "lastDurationMs": 1200,
      "maxDurationMs": 1200,
      "minDurationMs": 1200
    }
  },
  "speechMetrics": {
    "mode": "realtime",
    "turnCount": 1,
    "summary": {
      "ttfpMsMean": 420,
      "ttfrMsMean": 880,
      "e2eMsMean": 2140,
      "ttfpMsFirst": 420,
      "ttfrMsFirst": 880,
      "e2eMsFirst": 2140
    },
    "turns": [
      {
        "turnIndex": 1,
        "source": "realtime",
        "speechStartAtMs": 1712260000000,
        "firstPartialAtMs": 1712260000420,
        "userTurnEndAtMs": 1712260001500,
        "firstResponseAtMs": 1712260002380,
        "responseEndAtMs": 1712260003640,
        "ttfpMs": 420,
        "ttfrMs": 880,
        "e2eMs": 2140
      }
    ]
  },
  "expectedEntities": ["case number", "permit", "lease agreement"],
  "referenceUserTurns": [
    "Good morning, I would like to check my permit status."
  ]
}
```

Notes:

- `transcriptText` can be either a JSON array or the stringified JSON stored by the app.
- `summary` can be either a parsed object or the raw semantic-memory JSON string.
- `speechMetrics` is optional but recommended.
- `memoryMetrics` is optional and stores semantic rolling-memory processing times from the Inngest memory update flow.
- The live extractor now stores `speechMetrics.summary` and `speechMetrics.turns` in the SpeechCoach conversation record.
- The extractor supports both Vision Agents realtime mode and custom pipeline mode by listening to the event system used by `gemini.Realtime()` as well as STT/LLM/TTS pipeline events.
- `referenceUserTurns` or `referenceTranscriptText` is optional and enables transcript-fidelity scoring.
- `expectedEntities` is optional and enables entity coverage scoring.

## 2. Run the evaluator

```powershell
python -m reports.export_speechcoach_eval `
  --input reports/fyp-data/eval.md `
  --out_md reports/eval_reports/speechcoach_eval.md
```

## 2a. Export real conversations to `data/fyp-data/eval.md`

Configure the target conversation IDs directly in:

- `speech-coach/scripts/export-eval-from-md.mjs`

inside:

```js
const TARGET_CONVERSATION_IDS = [
  "your-conversation-id-1",
  "your-conversation-id-2",
];
```

Then run:

```powershell
node speech-coach/scripts/export-eval-from-md.mjs
```

This writes the JSON export string directly to:

- `data/fyp-data/eval.md`

The output JSON contains only the fields needed for evaluation and report generation:

- `generatedAt`
- `conversationIds`
- `sessions`

Each exported session includes:

- conversation metadata
- `transcriptText`
- `summary`
- compact `speechMetrics`:
  - summary
  - per-turn `ttfpMs`, `ttfrMs`, `e2eMs`
- compact `memoryMetrics`:
  - summary
  - per-run `durationMs`, `turnCount`, `progressionLogs`

It intentionally excludes large rubric/assessment payloads that are not used by the current final-report exporter.

## 3. Output

The generated Markdown file contains:

- speech-layer summary table
- conversation-layer summary table
- per-session result table
- short interpretation notes for the methodology section

## 4. Recommended methodology

For a stronger FYP evaluation:

- Use at least 10 to 20 full roleplay sessions across multiple personas.
- Include a fixed scenario sheet with expected entities and goals.
- Run repeated trials where timing matters.
- Manually review a subset of sessions for contradiction and continuity.
- Report both automated proxy metrics and qualitative observations.

## 5. Live metric extraction

The backend voice agent now emits `speechMetrics` automatically on `call.transcription_ready`.

For `gemini.Realtime()` it derives timing from:

- `RealtimeAudioInputEvent`
- `RealtimeUserSpeechTranscriptionEvent`
- `LLMResponseChunkEvent`
- `RealtimeAudioOutputEvent`
- `LLMResponseCompletedEvent`

For custom pipeline mode it derives timing from:

- `TurnStartedEvent`
- `STTPartialTranscriptEvent`
- `STTTranscriptEvent`
- `LLMResponseChunkEvent`
- `TTSAudioEvent`
- `TTSSynthesisCompleteEvent`

This follows the Vision Agents event-based architecture documented in their guides and event APIs.

# SpeechCoach Evaluation Report

- Generated: 2026-04-06 18:15 UTC
- Input file: `reports/fyp-data/eval.md`
- Sessions evaluated: 2

## 1. What Was Evaluated

- Speech layer: timing, transcript fidelity, utterance length, and turn alternation integrity.
- Conversation layer: continuity between user context and assistant replies, contradiction proxy rate, expected entity carryover, and semantic-memory alignment.

## 2. Speech Layer Summary

| Metric | Unit | Mean | Median | P95 | Min | Max |
| --- | --- | --- | --- | --- | --- | --- |
| TTFP | ms | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| TTFR | ms | 3492.86 | 3492.86 | 5255.71 | 1730.00 | 5255.71 |
| E2E | ms | 10170.33 | 10170.33 | 10170.33 | 10170.33 | 10170.33 |
| ASR | ms | 5925.67 | 5925.67 | 5925.67 | 5925.67 | 5925.67 |
| LLM | ms | 3300.44 | 3300.44 | 4899.71 | 1701.17 | 4899.71 |
| TTS start | ms | 192.41 | 192.41 | 356.00 | 28.83 | 356.00 |
| Playback | ms | 2664.19 | 2664.19 | 2813.71 | 2514.67 | 2813.71 |
| Avg user utterance length | words | 12.77 | 12.77 | 17.71 | 7.83 | 17.71 |

## 3. Conversation Layer Summary

| Metric | Unit | Mean | Median | P95 | Min | Max |
| --- | --- | --- | --- | --- | --- | --- |
| Contradiction rate | ratio | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| Memory timestamp alignment | ratio | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Progression logs per session | count | 7.00 | 7.00 | 8.00 | 6.00 | 8.00 |
| Semantic memory processing | s | 69.65 | 69.65 | 81.42 | 57.88 | 81.42 |

## 4. Session-Level Results

| Session | Persona | User turns | Assistant turns | Duration (s) | TTFP ms | TTFR ms | E2E ms | ASR ms | LLM ms | TTS start ms | Playback ms | Contradiction rate | Progression logs | Memory avg s | Alternation errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Unified 1 nvidia openrouter | Linda | 7 | 7 | 253.00 | N/A | 5255.71 | N/A | N/A | 4899.71 | 356.00 | 2813.71 | 0.000 | 8 | 57.88 | 0 |
| Cascaded 1 nvidia openrouter | Marcus | 6 | 6 | 205.00 | 0.00 | 1730.00 | 10170.33 | 5925.67 | 1701.17 | 28.83 | 2514.67 | 0.000 | 6 | 81.42 | 0 |

## 5. Speech Turn Metrics

| Session | Turn | Source | TTFP ms | TTFR ms | E2E ms | ASR ms | LLM ms | TTS start ms | Playback ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Unified 1 nvidia openrouter | 1 | realtime | N/A | 3192.00 | N/A | N/A | 2522.00 | 670.00 | 4489.00 |
| Unified 1 nvidia openrouter | 2 | realtime | N/A | 2012.00 | N/A | N/A | 1693.00 | 319.00 | 2663.00 |
| Unified 1 nvidia openrouter | 3 | realtime | N/A | 2086.00 | N/A | N/A | 1788.00 | 298.00 | 3021.00 |
| Unified 1 nvidia openrouter | 4 | realtime | N/A | 13862.00 | N/A | N/A | 13575.00 | 287.00 | 2876.00 |
| Unified 1 nvidia openrouter | 5 | realtime | N/A | 1596.00 | N/A | N/A | 1307.00 | 289.00 | 2115.00 |
| Unified 1 nvidia openrouter | 6 | realtime | N/A | 12043.00 | N/A | N/A | 11708.00 | 335.00 | 2766.00 |
| Unified 1 nvidia openrouter | 7 | realtime | N/A | 1999.00 | N/A | N/A | 1705.00 | 294.00 | 1766.00 |
| Cascaded 1 nvidia openrouter | 1 | pipeline | 0.00 | 1478.00 | 9150.00 | 2801.00 | 1478.00 | 0.00 | 4871.00 |
| Cascaded 1 nvidia openrouter | 2 | pipeline | 0.00 | 1909.00 | 9542.00 | 6126.00 | 1909.00 | 0.00 | 1507.00 |
| Cascaded 1 nvidia openrouter | 3 | pipeline | 0.00 | 1643.00 | 13360.00 | 9880.00 | 1643.00 | 0.00 | 1837.00 |
| Cascaded 1 nvidia openrouter | 4 | pipeline | 0.00 | 2293.00 | 6507.00 | 2089.00 | 2293.00 | 0.00 | 2125.00 |
| Cascaded 1 nvidia openrouter | 5 | pipeline | 0.00 | 1223.00 | 17080.00 | 12876.00 | 1223.00 | 0.00 | 2981.00 |
| Cascaded 1 nvidia openrouter | 6 | pipeline | 0.00 | 1834.00 | 5383.00 | 1782.00 | 1661.00 | 173.00 | 1767.00 |

## 6. Memory Run Metrics

| Session | Run | Trigger | Started | Completed | Duration s | Turn count | Progression logs | Prompt chars | Output chars | Fetch s | Transcript parse s | Rubric fetch s | Model s | Memory parse s | Save s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Unified 1 nvidia openrouter | 1 | snapshot | 09:37:06 | 09:37:40 | 34.41 | 4 | 2 | - | - | N/A | N/A | N/A | N/A | N/A | N/A |
| Unified 1 nvidia openrouter | 2 | snapshot | 09:37:43 | 09:38:35 | 51.40 | 6 | 4 | - | - | N/A | N/A | N/A | N/A | N/A | N/A |
| Unified 1 nvidia openrouter | 3 | snapshot | 09:39:29 | 09:40:29 | 59.92 | 10 | 6 | - | - | N/A | N/A | N/A | N/A | N/A | N/A |
| Unified 1 nvidia openrouter | 4 | final | 09:41:04 | 09:42:29 | 85.79 | 14 | 8 | - | - | N/A | N/A | N/A | N/A | N/A | N/A |
| Cascaded 1 nvidia openrouter | 1 | snapshot | 14:31:42 | 14:32:29 | 47.28 | 2 | 1 | - | - | N/A | N/A | N/A | N/A | N/A | N/A |
| Cascaded 1 nvidia openrouter | 2 | snapshot | 14:32:59 | 14:34:23 | 83.82 | 5 | 2 | - | - | N/A | N/A | N/A | N/A | N/A | N/A |
| Cascaded 1 nvidia openrouter | 3 | snapshot | 14:37:48 | 14:39:42 | 113.18 | 12 | 6 | - | - | N/A | N/A | N/A | N/A | N/A | N/A |

## 7. Interpretation Notes

- `TTFP` is measured from speech start to first partial user transcription output.
- `TTFR` is measured from detected user turn end to first audible agent response, with first model output used only as a fallback when audio-start is unavailable.
- `E2E` is measured from speech start to completed agent response playback.
- `ASR`, `LLM`, `TTS start`, and `Playback` break the full response path into stage-level timings to show where latency accumulates.
- `Contradiction rate` is a heuristic count of assistant replies that appear to reverse earlier assistant statements. The script compares each assistant turn against the previous assistant turn and flags a contradiction only when three conditions are met: the earlier turn contains an affirmative cue such as `confirmed`, `approved`, or `received`; the later turn contains a negative cue such as `not`, `denied`, `missing`, or `rejected`; and both turns share at least one extracted entity such as a date, case-like identifier, or other matched entity token. The reported rate is `flagged contradictions / total assistant turns`. Because this rule is lexical and entity-based, it should be paired with manual review in thesis reporting.
- `Expected entity coverage` is available when each session includes `expectedEntities`.
- `Memory timestamp alignment` checks whether semantic-memory progression logs point to real transcript timestamps.
- `Semantic memory processing` is stored in milliseconds but shown in seconds in this report for readability.
- `Memory Run Metrics` records total duration from the start of the Inngest memory-update function to completion of semantic-memory parsing. It does not include call-agent startup time and historically did not include the final Convex save. New runs also include stage-level timings so long final updates can be attributed to model generation, fetch, parse, or save.

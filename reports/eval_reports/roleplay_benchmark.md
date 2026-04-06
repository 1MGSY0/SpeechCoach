# Offline Cascade Roleplay Benchmark

- Generated: `2026-04-06T11:32:45.796018+00:00`
- Scenario: Linda prison visit slot-booking roleplay
- Pipeline: CLI offline cascade using `src` ASR, LLM, and TTS components

## Speech Timing Summary

| Metric | Unit | Value |
| --- | --- | --- |
| TTFR | ms | 0.00 |
| E2E | ms | 0.00 |
| LLM | ms | 0.00 |

## Conversation Quality Summary

| Metric | Unit | Value |
| --- | --- | --- |
| Contradiction rate | ratio | 0.000 |
| Progression logs | count | 5 |
| Repetition flags | count | 1 |
| Alternation errors | count | 0 |

## Per-Turn Timing

| Turn | Source | TTFR ms | E2E ms | LLM ms |
| --- | --- | --- | --- | --- |
| 1 | offline_cascade_text | 0.00 | 0.00 | 0.00 |
| 2 | offline_cascade_text | 0.00 | 0.00 | 0.00 |

## Transcript For Manual Review

| Timestamp | Speaker | Text |
| --- | --- | --- |
| 0:00:00 | Officer | Linda, I understand that you are worried about Jason. I need you to lower your voice so I can check what help is available. |
| 0:00:00 | Linda | Fine, but I want that meeting slot confirmed now. I need to know Jason is safe. |
| 0:00:00 | Officer | I cannot give a medical update at the counter, but I can help you book the correct consultation slot for a proper update. |
| 0:00:00 | Linda | Fine, but I want that meeting slot confirmed now. I need to know Jason is safe. |

## Repetition Flags

| Turn | Similarity | Reply |
| --- | --- | --- |
| 2 | 1.000 | Fine, but I want that meeting slot confirmed now. I need to know Jason is safe. |

## Contradiction Flags

No heuristic contradiction flags were detected.

## Metric Notes

- `TTFP` is available for WAV input and uses offline ASR completion as a proxy because this CLI path does not expose streaming partial transcripts.
- `TTFR` measures from user turn completion to first playable Linda response. In this offline cascade, the response becomes playable after LLM generation and TTS synthesis.
- `E2E` measures from user turn start to the estimated end of Linda's generated audio response.
- `TTS start` is the time from first model output to the first generated audio becoming available. In this non-streaming cascade it can include remaining model generation plus TTS synthesis.
- `Playback` is the generated Linda audio duration, so a long `E2E` may reflect a long spoken response rather than processing delay.
- `Repetition flags` use Jaccard token overlap between consecutive Linda replies. They are intended to guide manual review, not to replace human judgement.

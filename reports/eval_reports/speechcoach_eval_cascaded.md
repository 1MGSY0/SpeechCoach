# SpeechCoach Evaluation Report

- Generated: 2026-04-06 20:57 UTC
- Input file: `reports/fyp-data/eval.md`
- Sessions evaluated: 2

## 1. What Was Evaluated

- Speech layer: timing, transcript fidelity, utterance length, and turn alternation integrity.
- Conversation layer: continuity between user context and assistant replies, contradiction proxy rate, expected entity carryover, and semantic-memory alignment.

## 2. Speech Layer Summary

| Metric | Unit | Mean | Median | P95 | Min | Max |
| --- | --- | --- | --- | --- | --- | --- |
| TTFP | ms | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| TTFR | ms | 1204.99 | 1204.99 | 1239.31 | 1170.67 | 1239.31 |
| E2E | ms | 8770.73 | 8770.73 | 11118.36 | 6423.09 | 11118.36 |
| ASR | ms | 5415.91 | 5415.91 | 6353.64 | 4478.18 | 6353.64 |
| LLM | ms | 1140.63 | 1140.63 | 1184.77 | 1096.50 | 1184.77 |
| TTS start | ms | 64.36 | 64.36 | 74.17 | 54.54 | 74.17 |
| Playback | ms | 2095.73 | 2095.73 | 3591.92 | 599.54 | 3591.92 |
| Avg user utterance length | words | 5.89 | 5.89 | 6.36 | 5.42 | 6.36 |

## 3. Conversation Layer Summary

| Metric | Unit | Mean | Median | P95 | Min | Max |
| --- | --- | --- | --- | --- | --- | --- |
| Contradiction rate | ratio | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| Memory timestamp alignment | ratio | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| Progression logs per session | count | 22.00 | 22.00 | 22.00 | 22.00 | 22.00 |
| Semantic memory processing | s | 1.44 | 1.44 | 2.05 | 0.83 | 2.05 |

## 4. Session-Level Results

| Session | Persona | User turns | Assistant turns | Duration (s) | TTFP ms | TTFR ms | E2E ms | ASR ms | LLM ms | TTS start ms | Playback ms | Contradiction rate | Progression logs | Memory avg s | Alternation errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cascaded 3 | Aisha | 11 | 11 | 246.00 | 0.00 | 1170.67 | 11118.36 | 6353.64 | 1096.50 | 74.17 | 3591.92 | 0.000 | 22 | 2.05 | 0 |
| Cascaded 4 | Sofia | 12 | 12 | 263.00 | 0.00 | 1239.31 | 6423.09 | 4478.18 | 1184.77 | 54.54 | 599.54 | 0.000 | 22 | 0.83 | 0 |

## 5. Speech Turn Metrics

| Session | Turn | Source | TTFP ms | TTFR ms | E2E ms | ASR ms | LLM ms | TTS start ms | Playback ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cascaded 3 | 1 | pipeline | 0.00 | 1664.00 | 7210.00 | 900.00 | 1596.00 | 68.00 | 4646.00 |
| Cascaded 3 | 2 | pipeline | 0.00 | 1257.00 | 6822.00 | 740.00 | 1117.00 | 140.00 | 4825.00 |
| Cascaded 3 | 3 | pipeline | 0.00 | 1196.00 | 9327.00 | 2650.00 | 1160.00 | 36.00 | 5481.00 |
| Cascaded 3 | 4 | pipeline | 0.00 | 839.00 | 24366.00 | 17652.00 | 659.00 | 180.00 | 5875.00 |
| Cascaded 3 | 5 | pipeline | 0.00 | 760.00 | 3125.00 | 2393.00 | 643.00 | 117.00 | 0.00 |
| Cascaded 3 | 6 | pipeline | 0.00 | 12.00 | 12.00 | 0.00 | 12.00 | 0.00 | 0.00 |
| Cascaded 3 | 7 | pipeline | N/A | 1018.00 | N/A | N/A | 990.00 | 28.00 | 3693.00 |
| Cascaded 3 | 8 | pipeline | 0.00 | 1768.00 | 21023.00 | 16429.00 | 1705.00 | 63.00 | 2826.00 |
| Cascaded 3 | 9 | pipeline | 0.00 | 1818.00 | 5202.00 | 2253.00 | 1764.00 | 54.00 | 1131.00 |
| Cascaded 3 | 10 | pipeline | 0.00 | 851.00 | 7168.00 | 1075.00 | 723.00 | 128.00 | 5242.00 |
| Cascaded 3 | 11 | pipeline | 0.00 | 1678.00 | 17419.00 | 11085.00 | 1640.00 | 38.00 | 4656.00 |
| Cascaded 3 | 12 | pipeline | 0.00 | 1187.00 | 20628.00 | 14713.00 | 1149.00 | 38.00 | 4728.00 |
| Cascaded 4 | 1 | pipeline | 0.00 | 1704.00 | 3536.00 | 1155.00 | 1667.00 | 37.00 | 677.00 |
| Cascaded 4 | 2 | pipeline | 0.00 | 1097.00 | 1750.00 | 144.00 | 1057.00 | 40.00 | 509.00 |
| Cascaded 4 | 3 | pipeline | 0.00 | 697.00 | 2539.00 | 1322.00 | 665.00 | 32.00 | 520.00 |
| Cascaded 4 | 4 | pipeline | 0.00 | 1210.00 | 3691.00 | 1740.00 | 1056.00 | 154.00 | 741.00 |
| Cascaded 4 | 5 | pipeline | 0.00 | 1211.00 | 11147.00 | 9193.00 | 1089.00 | 122.00 | 743.00 |
| Cascaded 4 | 6 | pipeline | 0.00 | 1155.00 | 10950.00 | 9127.00 | 1049.00 | 106.00 | 668.00 |
| Cascaded 4 | 7 | pipeline | 0.00 | 1422.00 | 6418.00 | 5030.00 | 1384.00 | 38.00 | 0.00 |
| Cascaded 4 | 8 | pipeline | N/A | 155.00 | N/A | N/A | 155.00 | 0.00 | 153.00 |
| Cascaded 4 | 9 | pipeline | N/A | 1722.00 | N/A | N/A | 1685.00 | 37.00 | 405.00 |
| Cascaded 4 | 10 | pipeline | 0.00 | 1128.00 | 2761.00 | 1675.00 | 1086.00 | 42.00 | 0.00 |
| Cascaded 4 | 11 | pipeline | 0.00 | 1435.00 | 20260.00 | 18378.00 | 1404.00 | 31.00 | 447.00 |
| Cascaded 4 | 12 | pipeline | 0.00 | 1901.00 | 4695.00 | 594.00 | 1868.00 | 33.00 | 2200.00 |
| Cascaded 4 | 13 | pipeline | 0.00 | 1274.00 | 2907.00 | 902.00 | 1237.00 | 37.00 | 731.00 |

## 6. Memory Run Metrics

| Session | Run | Trigger | Started | Completed | Duration s | Turn count | Progression logs | Prompt chars | Output chars | Fetch s | Transcript parse s | Rubric fetch s | Model s | Memory parse s | Save s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cascaded 3 | 1 | snapshot | 20:14:57 | 20:14:57 | 0.51 | 1 | 1 | 3919 | 552 | 0.01 | 0.00 | 0.01 | 0.48 | 0.00 | N/A |
| Cascaded 3 | 2 | snapshot | 20:14:59 | 20:15:00 | 0.75 | 2 | 2 | 4644 | 1022 | 0.00 | 0.00 | 0.01 | 0.73 | 0.00 | N/A |
| Cascaded 3 | 3 | snapshot | 20:15:19 | 20:15:20 | 1.06 | 4 | 3 | 5302 | 1405 | 0.01 | 0.00 | 0.01 | 1.04 | 0.00 | N/A |
| Cascaded 3 | 4 | snapshot | 20:15:40 | 20:15:41 | 1.43 | 5 | 4 | 5740 | 1741 | 0.01 | 0.00 | 0.01 | 1.41 | 0.00 | N/A |
| Cascaded 3 | 5 | snapshot | 20:15:42 | 20:15:43 | 1.55 | 6 | 5 | 6279 | 2261 | 0.01 | 0.00 | 0.01 | 1.53 | 0.00 | N/A |
| Cascaded 3 | 6 | snapshot | 20:16:23 | 20:16:25 | 1.68 | 8 | 6 | 7139 | 2686 | 0.00 | 0.00 | 0.01 | 1.67 | 0.00 | N/A |
| Cascaded 3 | 7 | snapshot | 20:16:46 | 20:16:49 | 2.76 | 9 | 7 | 7586 | 3078 | 0.01 | 0.00 | 0.02 | 2.73 | 0.00 | N/A |
| Cascaded 3 | 8 | snapshot | 20:16:56 | 20:16:59 | 2.45 | 12 | 9 | 8403 | 3709 | 0.01 | 0.00 | 0.01 | 2.43 | 0.00 | N/A |
| Cascaded 3 | 9 | snapshot | 20:17:30 | 20:17:32 | 2.53 | 14 | 10 | 9316 | 4275 | 0.00 | 0.00 | 0.01 | 2.52 | 0.00 | N/A |
| Cascaded 3 | 10 | snapshot | 20:17:46 | 20:17:49 | 2.86 | 16 | 12 | 9959 | 4977 | 0.00 | 0.00 | 0.01 | 2.84 | 0.00 | N/A |
| Cascaded 3 | 11 | snapshot | 20:17:59 | 20:18:03 | 3.40 | 18 | 13 | 10895 | 5331 | 0.01 | 0.00 | 0.01 | 3.37 | 0.01 | N/A |
| Cascaded 3 | 12 | snapshot | 20:18:32 | 20:18:36 | 3.27 | 20 | 14 | 11497 | 5595 | 0.01 | 0.00 | 0.01 | 3.25 | 0.00 | N/A |
| Cascaded 3 | 13 | snapshot | 20:19:04 | 20:19:06 | 2.38 | 22 | 22 | 12046 | 3955 | 0.00 | 0.00 | 0.01 | 2.37 | 0.00 | N/A |
| Cascaded 4 | 1 | snapshot | 20:46:41 | 20:46:41 | 0.60 | 1 | 1 | 3969 | 692 | 0.01 | 0.00 | 0.01 | 0.57 | 0.00 | N/A |
| Cascaded 4 | 2 | snapshot | 20:46:42 | 20:46:43 | 0.54 | 2 | 2 | 4707 | 672 | 0.01 | 0.00 | 0.01 | 0.52 | 0.00 | N/A |
| Cascaded 4 | 3 | snapshot | 20:47:11 | 20:47:11 | 0.61 | 3 | 3 | 4958 | 712 | 0.01 | 0.00 | 0.01 | 0.59 | 0.00 | N/A |
| Cascaded 4 | 4 | snapshot | 20:47:12 | 20:47:12 | 0.57 | 4 | 4 | 5337 | 711 | 0.01 | 0.00 | 0.01 | 0.56 | 0.00 | N/A |
| Cascaded 4 | 5 | snapshot | 20:47:52 | 20:47:53 | 0.61 | 6 | 5 | 5754 | 748 | 0.01 | 0.00 | 0.01 | 0.60 | 0.00 | N/A |
| Cascaded 4 | 6 | snapshot | 20:48:12 | 20:48:12 | 0.66 | 7 | 6 | 6147 | 753 | 0.01 | 0.00 | 0.01 | 0.64 | 0.00 | N/A |
| Cascaded 4 | 7 | snapshot | 20:48:13 | 20:48:14 | 1.02 | 8 | 7 | 6670 | 808 | 0.01 | 0.00 | 0.01 | 1.00 | 0.00 | N/A |
| Cascaded 4 | 8 | snapshot | 20:48:41 | 20:48:42 | 0.65 | 9 | 8 | 7184 | 829 | 0.01 | 0.00 | 0.01 | 0.63 | 0.00 | N/A |
| Cascaded 4 | 9 | snapshot | 20:48:42 | 20:48:43 | 0.66 | 10 | 9 | 7736 | 915 | 0.01 | 0.00 | 0.01 | 0.64 | 0.00 | N/A |
| Cascaded 4 | 10 | snapshot | 20:49:10 | 20:49:10 | 0.82 | 11 | 10 | 8266 | 969 | 0.01 | 0.00 | 0.01 | 0.80 | 0.00 | N/A |
| Cascaded 4 | 11 | snapshot | 20:49:11 | 20:49:12 | 1.02 | 12 | 11 | 8929 | 1041 | 0.01 | 0.00 | 0.01 | 1.00 | 0.00 | N/A |
| Cascaded 4 | 12 | snapshot | 20:49:33 | 20:49:33 | 0.72 | 13 | 12 | 9418 | 941 | 0.01 | 0.00 | 0.01 | 0.69 | 0.01 | N/A |
| Cascaded 4 | 13 | snapshot | 20:49:34 | 20:49:35 | 0.87 | 14 | 13 | 9949 | 1032 | 0.01 | 0.00 | 0.01 | 0.85 | 0.00 | N/A |
| Cascaded 4 | 14 | snapshot | 20:49:37 | 20:49:38 | 0.71 | 15 | 14 | 10415 | 974 | 0.01 | 0.01 | 0.01 | 0.69 | 0.00 | N/A |
| Cascaded 4 | 15 | snapshot | 20:49:39 | 20:49:40 | 0.73 | 16 | 15 | 10799 | 1020 | 0.01 | 0.00 | 0.01 | 0.71 | 0.00 | N/A |
| Cascaded 4 | 16 | snapshot | 20:49:58 | 20:49:59 | 0.75 | 17 | 16 | 11239 | 974 | 0.01 | 0.00 | 0.01 | 0.71 | 0.00 | N/A |
| Cascaded 4 | 17 | snapshot | 20:49:59 | 20:50:00 | 0.78 | 18 | 17 | 11768 | 1095 | 0.00 | 0.00 | 0.01 | 0.76 | 0.00 | N/A |
| Cascaded 4 | 18 | snapshot | 20:50:18 | 20:50:19 | 0.88 | 19 | 18 | 12311 | 1182 | 0.00 | 0.00 | 0.01 | 0.86 | 0.00 | N/A |
| Cascaded 4 | 19 | snapshot | 20:50:19 | 20:50:20 | 0.85 | 20 | 18 | 12855 | 1147 | 0.01 | 0.00 | 0.01 | 0.82 | 0.00 | N/A |
| Cascaded 4 | 20 | snapshot | 20:50:32 | 20:50:33 | 0.81 | 21 | 19 | 12897 | 1077 | 0.00 | 0.00 | 0.01 | 0.78 | 0.01 | N/A |
| Cascaded 4 | 21 | snapshot | 20:50:34 | 20:50:35 | 0.76 | 22 | 20 | 13285 | 1106 | 0.01 | 0.00 | 0.01 | 0.74 | 0.00 | N/A |
| Cascaded 4 | 22 | snapshot | 20:51:04 | 20:51:07 | 2.58 | 24 | 22 | 13912 | 1507 | 0.01 | 0.00 | 0.01 | 2.55 | 0.00 | N/A |

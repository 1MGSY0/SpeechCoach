import argparse
import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean, median


WORD_RE = re.compile(r"[a-z0-9']+")
ENTITY_RE = re.compile(
    r"\b(?:[A-Z]{1,4}[- ]?[A-Z]?\d{3,}|"
    r"\d{4}-\d{2}-\d{2}|"
    r"jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
    r"jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|"
    r"\d{1,2}(?:st|nd|rd|th)?)\b",
    re.IGNORECASE,
)
NEGATION_RE = re.compile(
    r"\b(?:no|not|never|denied|cannot|can't|missing|incorrect|failed|rejected)\b",
    re.IGNORECASE,
)
AFFIRM_RE = re.compile(
    r"\b(?:yes|correct|confirmed|uploaded|submitted|approved|received|completed)\b",
    re.IGNORECASE,
)


def normalize_ws(value: str | None) -> str:
    return " ".join((value or "").split())


def parse_json_file(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_sessions(path: Path) -> list[dict]:
    data = parse_json_file(path)
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    if isinstance(data, dict):
        if isinstance(data.get("sessions"), list):
            return [item for item in data["sessions"] if isinstance(item, dict)]
        return [data]
    return []


def parse_transcript(value) -> list[dict]:
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return []
    if not isinstance(value, list):
        return []
    rows = []
    for item in value:
        if not isinstance(item, dict):
            continue
        speaker = item.get("speaker")
        text = item.get("text")
        timestamp = item.get("timestamp")
        if isinstance(speaker, str) and isinstance(text, str) and isinstance(timestamp, str):
            rows.append(
                {
                    "speaker": speaker.strip(),
                    "text": normalize_ws(text),
                    "timestamp": timestamp.strip(),
                }
            )
    return rows


def parse_memory(value) -> dict | None:
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return None
    if not isinstance(value, dict):
        return None
    return value


def timestamp_to_seconds(value: str | None) -> float | None:
    if not value:
        return None
    parts = value.strip().split(":")
    try:
        if len(parts) == 3:
            h, m, s = parts
            return int(h) * 3600 + int(m) * 60 + float(s)
        if len(parts) == 2:
            m, s = parts
            return int(m) * 60 + float(s)
    except ValueError:
        return None
    return None


def tokenize(text: str | None) -> set[str]:
    return {token for token in WORD_RE.findall((text or "").lower()) if len(token) > 2}


def jaccard(a: str | None, b: str | None) -> float:
    ta = tokenize(a)
    tb = tokenize(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def extract_entities(text: str | None) -> set[str]:
    return {match.group(0).lower() for match in ENTITY_RE.finditer(text or "")}


def contains_expected_entity(observed_entities: set[str], observed_text: str, expected: str) -> bool:
    target = normalize_ws(expected).lower()
    if not target:
        return False
    target_tokens = tokenize(target)
    if target in normalize_ws(observed_text).lower():
        return True
    for observed in observed_entities:
        observed_normalized = normalize_ws(observed).lower()
        if target == observed_normalized:
            return True
        if target in observed_normalized or observed_normalized in target:
            return True
        if target_tokens and target_tokens.issubset(tokenize(observed_normalized)):
            return True
    return False


def contradiction_proxy(previous_assistant: str | None, current_assistant: str | None) -> bool:
    prev = normalize_ws(previous_assistant)
    curr = normalize_ws(current_assistant)
    if not prev or not curr:
        return False
    return (
        bool(AFFIRM_RE.search(prev))
        and bool(NEGATION_RE.search(curr))
        and len(extract_entities(prev) & extract_entities(curr)) > 0
    )


def numeric_stats(values: list[float]) -> dict[str, str]:
    clean = [float(v) for v in values if isinstance(v, (int, float))]
    if not clean:
        return {"mean": "N/A", "median": "N/A", "p95": "N/A", "min": "N/A", "max": "N/A"}
    ordered = sorted(clean)
    p95_index = max(0, math.ceil(len(ordered) * 0.95) - 1)
    return {
        "mean": f"{mean(clean):.2f}",
        "median": f"{median(clean):.2f}",
        "p95": f"{ordered[p95_index]:.2f}",
        "min": f"{ordered[0]:.2f}",
        "max": f"{ordered[-1]:.2f}",
    }


def numeric_values(metrics: list[dict], key: str) -> list[float]:
    return [float(item[key]) for item in metrics if isinstance(item.get(key), (int, float))]


def safe_metric(value, digits: int = 2) -> str:
    if isinstance(value, (int, float)):
        return f"{float(value):.{digits}f}"
    return "N/A"


def safe_ms_to_seconds(value, digits: int = 2) -> str:
    if isinstance(value, (int, float)):
        return f"{float(value) / 1000:.{digits}f}"
    return "N/A"


def safe_iso_time(value) -> str:
    if not isinstance(value, str) or not value:
        return "-"
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).strftime("%H:%M:%S")
    except ValueError:
        return value


def parse_reference_user_turns(value) -> list[str]:
    turns = parse_transcript(value)
    if turns:
        return [turn["text"] for turn in turns if turn["speaker"].lower() == "user"]
    if isinstance(value, list):
        return [normalize_ws(item) for item in value if isinstance(item, str)]
    return []


def format_table(headers: list[str], rows: list[list[str]]) -> str:
    line1 = "| " + " | ".join(headers) + " |"
    line2 = "| " + " | ".join(["---"] * len(headers)) + " |"
    body = ["| " + " | ".join(row) + " |" for row in rows]
    return "\n".join([line1, line2, *body])


def filter_empty_columns(headers: list[str], rows: list[list[str]], always_keep: set[int]) -> tuple[list[str], list[list[str]]]:
    if not rows:
        return headers, rows
    keep_indexes: list[int] = []
    for index, header in enumerate(headers):
        if index in always_keep:
            keep_indexes.append(index)
            continue
        if any(index < len(row) and row[index] != "N/A" for row in rows):
            keep_indexes.append(index)
    filtered_headers = [headers[index] for index in keep_indexes]
    filtered_rows = [[row[index] for index in keep_indexes] for row in rows]
    return filtered_headers, filtered_rows


def build_turn_metric_rows(metrics: list[dict]) -> list[list[str]]:
    rows: list[list[str]] = []
    for item in metrics:
        speech_metrics = item.get("speech_metrics_raw") or {}
        turns = speech_metrics.get("turns") if isinstance(speech_metrics, dict) else []
        if not isinstance(turns, list):
            continue
        for turn in turns:
            if not isinstance(turn, dict):
                continue
            rows.append(
                [
                    item["name"],
                    str(turn.get("turnIndex") if turn.get("turnIndex") is not None else "-"),
                    str(turn.get("source") or "-"),
                    safe_metric(turn.get("ttfpMs")),
                    safe_metric(turn.get("ttfrMs")),
                    safe_metric(turn.get("e2eMs")),
                    safe_metric(turn.get("asrMs")),
                    safe_metric(turn.get("llmMs")),
                    safe_metric(turn.get("ttsMs")),
                    safe_metric(turn.get("playbackMs")),
                ]
            )
    return rows


def build_memory_run_rows(metrics: list[dict]) -> list[list[str]]:
    rows: list[list[str]] = []
    for item in metrics:
        memory_metrics = item.get("memory_metrics_raw") or {}
        runs = memory_metrics.get("runs") if isinstance(memory_metrics, dict) else []
        if not isinstance(runs, list):
            continue
        for index, run in enumerate(runs, start=1):
            if not isinstance(run, dict):
                continue
            rows.append(
                [
                    item["name"],
                    str(index),
                    str(run.get("trigger") or "-"),
                    safe_iso_time(run.get("startedAt")),
                    safe_iso_time(run.get("completedAt")),
                    safe_metric(run.get("durationMs")),
                    str(run.get("turnCount") if run.get("turnCount") is not None else "-"),
                    str(
                        run.get("progressionLogs")
                        if run.get("progressionLogs") is not None
                        else "-"
                    ),
                    str(
                        run.get("promptInputChars")
                        if run.get("promptInputChars") is not None
                        else "-"
                    ),
                    str(
                        run.get("memoryOutputChars")
                        if run.get("memoryOutputChars") is not None
                        else "-"
                    ),
                    safe_ms_to_seconds(
                        (run.get("stageDurationsMs") or {}).get("fetch-conversation")
                    ),
                    safe_ms_to_seconds(
                        (run.get("stageDurationsMs") or {}).get("parse-transcript")
                    ),
                    safe_ms_to_seconds(
                        (run.get("stageDurationsMs") or {}).get("fetch-rubric-structure")
                    ),
                    safe_ms_to_seconds(
                        (run.get("stageDurationsMs") or {}).get("generate-semantic-memory")
                    ),
                    safe_ms_to_seconds(
                        (run.get("stageDurationsMs") or {}).get("parse-semantic-memory")
                    ),
                    safe_ms_to_seconds(
                        (run.get("stageDurationsMs") or {}).get("save-semantic-memory")
                    ),
                ]
            )
    return rows


def build_session_metrics(session: dict) -> dict:
    transcript = parse_transcript(session.get("transcriptText") or session.get("transcript"))
    memory = parse_memory(session.get("summary") or session.get("memoryJson") or session.get("memory"))
    reference_user_turns = parse_reference_user_turns(
        session.get("referenceTranscriptText") or session.get("referenceUserTurns")
    )

    user_turns = [turn for turn in transcript if turn["speaker"].lower() == "user"]
    assistant_turns = [turn for turn in transcript if turn["speaker"].lower() != "user"]

    duration_seconds = 0.0
    if transcript:
        start = timestamp_to_seconds(transcript[0]["timestamp"])
        end = timestamp_to_seconds(transcript[-1]["timestamp"])
        if start is not None and end is not None:
            duration_seconds = max(0.0, end - start)

    # Speech layer
    user_word_counts = [len(tokenize(turn["text"])) for turn in user_turns]
    alternation_errors = 0
    for index in range(1, len(transcript)):
        if transcript[index]["speaker"].lower() == transcript[index - 1]["speaker"].lower():
            alternation_errors += 1

    asr_fidelity_scores: list[float] = []
    if reference_user_turns and user_turns:
        for idx, user_turn in enumerate(user_turns):
            ref = reference_user_turns[idx] if idx < len(reference_user_turns) else ""
            asr_fidelity_scores.append(jaccard(ref, user_turn["text"]))

    # Conversation layer
    assistant_carryover_scores: list[float] = []
    contradiction_count = 0
    previous_context = ""
    previous_assistant_text = ""
    assistant_entities = set()
    assistant_corpus_parts: list[str] = []
    for turn in transcript:
        if turn["speaker"].lower() == "user":
            previous_context = (previous_context + " " + turn["text"]).strip()
            continue
        assistant_carryover_scores.append(jaccard(previous_context, turn["text"]))
        assistant_entities.update(extract_entities(turn["text"]))
        assistant_corpus_parts.append(turn["text"])
        if contradiction_proxy(previous_assistant_text, turn["text"]):
            contradiction_count += 1
        previous_assistant_text = turn["text"]

    expected_entities = [normalize_ws(item).lower() for item in session.get("expectedEntities", []) if isinstance(item, str)]
    entity_coverage = None
    if expected_entities:
        assistant_corpus = " ".join(assistant_corpus_parts)
        matched = sum(
            1 for item in expected_entities if contains_expected_entity(assistant_entities, assistant_corpus, item)
        )
        entity_coverage = matched / len(expected_entities)

    progression_logs = []
    extracted_entities = []
    memory_turn_coverage = None
    if memory:
        progression_logs = memory.get("progressionReason") if isinstance(memory.get("progressionReason"), list) else []
        extracted_entities = memory.get("extractedEntities") if isinstance(memory.get("extractedEntities"), list) else []
        transcript_timestamps = {turn["timestamp"] for turn in transcript}
        if progression_logs:
            aligned = 0
            for item in progression_logs:
                if isinstance(item, dict) and item.get("timestamp") in transcript_timestamps:
                    aligned += 1
            memory_turn_coverage = aligned / len(progression_logs)

    speech_metrics = session.get("speechMetrics") if isinstance(session.get("speechMetrics"), dict) else {}
    speech_summary = speech_metrics.get("summary") if isinstance(speech_metrics.get("summary"), dict) else {}
    memory_metrics = session.get("memoryMetrics") if isinstance(session.get("memoryMetrics"), dict) else {}
    memory_summary = memory_metrics.get("summary") if isinstance(memory_metrics.get("summary"), dict) else {}

    def metric_value(primary_key: str, fallback_key: str):
        if isinstance(speech_metrics.get(primary_key), (int, float)):
            return speech_metrics.get(primary_key)
        if isinstance(speech_summary.get(fallback_key), (int, float)):
            return speech_summary.get(fallback_key)
        return None

    return {
        "name": normalize_ws(session.get("conversationName") or session.get("name") or "Unnamed session"),
        "persona_name": normalize_ws(session.get("personaName") or ""),
        "transcript": transcript,
        "duration_seconds": duration_seconds,
        "user_turns": len(user_turns),
        "assistant_turns": len(assistant_turns),
        "avg_user_words": mean(user_word_counts) if user_word_counts else None,
        "alternation_errors": alternation_errors,
        "asr_fidelity": mean(asr_fidelity_scores) if asr_fidelity_scores else None,
        "ttfp_ms": metric_value("ttfpMs", "ttfpMsMean"),
        "ttfr_ms": metric_value("ttfrMs", "ttfrMsMean"),
        "e2e_ms": metric_value("e2eMs", "e2eMsMean"),
        "asr_ms": metric_value("asrMs", "asrMsMean"),
        "llm_ms": metric_value("llmMs", "llmMsMean"),
        "tts_ms": metric_value("ttsMs", "ttsMsMean"),
        "playback_ms": metric_value("playbackMs", "playbackMsMean"),
        "assistant_carryover": mean(assistant_carryover_scores) if assistant_carryover_scores else None,
        "contradiction_rate": (contradiction_count / len(assistant_turns)) if assistant_turns else 0.0,
        "expected_entity_coverage": entity_coverage,
        "memory_progression_logs": len(progression_logs),
        "memory_entity_count": len([item for item in extracted_entities if isinstance(item, str) and item.strip()]),
        "memory_turn_coverage": memory_turn_coverage,
        "memory_processing_avg_ms": memory_summary.get("averageDurationMs"),
        "memory_processing_last_ms": memory_summary.get("lastDurationMs"),
        "memory_processing_runs": memory_summary.get("runCount"),
        "speech_metrics_raw": speech_metrics,
        "memory_metrics_raw": memory_metrics,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to a SpeechCoach evaluation JSON file.")
    parser.add_argument("--title", default="SpeechCoach Evaluation Report")
    parser.add_argument("--out_md", default="logs/eval_reports/speechcoach_eval.md")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.out_md)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    sessions = load_sessions(input_path)
    metrics = [build_session_metrics(session) for session in sessions]
    single_session = len(metrics) == 1

    speech_metric_defs = [
        ("TTFP", "ms", "ttfp_ms"),
        ("TTFR", "ms", "ttfr_ms"),
        ("E2E", "ms", "e2e_ms"),
        ("ASR", "ms", "asr_ms"),
        ("LLM", "ms", "llm_ms"),
        ("TTS start", "ms", "tts_ms"),
        ("Playback", "ms", "playback_ms"),
        ("Avg user utterance length", "words", "avg_user_words"),
    ]

    conversation_metric_defs = [
        ("Contradiction rate", "ratio", "contradiction_rate"),
        ("Expected entity coverage", "ratio", "expected_entity_coverage"),
        ("Memory timestamp alignment", "ratio", "memory_turn_coverage"),
        ("Progression logs per session", "count", "memory_progression_logs"),
        ("Semantic memory processing", "s", "memory_processing_avg_ms"),
    ]

    if single_session:
        speech_summary_rows = []
        for label, unit, key in speech_metric_defs:
            value = metrics[0].get(key)
            if key == "memory_processing_avg_ms":
                continue
            if not isinstance(value, (int, float)):
                continue
            digits = 3 if unit in {"Jaccard", "ratio"} else 2
            speech_summary_rows.append([label, unit, safe_metric(value, digits)])

        conversation_summary_rows = []
        for label, unit, key in conversation_metric_defs:
            value = metrics[0].get(key)
            if key == "memory_processing_avg_ms":
                if not isinstance(value, (int, float)):
                    continue
                conversation_summary_rows.append([label, unit, safe_ms_to_seconds(value)])
                continue
            if not isinstance(value, (int, float)):
                continue
            digits = 3 if unit in {"Jaccard", "ratio"} else 2
            conversation_summary_rows.append([label, unit, safe_metric(value, digits)])
    else:
        speech_summary_rows = []
        for label, unit, key in speech_metric_defs:
            values = numeric_values(metrics, key)
            if not values:
                continue
            speech_summary_rows.append([label, unit, *numeric_stats(values).values()])

        conversation_summary_rows = []
        for label, unit, key in conversation_metric_defs:
            if key == "memory_processing_avg_ms":
                values = [
                    float(item["memory_processing_avg_ms"]) / 1000
                    for item in metrics
                    if isinstance(item.get("memory_processing_avg_ms"), (int, float))
                ]
            else:
                values = numeric_values(metrics, key)
            if not values:
                continue
            conversation_summary_rows.append([label, unit, *numeric_stats(values).values()])

    session_rows = []
    for item in metrics:
        session_rows.append(
            [
                item["name"],
                item["persona_name"] or "-",
                str(item["user_turns"]),
                str(item["assistant_turns"]),
                safe_metric(item["duration_seconds"]),
                safe_metric(item["ttfp_ms"]),
                safe_metric(item["ttfr_ms"]),
                safe_metric(item["e2e_ms"]),
                safe_metric(item["asr_ms"]),
                safe_metric(item["llm_ms"]),
                safe_metric(item["tts_ms"]),
                safe_metric(item["playback_ms"]),
                safe_metric(item["contradiction_rate"], 3),
                safe_metric(item["expected_entity_coverage"], 3),
                str(item["memory_progression_logs"]),
                safe_ms_to_seconds(item["memory_processing_avg_ms"]),
                str(item["alternation_errors"]),
            ]
        )

    speech_turn_rows = build_turn_metric_rows(metrics)
    memory_run_rows = build_memory_run_rows(metrics)

    session_headers = [
        "Session",
        "Persona",
        "User turns",
        "Assistant turns",
        "Duration (s)",
        "TTFP ms",
        "TTFR ms",
        "E2E ms",
        "ASR ms",
        "LLM ms",
        "TTS start ms",
        "Playback ms",
        "Contradiction rate",
        "Entity coverage",
        "Progression logs",
        "Memory avg s",
        "Alternation errors",
    ]
    session_headers, session_rows = filter_empty_columns(
        session_headers,
        session_rows,
        always_keep={0, 1, 2, 3, 4, 5, 6, 7, 14, 15, 16},
    )

    speech_turn_headers = [
        "Session",
        "Turn",
        "Source",
        "TTFP ms",
        "TTFR ms",
        "E2E ms",
        "ASR ms",
        "LLM ms",
        "TTS start ms",
        "Playback ms",
    ]
    speech_turn_headers, speech_turn_rows = filter_empty_columns(
        speech_turn_headers,
        speech_turn_rows,
        always_keep={0, 1, 2, 3, 4, 5},
    )

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    output = "\n".join(
        [
            f"# {args.title}",
            "",
            f"- Generated: {generated_at}",
            f"- Input file: `{input_path.as_posix()}`",
            f"- Sessions evaluated: {len(metrics)}",
            "",
            "## 1. What Was Evaluated",
            "",
            "- Speech layer: timing, transcript fidelity, utterance length, and turn alternation integrity.",
            "- Conversation layer: continuity between user context and assistant replies, contradiction proxy rate, expected entity carryover, and semantic-memory alignment.",
            "",
            "## 2. Speech Layer Summary",
            "",
            format_table(
                ["Metric", "Unit", "Value"] if single_session else ["Metric", "Unit", "Mean", "Median", "P95", "Min", "Max"],
                speech_summary_rows,
            ),
            "",
            "## 3. Conversation Layer Summary",
            "",
            format_table(
                ["Metric", "Unit", "Value"] if single_session else ["Metric", "Unit", "Mean", "Median", "P95", "Min", "Max"],
                conversation_summary_rows,
            ),
            "",
            "## 4. Session-Level Results",
            "",
            format_table(session_headers, session_rows),
            "",
            "## 5. Speech Turn Metrics",
            "",
            (
                format_table(speech_turn_headers, speech_turn_rows)
                if speech_turn_rows
                else "No per-turn speech metrics available."
            ),
            "",
            "## 6. Memory Run Metrics",
            "",
            (
                format_table(
                    [
                        "Session",
                        "Run",
                        "Trigger",
                        "Started",
                        "Completed",
                        "Duration s",
                        "Turn count",
                        "Progression logs",
                        "Prompt chars",
                        "Output chars",
                        "Fetch s",
                        "Transcript parse s",
                        "Rubric fetch s",
                        "Model s",
                        "Memory parse s",
                        "Save s",
                    ],
                    [
                        [
                            row[0],
                            row[1],
                            row[2],
                            row[3],
                            row[4],
                            safe_ms_to_seconds(float(row[5])) if row[5] != "N/A" else "N/A",
                            row[6],
                            row[7],
                            row[8],
                            row[9],
                            row[10],
                            row[11],
                            row[12],
                            row[13],
                            row[14],
                            row[15],
                        ]
                        for row in memory_run_rows
                    ],
                )
                if memory_run_rows
                else "No semantic-memory timing runs available."
            ),
            "",
            "## 7. Interpretation Notes",
            "",
            "- `TTFP` is measured from speech start to first partial user transcription output.",
            "- `TTFR` is measured from detected user turn end to first audible agent response, with first model output used only as a fallback when audio-start is unavailable.",
            "- `E2E` is measured from speech start to completed agent response playback.",
            "- `ASR`, `LLM`, `TTS start`, and `Playback` break the full response path into stage-level timings to show where latency accumulates.",
            "- `Contradiction rate` is a heuristic count of assistant replies that appear to reverse earlier assistant statements. The script compares each assistant turn against the previous assistant turn and flags a contradiction only when three conditions are met: the earlier turn contains an affirmative cue such as `confirmed`, `approved`, or `received`; the later turn contains a negative cue such as `not`, `denied`, `missing`, or `rejected`; and both turns share at least one extracted entity such as a date, case-like identifier, or other matched entity token. The reported rate is `flagged contradictions / total assistant turns`. Because this rule is lexical and entity-based, it should be paired with manual review in thesis reporting.",
            "- `Expected entity coverage` is available when each session includes `expectedEntities`.",
            "- `Memory timestamp alignment` checks whether semantic-memory progression logs point to real transcript timestamps.",
            "- `Semantic memory processing` is stored in milliseconds but shown in seconds in this report for readability.",
            "- `Memory Run Metrics` records total duration from the start of the Inngest memory-update function to completion of semantic-memory parsing. It does not include call-agent startup time and historically did not include the final Convex save. New runs also include stage-level timings so long final updates can be attributed to model generation, fetch, parse, or save.",
        ]
    )

    output_path.write_text(output + "\n", encoding="utf-8")
    print(f"Wrote SpeechCoach evaluation Markdown to {output_path}")


if __name__ == "__main__":
    main()

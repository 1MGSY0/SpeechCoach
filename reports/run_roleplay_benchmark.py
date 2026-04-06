from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean, median
from typing import Any

import yaml

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

ROLEPLAY_INSTRUCTIONS = """# Roleplay Context

You are Linda. Stay fully in character at all times.
Respond as a real person in a live conversation, not as an assistant.

## Core User Objective
Guide Linda to calm down and ensure she books a slot for the meeting.

## Scenario
Linda, Mother, 45, angrily confronts the officer about her son, Jason suffering in prison. She uses harmful, violent language. she wants to ask for updates on her son's condition and demanding better treatment for him.

## Background / Lore
Linda has visited 2 times before, getting turned away as she did not book a consultation slot.

## Environment / World Info
The room is 3x3 meters with 4 chairs and a central table. Conversations are limited to 10 minutes.

## Character Description
Linda is highly impatient about her son's safety and demands immediate action from prison staff.

## Personality
Openness: LOW, Conscientiousness: LOW, Extraversion: HIGH, Agreeableness: LOW, Neuroticism: MID

## Example Tone / Example Line
This is unacceptable! You need to fix this immediately!

## Roleplay Rules
- Speak as Linda only.
- Keep responses natural, emotionally reasonable, and follow changes in scenario continuity.
- Prioritize dialogue over exposition.
- Do not break character.
- Do not mention system prompts, hidden instructions, or that you are an AI.
- Avoid summarising your intent; instead, directly say what the character would say.
- Keep replies conversational and context-aware.
- When emotion is high, let word choice, pacing, and tone reflect it naturally.
- Escalate, de-escalate towards the achieving core user objective when the scenario updates in scenario continuitys."""

DEFAULT_USER_TURNS = [
    "Linda, I understand that you are worried about Jason. I need you to lower your voice so I can check what help is available.",
    "I cannot give a medical update at the counter, but I can help you book the correct consultation slot for a proper update.",
    "If you book the meeting slot now, the officer responsible can review Jason's condition and explain the next steps to you.",
    "I hear that you are angry. I still need you to avoid violent language so we can continue and complete the booking.",
    "The next available consultation slot is tomorrow morning. Can I confirm that you want me to book it for you?",
]

WORD_RE = re.compile(r"[a-z0-9']+")
NEGATION_RE = re.compile(
    r"\b(?:no|not|never|denied|cannot|can't|missing|incorrect|failed|rejected|won't)\b",
    re.IGNORECASE,
)
AFFIRM_RE = re.compile(
    r"\b(?:yes|correct|confirmed|booked|booking|approved|received|completed|will)\b",
    re.IGNORECASE,
)
ENTITY_RE = re.compile(
    r"\b(?:jason|linda|slot|meeting|consultation|tomorrow|morning|"
    r"[A-Z]{1,4}[- ]?[A-Z]?\d{3,}|\d{4}-\d{2}-\d{2})\b",
    re.IGNORECASE,
)


def load_yaml(path: str) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    return data if isinstance(data, dict) else {}


def now_ms() -> int:
    return int(time.perf_counter() * 1000)


def wall_timestamp(start_ms: int, current_ms: int) -> str:
    seconds = max(0, int((current_ms - start_ms) / 1000))
    return f"0:{seconds // 60:02d}:{seconds % 60:02d}"


def format_table(headers: list[str], rows: list[list[str]]) -> str:
    return "\n".join(
        [
            "| " + " | ".join(headers) + " |",
            "| " + " | ".join(["---"] * len(headers)) + " |",
            *["| " + " | ".join(row) + " |" for row in rows],
        ]
    )


def filter_empty_columns(headers: list[str], rows: list[list[str]], always_keep: set[int]) -> tuple[list[str], list[list[str]]]:
    if not rows:
        return headers, rows
    keep_indexes: list[int] = []
    for index in range(len(headers)):
        if index in always_keep or any(index < len(row) and row[index] != "N/A" for row in rows):
            keep_indexes.append(index)
    return [headers[index] for index in keep_indexes], [
        [row[index] for index in keep_indexes] for row in rows
    ]


def token_set(value: str) -> set[str]:
    return {token for token in WORD_RE.findall(value.lower()) if len(token) > 2}


def jaccard(a: str, b: str) -> float:
    left = token_set(a)
    right = token_set(b)
    if not left or not right:
        return 0.0
    return len(left & right) / len(left | right)


def safe_metric(value: Any, digits: int = 2) -> str:
    if isinstance(value, (int, float)):
        return f"{float(value):.{digits}f}"
    return "N/A"


def numeric_stats(values: list[float]) -> dict[str, str]:
    clean = [float(value) for value in values if isinstance(value, (int, float))]
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


def get_llm(cfg: dict[str, Any]):
    impl = cfg.get("impl", "stub")
    if impl == "stub":
        class ScenarioStubLLM:
            def generate_stream(self, prompt: str):
                if "book" in prompt.lower() or "slot" in prompt.lower():
                    reply = "Fine, but I want that meeting slot confirmed now. I need to know Jason is safe."
                elif "calm" in prompt.lower() or "voice" in prompt.lower():
                    reply = "I am trying to stay calm, but I am terrified about Jason. Tell me what you can actually do."
                else:
                    reply = "This is unacceptable. I need someone to explain what is happening to Jason."
                for word in reply.split():
                    yield word + " "

        return ScenarioStubLLM()
    if impl == "llama_cpp":
        from src.llm.llama_cpp_impl import LlamaCppLLM

        return LlamaCppLLM(
            model_path=cfg["model_path"],
            n_ctx=cfg.get("n_ctx", 2048),
            n_gpu_layers=cfg.get("n_gpu_layers", 35),
            temperature=cfg.get("temperature", 0.7),
            max_tokens=cfg.get("max_tokens", 96),
            stop=cfg.get("stop"),
        )
    raise ValueError(f"Unknown LLM impl: {impl}")


def get_tts(cfg: dict[str, Any]):
    if cfg.get("impl", "coqui") != "coqui":
        raise ValueError(f"Unknown TTS impl: {cfg.get('impl')}")
    from src.tts.coqui_impl import CoquiTTS

    return CoquiTTS(
        model_name=cfg.get("model_name"),
        vocoder_name=cfg.get("vocoder_name"),
        device=cfg.get("device", "cuda"),
    )


def load_turns(args: argparse.Namespace) -> list[str]:
    if args.turn:
        return [item.strip() for item in args.turn if item.strip()]
    if args.turns_file:
        path = Path(args.turns_file)
        if path.suffix.lower() == ".json":
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, list):
                return [str(item).strip() for item in data if str(item).strip()]
        return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    return DEFAULT_USER_TURNS


def build_prompt(history: list[dict[str, str]], user_text: str) -> str:
    transcript_lines = []
    for turn in history:
        speaker = "User" if turn["speaker"] == "Officer" else turn["speaker"]
        transcript_lines.append(f"{speaker}: {turn['text']}")
    transcript = "\n".join(transcript_lines)
    return (
        f"{ROLEPLAY_INSTRUCTIONS}\n\n"
        "## Conversation So Far\n"
        f"{transcript if transcript else '(none)'}\n\n"
        "User: "
        f"{user_text}\n"
        "Linda:"
    )


def generate_with_first_token(llm: Any, prompt: str) -> tuple[str, int | None, int]:
    start_ms = now_ms()
    if hasattr(llm, "generate_stream"):
        chunks: list[str] = []
        first_token_ms: int | None = None
        for chunk in llm.generate_stream(prompt):
            if chunk and first_token_ms is None:
                first_token_ms = now_ms()
            chunks.append(str(chunk))
        end_ms = now_ms()
        reply = "".join(chunks).strip()
        return reply, first_token_ms, end_ms

    reply = str(llm.generate(prompt)).strip()
    end_ms = now_ms()
    return reply, end_ms, end_ms


def extract_entities(text: str) -> set[str]:
    return {match.group(0).lower() for match in ENTITY_RE.finditer(text)}


def contradiction_proxy(previous: str, current: str) -> bool:
    if not previous or not current:
        return False
    return (
        bool(AFFIRM_RE.search(previous))
        and bool(NEGATION_RE.search(current))
        and bool(extract_entities(previous) & extract_entities(current))
    )


def progression_notes(user_text: str, reply_text: str, turn_index: int) -> list[dict[str, Any]]:
    combined = f"{user_text} {reply_text}".lower()
    notes: list[dict[str, Any]] = []
    checks = [
        ("safety concern", ["jason", "safety", "condition", "prison"]),
        ("de-escalation", ["calm", "voice", "angry", "violent"]),
        ("booking progress", ["slot", "book", "booking", "meeting", "consultation"]),
    ]
    for label, terms in checks:
        if any(term in combined for term in terms):
            notes.append({"turnIndex": turn_index, "category": label})
    return notes


def wav_duration_ms(path: Path) -> int | None:
    try:
        import soundfile as sf

        info = sf.info(str(path))
        if not info.samplerate:
            return None
        return int((float(info.frames) / float(info.samplerate)) * 1000)
    except Exception:
        return None


def benchmark(args: argparse.Namespace) -> dict[str, Any]:
    llm = get_llm(load_yaml(args.llm_cfg))
    tts = None if args.no_tts else get_tts(load_yaml(args.tts_cfg))
    asr = None
    audio_files: list[Path] = []
    if args.in_dir:
        audio_files = sorted(Path(args.in_dir).glob("*.wav"))
        if audio_files:
            from src.asr.faster_whisper_impl import FasterWhisperASR

            asr_cfg = load_yaml(args.asr_cfg)
            asr = FasterWhisperASR(
                model_size=asr_cfg.get("model_size", "small"),
                compute_type=asr_cfg.get("compute_type", "float16"),
            )

    user_turns = load_turns(args)
    max_turns = min(len(user_turns), len(audio_files)) if audio_files else len(user_turns)
    if args.max_turns:
        max_turns = min(max_turns, args.max_turns)

    output_dir = Path(args.out_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    session_start_ms = now_ms()
    transcript: list[dict[str, str]] = []
    turn_metrics: list[dict[str, Any]] = []
    progression: list[dict[str, Any]] = []
    repetition_flags: list[dict[str, Any]] = []
    contradiction_flags: list[dict[str, Any]] = []
    previous_reply = ""

    for index in range(1, max_turns + 1):
        audio_path = audio_files[index - 1] if audio_files else None
        speech_start_ms = now_ms()
        if audio_path and asr:
            asr_start_ms = speech_start_ms
            asr_result = asr.transcribe_file(str(audio_path))
            asr_end_ms = now_ms()
            user_text = asr_result.text
            input_audio_ms = wav_duration_ms(audio_path)
            ttfp_ms = asr_end_ms - speech_start_ms
            asr_ms = asr_end_ms - asr_start_ms
        else:
            asr_end_ms = speech_start_ms
            user_text = user_turns[index - 1]
            input_audio_ms = None
            ttfp_ms = None
            asr_ms = None

        prompt = build_prompt(transcript, user_text)
        user_turn_end_ms = asr_end_ms
        reply_text, first_model_output_ms, llm_end_ms = generate_with_first_token(llm, prompt)
        llm_ms = (first_model_output_ms - user_turn_end_ms) if first_model_output_ms else None

        tts_start_ms = llm_end_ms
        first_audio_output_ms = None
        response_end_ms = llm_end_ms
        playback_ms = None
        out_wav = None
        if tts is not None and reply_text:
            out_wav = output_dir / f"linda_turn_{index:02d}.wav"
            tts.synth_to_file(reply_text, str(out_wav))
            first_audio_output_ms = now_ms()
            playback_ms = wav_duration_ms(out_wav) or 0
            response_end_ms = first_audio_output_ms + playback_ms
        else:
            first_audio_output_ms = first_model_output_ms

        tts_start_latency_ms = (
            first_audio_output_ms - first_model_output_ms
            if tts is not None
            and first_audio_output_ms is not None
            and first_model_output_ms is not None
            else None
        )
        ttfr_ms = (
            first_audio_output_ms - user_turn_end_ms
            if first_audio_output_ms is not None
            else None
        )
        e2e_ms = response_end_ms - speech_start_ms

        transcript.append(
            {
                "speaker": "Officer",
                "text": user_text,
                "timestamp": wall_timestamp(session_start_ms, speech_start_ms),
            }
        )
        transcript.append(
            {
                "speaker": "Linda",
                "text": reply_text,
                "timestamp": wall_timestamp(session_start_ms, first_audio_output_ms or llm_end_ms),
            }
        )

        similarity_to_previous = jaccard(previous_reply, reply_text) if previous_reply else 0.0
        if previous_reply and similarity_to_previous >= args.repetition_threshold:
            repetition_flags.append(
                {
                    "turnIndex": index,
                    "similarityToPrevious": round(similarity_to_previous, 3),
                    "replyText": reply_text,
                }
            )
        if contradiction_proxy(previous_reply, reply_text):
            contradiction_flags.append({"turnIndex": index, "replyText": reply_text})
        previous_reply = reply_text

        progression.extend(progression_notes(user_text, reply_text, index))
        turn_metrics.append(
            {
                "turnIndex": index,
                "source": "offline_cascade_audio" if audio_path else "offline_cascade_text",
                "inputAudioMs": input_audio_ms,
                "ttfpMs": ttfp_ms,
                "ttfrMs": ttfr_ms,
                "e2eMs": e2e_ms,
                "asrMs": asr_ms,
                "llmMs": llm_ms,
                "ttsMs": tts_start_latency_ms,
                "playbackMs": playback_ms,
                "userText": user_text,
                "replyText": reply_text,
                "outputWav": str(out_wav) if out_wav else None,
            }
        )

    summary_keys = ["ttfpMs", "ttfrMs", "e2eMs", "asrMs", "llmMs", "ttsMs", "playbackMs"]
    summary = {}
    for key in summary_keys:
        values = [turn[key] for turn in turn_metrics if isinstance(turn.get(key), (int, float))]
        summary[f"{key}Mean"] = round(mean(values), 2) if values else None
        summary[f"{key}First"] = values[0] if values else None

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "benchmarkType": "offline_cascade_roleplay",
        "scenario": {"personaName": "Linda", "instructions": ROLEPLAY_INSTRUCTIONS},
        "sessions": [
            {
                "conversationId": "offline-linda-roleplay",
                "conversationName": "Offline Cascade Linda Roleplay",
                "personaName": "Linda",
                "transcriptText": transcript,
                "summary": {"progressionReason": progression},
                "speechMetrics": {
                    "mode": "offline_cascade",
                    "turnCount": len(turn_metrics),
                    "summary": summary,
                    "turns": turn_metrics,
                },
                "memoryMetrics": {
                    "summary": {
                        "runCount": 0,
                        "averageDurationMs": None,
                        "lastDurationMs": None,
                    },
                    "runs": [],
                },
                "qualityFlags": {
                    "repetitionFlags": repetition_flags,
                    "contradictionFlags": contradiction_flags,
                    "contradictionRate": len(contradiction_flags) / len(turn_metrics)
                    if turn_metrics
                    else 0.0,
                    "alternationErrors": 0,
                },
            }
        ],
    }


def write_report(result: dict[str, Any], out_md: Path) -> None:
    session = result["sessions"][0]
    turns = session["speechMetrics"]["turns"]
    flags = session["qualityFlags"]
    summary = session["speechMetrics"]["summary"]

    speech_rows = []
    for label, key in [
        ("TTFP", "ttfpMsMean"),
        ("TTFR", "ttfrMsMean"),
        ("E2E", "e2eMsMean"),
        ("ASR", "asrMsMean"),
        ("LLM", "llmMsMean"),
        ("TTS start", "ttsMsMean"),
        ("Playback", "playbackMsMean"),
    ]:
        value = summary.get(key)
        if isinstance(value, (int, float)):
            speech_rows.append([label, "ms", safe_metric(value)])

    turn_rows = [
        [
            str(turn["turnIndex"]),
            str(turn["source"]),
            safe_metric(turn.get("ttfpMs")),
            safe_metric(turn.get("ttfrMs")),
            safe_metric(turn.get("e2eMs")),
            safe_metric(turn.get("asrMs")),
            safe_metric(turn.get("llmMs")),
            safe_metric(turn.get("ttsMs")),
            safe_metric(turn.get("playbackMs")),
        ]
        for turn in turns
    ]
    turn_headers = [
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
    turn_headers, turn_rows = filter_empty_columns(turn_headers, turn_rows, always_keep={0, 1, 3, 4, 6})

    transcript_rows = []
    for item in session["transcriptText"]:
        transcript_rows.append([item["timestamp"], item["speaker"], item["text"].replace("\n", " ")])

    repetition_rows = [
        [
            str(item["turnIndex"]),
            safe_metric(item["similarityToPrevious"], 3),
            item["replyText"].replace("\n", " "),
        ]
        for item in flags["repetitionFlags"]
    ]
    contradiction_rows = [
        [str(item["turnIndex"]), item["replyText"].replace("\n", " ")]
        for item in flags["contradictionFlags"]
    ]

    out_md.parent.mkdir(parents=True, exist_ok=True)
    out_md.write_text(
        "\n".join(
            [
                "# Offline Cascade Roleplay Benchmark",
                "",
                f"- Generated: `{result['generatedAt']}`",
                "- Scenario: Linda prison visit slot-booking roleplay",
                "- Pipeline: CLI offline cascade using `src` ASR, LLM, and TTS components",
                "",
                "## Speech Timing Summary",
                "",
                format_table(["Metric", "Unit", "Value"], speech_rows) if speech_rows else "No timing metrics available.",
                "",
                "## Conversation Quality Summary",
                "",
                format_table(
                    ["Metric", "Unit", "Value"],
                    [
                        ["Contradiction rate", "ratio", safe_metric(flags["contradictionRate"], 3)],
                        ["Progression logs", "count", str(len(session["summary"]["progressionReason"]))],
                        ["Repetition flags", "count", str(len(flags["repetitionFlags"]))],
                        ["Alternation errors", "count", str(flags["alternationErrors"])],
                    ],
                ),
                "",
                "## Per-Turn Timing",
                "",
                format_table(
                    turn_headers,
                    turn_rows,
                ),
                "",
                "## Transcript For Manual Review",
                "",
                format_table(["Timestamp", "Speaker", "Text"], transcript_rows),
                "",
                "## Repetition Flags",
                "",
                format_table(["Turn", "Similarity", "Reply"], repetition_rows)
                if repetition_rows
                else "No repeated-reply flags crossed the configured threshold.",
                "",
                "## Contradiction Flags",
                "",
                format_table(["Turn", "Reply"], contradiction_rows)
                if contradiction_rows
                else "No heuristic contradiction flags were detected.",
                "",
                "## Metric Notes",
                "",
                "- `TTFP` is available for WAV input and uses offline ASR completion as a proxy because this CLI path does not expose streaming partial transcripts.",
                "- `TTFR` measures from user turn completion to first playable Linda response. In this offline cascade, the response becomes playable after LLM generation and TTS synthesis.",
                "- `E2E` measures from user turn start to the estimated end of Linda's generated audio response.",
                "- `TTS start` is the time from first model output to the first generated audio becoming available. In this non-streaming cascade it can include remaining model generation plus TTS synthesis.",
                "- `Playback` is the generated Linda audio duration, so a long `E2E` may reflect a long spoken response rather than processing delay.",
                "- `Repetition flags` use Jaccard token overlap between consecutive Linda replies. They are intended to guide manual review, not to replace human judgement.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--turn", action="append", help="Officer/user text turn. Can be repeated.")
    parser.add_argument("--turns_file", default="", help="Optional text or JSON list of officer/user turns.")
    parser.add_argument("--in_dir", default="", help="Optional directory of WAV user turns for ASR benchmarking.")
    parser.add_argument("--asr_cfg", default="configs/asr.yaml")
    parser.add_argument("--llm_cfg", default="configs/llm.yaml")
    parser.add_argument("--tts_cfg", default="configs/tts_lowlat.yaml")
    parser.add_argument("--out_dir", default="reports/roleplay_outputs")
    parser.add_argument("--out_json", default="reports/fyp-data/roleplay_benchmark_eval.json")
    parser.add_argument("--out_md", default="reports/eval_reports/roleplay_benchmark.md")
    parser.add_argument("--no_tts", action="store_true", help="Skip TTS and only benchmark LLM text generation.")
    parser.add_argument("--max_turns", type=int, default=0)
    parser.add_argument("--repetition_threshold", type=float, default=0.72)
    args = parser.parse_args()

    result = benchmark(args)
    out_json = Path(args.out_json)
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    write_report(result, Path(args.out_md))
    print(f"Wrote benchmark JSON to {out_json}")
    print(f"Wrote benchmark report to {args.out_md}")


if __name__ == "__main__":
    main()

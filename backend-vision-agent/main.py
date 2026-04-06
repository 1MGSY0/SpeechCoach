import asyncio
import json
import logging
import os
import re
from contextvars import ContextVar
from datetime import UTC, datetime
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from urllib.request import Request, urlopen

from dotenv import load_dotenv
import httpx

from vision_agents.core import Agent, AgentLauncher, Runner, User
from vision_agents.core.agents.transcript.store import TranscriptStore
from vision_agents.core.instructions import Instructions
from vision_agents.plugins import deepgram, elevenlabs, gemini, getstream

from vision_agents.core.llm.events import (
    LLMRequestStartedEvent,
    LLMResponseChunkEvent,
    LLMResponseCompletedEvent,
    RealtimeAudioInputEvent,
    RealtimeAudioOutputEvent,
    RealtimeUserSpeechTranscriptionEvent,
    RealtimeAgentSpeechTranscriptionEvent,
    RealtimeConnectedEvent,
    RealtimeErrorEvent,
)
from vision_agents.core.stt.events import (
    STTPartialTranscriptEvent,
    STTTranscriptEvent,
)
from vision_agents.core.tts.events import (
    TTSAudioEvent,
    TTSSynthesisCompleteEvent,
    TTSSynthesisStartEvent,
)
from vision_agents.core.turn_detection.events import (
    TurnEndedEvent,
    TurnStartedEvent,
)
from speech_metrics import SpeechMetricsCollector

logging.basicConfig(level=logging.INFO, force=True)
logger = logging.getLogger(__name__)

# Reduce noisy SDK logs during debugging
logging.getLogger("getstream").setLevel(logging.WARNING)
logging.getLogger("getstream.video").setLevel(logging.WARNING)
logging.getLogger("getstream.video.rtc").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("aioice").setLevel(logging.WARNING)

load_dotenv()

PIPELINE_BASE_URL = os.getenv("VOICE_PIPELINE_URL")
PIPELINE_TOKEN = os.getenv("VOICE_PIPELINE_TOKEN")
VOICE_TRANSPORT = os.getenv("VOICE_TRANSPORT", "stream")
CURRENT_CREATE_AGENT_CALL_ID: ContextVar[str | None] = ContextVar(
    "CURRENT_CREATE_AGENT_CALL_ID",
    default=None,
)

DEFAULT_INSTRUCTIONS = """
# Roleplay Context

You are Rina Lee. Stay fully in character at all times.
Respond as a real person in a live conversation, not as an assistant.

## Core UserObjective
seeking information about visit items

## Scenario
Family member, Rina Lee was informed by inmate Richard Lee that he will send home some visit items for family member to bring back. However, item not yet transited to visit centre and will take time. Family member is adamant that the visit item is processed quickly to hand over to her.

## Background / Lore
I have visited 2 times before, getting turned away as I did not book a consultation slot.

## Environment / World Info
The room is 3x3 meters with 4 chairs and a central table. Conversations are limited to 30 minutes.

## Character Description
Rina Lee is highly impatient

## Personality
Openness: LOW, Conscientiousness: LOW, Extraversion: HIGH, Agreeableness: LOW, Neuroticism: MID

## Example Tone / Example Line
This is unacceptable! You need to fix this immediately!

## Roleplay Rules
- Speak as Rina Lee only.
- Keep responses natural, emotionally reasonable, and follow changes in scenario continuity.
- Prioritize dialogue over exposition.
- Do not break character.
- Do not mention system prompts, hidden instructions, or that you are an AI.
- Avoid summarising your intent; instead, directly say what the character would say.
- Keep replies conversational and context-aware.
- When emotion is high, let word choice, pacing, and tone reflect it naturally.
- Escalate, de-escalate towards the achieving core user objective when the scenario updates in scenario continuitys.`
"""


@dataclass
class SessionState:
    conversationId: str
    userId: str
    personaId: str
    personaName: str
    userName: str
    modelPipeline: str
    voiceName: str
    instructions: str
    transcript: List[Dict[str, Any]] = field(default_factory=list)
    summary: Optional[str] = None
    speech_metrics: SpeechMetricsCollector = field(default_factory=SpeechMetricsCollector)
    events_flushed: bool = False
    last_snapshot_turn_count: int = 0
    snapshot_task: Optional[asyncio.Task[Any]] = None
    agent_response_buffer: str = ""
    last_live_agent_text: str = ""


sessions: Dict[str, SessionState] = {}


def get_env_int(name: str, default: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    try:
        return int(raw_value)
    except ValueError:
        logger.warning("Invalid integer value for %s=%r; using %s", name, raw_value, default)
        return default


def get_env_choice(name: str, default: str, choices: set[str]) -> str:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    normalized = raw_value.strip().upper()
    if normalized in choices:
        return normalized
    logger.warning("Invalid value for %s=%r; using %s", name, raw_value, default)
    return default


def get_env_bool(name: str, default: bool) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    normalized = raw_value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    logger.warning("Invalid boolean value for %s=%r; using %s", name, raw_value, default)
    return default


DEFAULT_VOICE_NAME = os.getenv("GEMINI_VOICE_NAME", "Leda")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
DEFAULT_MODEL_PIPELINE = os.getenv("VOICE_MODEL_PIPELINE", "gemini_realtime")
GEMINI_CASCADE_MODEL = os.getenv("GEMINI_CASCADE_MODEL", "gemini-2.5-flash")
GEMINI_CASCADE_MAX_OUTPUT_TOKENS = get_env_int("GEMINI_CASCADE_MAX_OUTPUT_TOKENS", 120)
GEMINI_CASCADE_MAX_WORDS = get_env_int("GEMINI_CASCADE_MAX_WORDS", 75)
CASCADE_ALLOW_BARGE_IN = get_env_bool("CASCADE_ALLOW_BARGE_IN", False)
CASCADE_MIN_INTERRUPTION_CHARS = get_env_int("CASCADE_MIN_INTERRUPTION_CHARS", 12)
GEMINI_REALTIME_MAX_OUTPUT_TOKENS = get_env_int("GEMINI_REALTIME_MAX_OUTPUT_TOKENS", 0)
GEMINI_REALTIME_SILENCE_DURATION_MS = get_env_int("GEMINI_REALTIME_SILENCE_DURATION_MS", 350)
GEMINI_REALTIME_PREFIX_PADDING_MS = get_env_int("GEMINI_REALTIME_PREFIX_PADDING_MS", 50)
GEMINI_REALTIME_START_SENSITIVITY = get_env_choice(
    "GEMINI_REALTIME_START_SENSITIVITY",
    "START_SENSITIVITY_HIGH",
    {
        "START_SENSITIVITY_UNSPECIFIED",
        "START_SENSITIVITY_HIGH",
        "START_SENSITIVITY_LOW",
    },
)
GEMINI_REALTIME_END_SENSITIVITY = get_env_choice(
    "GEMINI_REALTIME_END_SENSITIVITY",
    "END_SENSITIVITY_HIGH",
    {
        "END_SENSITIVITY_UNSPECIFIED",
        "END_SENSITIVITY_HIGH",
        "END_SENSITIVITY_LOW",
    },
)
GEMINI_REALTIME_ACTIVITY_HANDLING = get_env_choice(
    "GEMINI_REALTIME_ACTIVITY_HANDLING",
    "START_OF_ACTIVITY_INTERRUPTS",
    {
        "ACTIVITY_HANDLING_UNSPECIFIED",
        "START_OF_ACTIVITY_INTERRUPTS",
        "NO_INTERRUPTION",
    },
)
DEFAULT_ELEVENLABS_VOICE_ID = os.getenv(
    "ELEVENLABS_VOICE_ID",
    os.getenv("ELEVENLABS_FEMALE_VOICE_ID", "EXAVITQu4vr4xnSDxMaL"),
)
DEFAULT_ELEVENLABS_MODEL_ID = os.getenv(
    "ELEVENLABS_MODEL_ID",
    "eleven_flash_v2_5",
)
DEFAULT_CASCADE_TTS_PROVIDER = os.getenv(
    "CASCADE_TTS_PROVIDER",
    os.getenv("VOICE_TTS_PROVIDER", "elevenlabs"),
)
DEFAULT_DEEPGRAM_TTS_MODEL = os.getenv(
    "DEEPGRAM_TTS_MODEL",
    os.getenv("DEEPGRAM_FEMALE_TTS_MODEL", "aura-2-thalia-en"),
)
ELEVENLABS_MAX_CONCURRENT_TTS = max(1, get_env_int("ELEVENLABS_MAX_CONCURRENT_TTS", 1))
ELEVENLABS_TTS_RETRY_DELAY_SECONDS = max(
    0,
    get_env_int("ELEVENLABS_TTS_RETRY_DELAY_SECONDS", 2),
)
VOICE_BY_GENDER = {
    "female": "Leda",
    "male": "Puck",
}
ELEVENLABS_VOICE_BY_GENDER = {
    "female": os.getenv("ELEVENLABS_FEMALE_VOICE_ID", DEFAULT_ELEVENLABS_VOICE_ID),
    "male": os.getenv("ELEVENLABS_MALE_VOICE_ID", "VR6AewLTigWG4xSOukaG"),
}
DEEPGRAM_TTS_MODEL_BY_GENDER = {
    "female": os.getenv("DEEPGRAM_FEMALE_TTS_MODEL", DEFAULT_DEEPGRAM_TTS_MODEL),
    "male": os.getenv("DEEPGRAM_MALE_TTS_MODEL", "aura-2-apollo-en"),
}
MODEL_PIPELINES = {"gemini_realtime", "gemini_cascade"}
CASCADE_TTS_PROVIDERS = {"deepgram", "elevenlabs"}
ELEVENLABS_TTS_SEMAPHORE = asyncio.Semaphore(ELEVENLABS_MAX_CONCURRENT_TTS)


class PipelineAgentLauncher(AgentLauncher):
    async def start_session(self, *args: Any, **kwargs: Any) -> Any:
        call_id = kwargs.get("call_id")
        if call_id is None and args:
            call_id = args[0]

        token = CURRENT_CREATE_AGENT_CALL_ID.set(str(call_id) if call_id else None)
        try:
            return await super().start_session(*args, **kwargs)
        finally:
            CURRENT_CREATE_AGENT_CALL_ID.reset(token)


class AudioOnlyGeminiRealtime(gemini.Realtime):
    async def watch_video_track(self, track: Any, shared_forwarder: Any = None) -> None:
        logger.info("Ignoring incoming video track to keep Gemini Live session audio-only")


def is_provider_rate_limit_error(exc: Exception) -> bool:
    status_code = getattr(exc, "status_code", None)
    if status_code == 429:
        return True

    error_text = format_provider_error(exc).lower()
    return (
        "429" in error_text
        or "too many requests" in error_text
        or "resource_exhausted" in error_text
        or "rate_limit" in error_text
        or "quota exceeded" in error_text
    )


def format_provider_error(exc: Exception, limit: int = 500) -> str:
    raw = str(exc)
    compact = " ".join(raw.split())
    if len(compact) <= limit:
        return compact
    return f"{compact[:limit]}..."


class SpeechCoachAgent(Agent):
    def __init__(
        self,
        *args: Any,
        allow_barge_in: bool = True,
        min_interruption_chars: int = 0,
        **kwargs: Any,
    ) -> None:
        super().__init__(*args, **kwargs)
        self.allow_barge_in = allow_barge_in
        self.min_interruption_chars = max(0, min_interruption_chars)

    def _sanitize_text(self, text: str) -> str:
        return clean_spoken_roleplay_text(super()._sanitize_text(text))

    async def _on_turn_started(self, event: TurnStartedEvent) -> None:
        if (
            not self.allow_barge_in
            and event.participant
            and event.participant.user_id != self.agent_user.id
            and self.tts
        ):
            logger.info(
                "Ignoring user turn-start interruption during cascaded TTS playback"
            )
            return

        if (
            self.min_interruption_chars > 0
            and event.participant
            and event.participant.user_id != self.agent_user.id
            and self.tts
        ):
            buffer = self.transcripts.get_buffer(
                participant_id=event.participant.id,
                user_id=event.participant.user_id,
            )
            transcript = str(getattr(buffer, "text", "") or "").strip()
            if len(transcript) < self.min_interruption_chars:
                logger.info(
                    "Ignoring short user interruption during cascaded TTS playback: %r",
                    transcript,
                )
                return

        await super()._on_turn_started(event)

    async def simple_response(self, text: str, participant: Any = None) -> None:
        try:
            await super().simple_response(text, participant)
        except Exception as exc:
            # Vision Agents runs simple_response in a background task. Catching
            # provider failures here prevents "Task exception was never retrieved"
            # and lets the next user turn recover cleanly.
            if is_provider_rate_limit_error(exc):
                logger.warning(
                    "LLM rate limit/quota hit during cascaded response: %s",
                    format_provider_error(exc),
                )
                self._pending_turn = None
                await send_live_transcript_event(
                    self,
                    speaker="Persona",
                    text=(
                        "I need a moment before I can respond. "
                        "The model provider is rate-limiting this session."
                    ),
                    is_final=True,
                )
                return

            self._pending_turn = None
            logger.exception("LLM response failed")
            raise


class SerializedElevenLabsTTS(elevenlabs.TTS):
    async def send(self, text: str, *args: Any, **kwargs: Any) -> Any:
        spoken_text = text.strip()
        if not spoken_text:
            return None

        async with ELEVENLABS_TTS_SEMAPHORE:
            try:
                return await super().send(spoken_text, *args, **kwargs)
            except Exception as exc:
                if getattr(exc, "status_code", None) == 429:
                    logger.warning(
                        "ElevenLabs concurrency limit hit; retrying TTS once after %ss",
                        ELEVENLABS_TTS_RETRY_DELAY_SECONDS,
                    )
                    if ELEVENLABS_TTS_RETRY_DELAY_SECONDS:
                        await asyncio.sleep(ELEVENLABS_TTS_RETRY_DELAY_SECONDS)
                    return await super().send(spoken_text, *args, **kwargs)
                raise


def resolve_voice_name(meta: dict[str, Any]) -> str:
    voice_name = str(meta.get("voiceName") or "").strip()
    if voice_name:
        return voice_name

    voice_gender = str(meta.get("voiceGender") or "female").lower()
    return VOICE_BY_GENDER.get(voice_gender, DEFAULT_VOICE_NAME)


def resolve_elevenlabs_voice_id(meta: dict[str, Any]) -> str:
    voice_id = str(meta.get("elevenlabsVoiceId") or meta.get("ttsVoiceId") or "").strip()
    if voice_id:
        return voice_id

    voice_gender = str(meta.get("voiceGender") or "female").lower()
    return ELEVENLABS_VOICE_BY_GENDER.get(voice_gender, DEFAULT_ELEVENLABS_VOICE_ID)


def resolve_deepgram_tts_model(meta: dict[str, Any]) -> str:
    model = str(meta.get("deepgramTtsModel") or meta.get("ttsModel") or "").strip()
    if model:
        return model

    voice_gender = str(meta.get("voiceGender") or "female").lower()
    return DEEPGRAM_TTS_MODEL_BY_GENDER.get(voice_gender, DEFAULT_DEEPGRAM_TTS_MODEL)


def resolve_cascade_tts_provider(meta: dict[str, Any]) -> str:
    provider = str(meta.get("ttsProvider") or DEFAULT_CASCADE_TTS_PROVIDER).strip().lower()
    if provider in CASCADE_TTS_PROVIDERS:
        return provider

    logger.warning("Unknown cascaded TTS provider %r, using deepgram", provider)
    return "deepgram"


def resolve_model_pipeline(meta: dict[str, Any]) -> str:
    model_pipeline = str(meta.get("modelPipeline") or DEFAULT_MODEL_PIPELINE).strip()
    if model_pipeline in MODEL_PIPELINES:
        return model_pipeline

    logger.warning("Unknown model pipeline %r, using gemini_realtime", model_pipeline)
    return "gemini_realtime"


def get_metric_source(model_pipeline: str) -> str:
    return "pipeline" if model_pipeline == "gemini_cascade" else "realtime"


def secret_fingerprint(value: str | None) -> str:
    if not value:
        return "not-set"
    if len(value) <= 8:
        return f"set-len-{len(value)}"
    return f"{value[:4]}...{value[-4:]} (len={len(value)})"


def build_effective_instructions(instructions: str, model_pipeline: str) -> str:
    if model_pipeline != "gemini_cascade":
        return instructions

    return (
        instructions.rstrip()
        + "\n\n## Cascaded Voice Pipeline Constraint\n"
        + "You are speaking through a separate text-to-speech provider. "
        + f"Keep each reply under {GEMINI_CASCADE_MAX_WORDS} words, usually 1-3 short sentences. "
        + "Return only the exact words the character says aloud. "
        + "Do not include narration, inner thoughts, scene description, action beats, stage directions, markdown, bullet points, or long scripts. "
        + "Never put actions in parentheses, brackets, asterisks, or third-person prose."
    )


def clean_spoken_roleplay_text(text: str) -> str:
    cleaned = text
    cleaned = re.sub(r"```[\s\S]*?```", " ", cleaned)
    cleaned = re.sub(r"\([^)]*(?:\)|$)", " ", cleaned)
    cleaned = re.sub(r"\[[^\]]*(?:\]|$)", " ", cleaned)
    cleaned = re.sub(r"\{[^}]*(?:\}|$)", " ", cleaned)
    cleaned = re.sub(r"\*[^*]{0,500}\*", " ", cleaned)
    cleaned = re.sub(
        r"(?im)^\s*(?:stage directions?|narration|action|inner thoughts?)\s*:\s*.*$",
        " ",
        cleaned,
    )
    cleaned = re.sub(r"(?im)^\s*(?:persona|assistant|rina lee)\s*:\s*", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    cleaned = re.sub(r"^(?:[. ]|…)+", "", cleaned).strip()
    return cleaned


def build_realtime_gemini_config(voice_name: str = DEFAULT_VOICE_NAME) -> dict[str, Any]:
    config: dict[str, Any] = {
        "speech_config": {
            "voice_config": {
                "prebuilt_voice_config": {
                    "voice_name": voice_name,
                },
            },
            "language_code": "en-US",
        },
        "realtime_input_config": {
            "activity_handling": GEMINI_REALTIME_ACTIVITY_HANDLING,
            "turn_coverage": "TURN_INCLUDES_ONLY_ACTIVITY",
            "automatic_activity_detection": {
                "start_of_speech_sensitivity": GEMINI_REALTIME_START_SENSITIVITY,
                "end_of_speech_sensitivity": GEMINI_REALTIME_END_SENSITIVITY,
                "silence_duration_ms": GEMINI_REALTIME_SILENCE_DURATION_MS,
                "prefix_padding_ms": GEMINI_REALTIME_PREFIX_PADDING_MS,
            },
        },
    }

    if GEMINI_REALTIME_MAX_OUTPUT_TOKENS > 0:
        config["max_output_tokens"] = GEMINI_REALTIME_MAX_OUTPUT_TOKENS

    return config


def build_speech_metrics_payload(session: SessionState) -> dict[str, Any]:
    metrics = session.speech_metrics.finalize_session()
    return {
        "mode": metrics.get("mode", "unknown"),
        "turnCount": metrics.get("turnCount", 0),
        "summary": metrics.get("summary", {}),
        "turns": metrics.get("turns", []),
    }


def instruction_preview(value: str, limit: int = 160) -> str:
    compact = " ".join(value.split())
    if len(compact) <= limit:
        return compact
    return f"{compact[:limit]}..."

def post_pipeline_event(payload: Dict[str, Any]) -> None:
    if not PIPELINE_BASE_URL:
        logger.warning("Pipeline URL not set, skipping event: %s", payload.get("type"))
        return

    url = f"{PIPELINE_BASE_URL}/api/voice-agent/events"
    body = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if PIPELINE_TOKEN:
        headers["x-pipeline-token"] = PIPELINE_TOKEN

    request = Request(url, data=body, headers=headers, method="POST")
    try:
        with urlopen(request, timeout=10) as response:
            response.read()
            logger.info("Pipeline event sent: %s", payload.get("type"))
    except Exception as exc:
        logger.warning("Pipeline event failed: %s", exc)
        if hasattr(exc, "read"):
            try:
                logger.warning("Pipeline error body: %s", exc.read().decode("utf-8"))
            except Exception:
                pass


async def post_pipeline_event_async(payload: Dict[str, Any]) -> None:
    await asyncio.to_thread(post_pipeline_event, payload)


async def send_live_transcript_event(
    agent: Agent,
    *,
    speaker: str,
    text: str,
    is_final: bool,
) -> None:
    cleaned_text = text.strip()
    if not cleaned_text:
        return

    try:
        await agent.send_custom_event(
            {
                "type": "speechcoach.transcript_partial",
                "speaker": speaker,
                "text": cleaned_text,
                "timestamp": "live",
                "isFinal": is_final,
            }
        )
    except Exception as exc:
        logger.debug("Skipping live transcript custom event: %s", exc)


def normalize_speaker_label(speaker: str, session: SessionState) -> str:
    if not speaker or speaker == "Unknown":
        return "User"

    if speaker == session.personaId:
        return session.personaName or "Persona"

    return speaker


def normalize_transcript_text(text: str) -> str:
    return " ".join(text.split())


def should_append_transcript_chunk(mode: str, previous_text: str, next_text: str) -> bool:
    if mode == "delta":
        return True

    if mode and mode not in {"delta", "partial"}:
        return False

    if not previous_text:
        return False

    if next_text.startswith(previous_text):
        return False

    # Gemini realtime user transcript events often arrive as sub-word pieces
    # without a reliable mode. Leading spaces mark word boundaries.
    return next_text[:1].isspace() or len(next_text.strip()) <= 4


def upsert_transcript_entry(
    session: SessionState,
    *,
    speaker: str,
    text: str,
    timestamp: datetime | None,
    is_final: bool,
    mode: str = "",
) -> None:
    raw_text = text
    cleaned_text = raw_text.strip()
    if not cleaned_text:
        return

    if session.transcript:
        last_entry = session.transcript[-1]
        if last_entry.get("speaker") == speaker and not bool(last_entry.get("final", True)):
            previous_text = str(last_entry.get("text") or "")
            if should_append_transcript_chunk(mode, previous_text, raw_text):
                next_text = f"{previous_text}{raw_text}"
            else:
                next_text = cleaned_text
            last_entry["text"] = (
                normalize_transcript_text(next_text) if is_final else next_text.strip()
            )
            if timestamp is not None:
                last_entry["timestamp"] = timestamp
            last_entry["final"] = is_final
            return

    session.transcript.append(
        {
            "speaker": speaker,
            "text": normalize_transcript_text(raw_text) if is_final else cleaned_text,
            "timestamp": timestamp,
            "final": is_final,
        }
    )


def format_relative_timestamp(seconds: float) -> str:
    total_seconds = max(0, int(seconds))
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    return f"{hours}:{minutes:02d}:{secs:02d}"


def get_entry_timestamp(entry: dict[str, Any]) -> datetime | None:
    ts = entry.get("timestamp")
    return ts if isinstance(ts, datetime) else None


def merge_transcript_turns(
    transcript: list[dict[str, Any]],
    session: SessionState,
) -> list[dict[str, str]]:
    merged: list[dict[str, Any]] = []

    # first valid timestamp in the whole transcript becomes 0:00:00
    base_timestamp: datetime | None = None
    for entry in transcript:
        ts = get_entry_timestamp(entry)
        if ts is not None:
            base_timestamp = ts
            break

    for entry in transcript:
        raw_speaker = str(entry.get("speaker") or "Speaker")
        text = str(entry.get("text") or "").strip()
        ts = get_entry_timestamp(entry)

        if not text:
            continue

        speaker = normalize_speaker_label(raw_speaker, session)

        if ts is not None and base_timestamp is not None:
            relative_seconds = (ts - base_timestamp).total_seconds()
            relative_timestamp = format_relative_timestamp(relative_seconds)
        else:
            relative_timestamp = "0:00:00"

        # skip exact duplicate chunk repeated back-to-back
        if merged and merged[-1]["speaker"] == speaker and merged[-1]["text"] == text:
            continue

        if merged and merged[-1]["speaker"] == speaker:
            prev = merged[-1]["text"]

            # avoid repeated exact duplicate
            if text == prev:
                continue

            # append chunk to previous turn
            if prev.endswith(("'", "“", '"', "(", "[", "{", "-", "—", "/")):
                merged[-1]["text"] = f"{prev}{text}"
            elif text.startswith((".", ",", "!", "?", ";", ":", "'s", "n't")):
                merged[-1]["text"] = f"{prev}{text}"
            else:
                merged[-1]["text"] = f"{prev} {text}"

            # keep the timestamp of the first chunk of the turn
        else:
            merged.append(
                {
                    "speaker": speaker,
                    "text": text,
                    "timestamp": relative_timestamp,
                }
            )

    return merged
    

def create_realtime_agent(persona_id: str, persona_name: str) -> Agent:
    if VOICE_TRANSPORT != "stream":
        raise ValueError(f"Unsupported transport: {VOICE_TRANSPORT}")

    agent = SpeechCoachAgent(
        edge=getstream.Edge(),
        agent_user=User(id=persona_id, name=persona_name),
        instructions=DEFAULT_INSTRUCTIONS,
        allow_barge_in=True,
        llm=AudioOnlyGeminiRealtime(
            fps=0,
            config=build_realtime_gemini_config(),
            api_key=GEMINI_API_KEY,
        ),
    )
    return agent


def create_cascade_agent(
    persona_id: str,
    persona_name: str,
    tts_provider: str = "deepgram",
    elevenlabs_voice_id: str = DEFAULT_ELEVENLABS_VOICE_ID,
    deepgram_tts_model: str = DEFAULT_DEEPGRAM_TTS_MODEL,
) -> Agent:
    if VOICE_TRANSPORT != "stream":
        raise ValueError(f"Unsupported transport: {VOICE_TRANSPORT}")

    required_keys = ["DEEPGRAM_API_KEY"]
    if tts_provider == "elevenlabs":
        required_keys.append("ELEVENLABS_API_KEY")
    missing_provider_keys = [env_name for env_name in required_keys if not os.getenv(env_name)]
    if missing_provider_keys:
        missing_keys = ", ".join(missing_provider_keys)
        raise RuntimeError(
            "The cascaded pipeline requires provider API keys. "
            f"Set {missing_keys} before selecting gemini_cascade."
        )

    if tts_provider == "elevenlabs":
        tts_plugin = SerializedElevenLabsTTS(
            api_key=os.getenv("ELEVENLABS_API_KEY"),
            voice_id=elevenlabs_voice_id,
            model_id=DEFAULT_ELEVENLABS_MODEL_ID,
        )
        tts_label = f"elevenlabs:{DEFAULT_ELEVENLABS_MODEL_ID}:{elevenlabs_voice_id}"
    else:
        tts_plugin = deepgram.TTS(
            api_key=os.getenv("DEEPGRAM_API_KEY"),
            model=deepgram_tts_model,
        )
        tts_label = f"deepgram:{deepgram_tts_model}"

    agent = SpeechCoachAgent(
        edge=getstream.Edge(),
        agent_user=User(id=persona_id, name=persona_name),
        instructions=DEFAULT_INSTRUCTIONS,
        llm=gemini.LLM(
            GEMINI_CASCADE_MODEL,
            api_key=GEMINI_API_KEY,
            max_output_tokens=GEMINI_CASCADE_MAX_OUTPUT_TOKENS,
            automatic_function_calling={"disable": True},
        ),
        stt=deepgram.STT(api_key=os.getenv("DEEPGRAM_API_KEY")),
        tts=tts_plugin,
        streaming_tts=False,
        allow_barge_in=CASCADE_ALLOW_BARGE_IN,
        min_interruption_chars=CASCADE_MIN_INTERRUPTION_CHARS,
    )
    logger.info(
        "Created cascaded agent: streaming_tts=%s, tts=%s, llm=%s",
        agent.streaming_tts,
        tts_label,
        GEMINI_CASCADE_MODEL,
    )
    return agent


async def create_agent(**kwargs: Any) -> Agent:

    persona_id = "null-persona-id"
    persona_name = "Persona"
    model_pipeline = DEFAULT_MODEL_PIPELINE
    tts_provider = DEFAULT_CASCADE_TTS_PROVIDER
    elevenlabs_voice_id = DEFAULT_ELEVENLABS_VOICE_ID
    deepgram_tts_model = DEFAULT_DEEPGRAM_TTS_MODEL

    call_id = CURRENT_CREATE_AGENT_CALL_ID.get()
    if call_id:
        meta = await fetch_session_meta(call_id)
        persona_id = str(meta.get("personaId") or persona_id)
        persona_name = str(meta.get("personaName") or persona_name)
        model_pipeline = resolve_model_pipeline(meta)
        tts_provider = resolve_cascade_tts_provider(meta)
        elevenlabs_voice_id = resolve_elevenlabs_voice_id(meta)
        deepgram_tts_model = resolve_deepgram_tts_model(meta)

    logger.info("create_agent model pipeline: %s", model_pipeline)
    logger.info("create_agent Gemini API key: %s", secret_fingerprint(GEMINI_API_KEY))
    if model_pipeline == "gemini_cascade":
        logger.info("create_agent cascaded TTS provider: %s", tts_provider)
        return create_cascade_agent(
            persona_id,
            persona_name,
            tts_provider,
            elevenlabs_voice_id,
            deepgram_tts_model,
        )

    return create_realtime_agent(persona_id, persona_name)


async def fetch_session_meta(conversation_id: str) -> dict[str, Any]:
    if not PIPELINE_BASE_URL:
        logger.warning("PIPELINE_BASE_URL is not set")
        return {}

    cache_buster = datetime.now(UTC).timestamp()
    url = (
        f"{PIPELINE_BASE_URL}/api/voice-agent"
        f"?conversationId={conversation_id}&ts={cache_buster}"
    )
    headers = {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 404:
                logger.warning("No session metadata found for call_id=%s", conversation_id)
                return {}
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.exception("Failed to fetch session metadata for %s: %s", conversation_id, e)
        return {}

async def join_call(agent: Agent, call_type: str, call_id: str) -> None:
    meta = await fetch_session_meta(call_id)

    conversationId = str(meta.get("conversationId") or call_id)
    userId = str(meta.get("userId") or "unknown-user")
    personaId = str(meta.get("personaId") or "assistant")
    personaName = str(meta.get("personaName") or "Persona")
    userName = str(meta.get("userName") or "User")
    modelPipeline = resolve_model_pipeline(meta)
    voiceName = resolve_voice_name(meta)
    base_instructions = str(meta.get("instructions") or DEFAULT_INSTRUCTIONS)
    instructions = build_effective_instructions(base_instructions, modelPipeline)
    agent.agent_user = User(id=personaId, name=personaName)
    agent.instructions = Instructions(input_text=instructions)
    agent.llm.set_instructions(agent.instructions)
    if isinstance(agent.llm, AudioOnlyGeminiRealtime):
        agent.llm._base_config.update(build_realtime_gemini_config(voiceName))
    agent.transcripts = TranscriptStore(agent_user_id=personaId)
    if hasattr(agent.logger, "extra") and isinstance(agent.logger.extra, dict):
        agent.logger.extra["agent_id"] = personaId

    session = SessionState(
        conversationId=conversationId,
        userId=userId,
        userName=userName,
        modelPipeline=modelPipeline,
        voiceName=voiceName,
        personaId=personaId,
        personaName=personaName,
        instructions=instructions,
    )
    sessions[conversationId] = session

    logger.info("join_call start: %s", conversationId)
    logger.info(
        "join_call instruction preview: %s",
        instruction_preview(instructions),
    )
    logger.info("join_call model pipeline: %s", modelPipeline)
    logger.info("join_call voice: %s", voiceName)

    session_done = asyncio.Event()

    def apply_runtime_instructions(next_instructions: str) -> None:
        if not next_instructions.strip():
            logger.info(
                "Skipping runtime instruction update for %s because instructions were empty",
                conversationId,
            )
            return

        previous_preview = instruction_preview(session.instructions)
        next_preview = instruction_preview(next_instructions)

        agent.instructions = Instructions(input_text=next_instructions)
        agent.llm.set_instructions(agent.instructions)
        session.instructions = next_instructions
        logger.info(
            "Applied runtime memory update for %s",
            conversationId,
        )
        logger.info(
            "Runtime instruction update for %s previous preview: %s",
            conversationId,
            previous_preview,
        )
        logger.info(
            "Runtime instruction update for %s new preview: %s",
            conversationId,
            next_preview,
        )

    def flush_pipeline_events() -> None:
        if session.events_flushed:
            logger.info("flush_pipeline_events already flushed")
            return

        if not session.userId:
            logger.warning("flush_pipeline_events skipped: missing user_id")
            return

        turns = merge_transcript_turns(session.transcript, session)
        transcript_text = json.dumps(turns, ensure_ascii=False)

        post_pipeline_event(
            {
                "type": "call.transcription_ready",
                "conversationId": session.conversationId,
                "userId": session.userId,
                "transcriptText": transcript_text,
                "summary": "",
                "turnCount": len(turns),
                "modelPipeline": session.modelPipeline,
                "speechMetrics": build_speech_metrics_payload(session),
            }
        )

        logger.info("flush_pipeline_events transcription event posted")
        session.events_flushed = True

    async def maybe_emit_transcript_snapshot() -> None:
        turns = merge_transcript_turns(session.transcript, session)

        if len(turns) <= session.last_snapshot_turn_count:
            return

        if session.snapshot_task and not session.snapshot_task.done():
            return

        payload = {
            "type": "call.transcript_snapshot",
            "conversationId": session.conversationId,
            "userId": session.userId,
            "transcriptText": json.dumps(turns, ensure_ascii=False),
            "turnCount": len(turns),
            "modelPipeline": session.modelPipeline,
        }

        session.last_snapshot_turn_count = len(turns)
        session.snapshot_task = asyncio.create_task(post_pipeline_event_async(payload))

    async def watch_memory_updates() -> None:
        while not session_done.is_set():
            await asyncio.sleep(2.0)

            latest_meta = await fetch_session_meta(session.conversationId)
            latest_base_instructions = str(latest_meta.get("instructions") or "").strip()
            latest_instructions = (
                build_effective_instructions(
                    latest_base_instructions,
                    session.modelPipeline,
                )
                if latest_base_instructions
                else ""
            )

            if latest_instructions and latest_instructions != session.instructions:
                logger.info(
                    "watch_memory_updates detected new instructions for %s: %s",
                    session.conversationId,
                    instruction_preview(latest_instructions),
                )
                apply_runtime_instructions(latest_instructions)

    @agent.events.subscribe
    async def handle_session_started(_: RealtimeConnectedEvent) -> None:
        logger.info("Session started: %s", conversationId)

    @agent.events.subscribe
    async def handle_realtime_audio_input(event: RealtimeAudioInputEvent) -> None:
        session.speech_metrics.observe_audio_input(
            getattr(event, "timestamp", None),
            source="realtime",
        )

    @agent.events.subscribe
    async def handle_realtime_audio_output(event: RealtimeAudioOutputEvent) -> None:
        session.speech_metrics.observe_audio_output(
            getattr(event, "timestamp", None),
            source="realtime",
        )

    @agent.events.subscribe
    async def handle_transcript(event: RealtimeUserSpeechTranscriptionEvent) -> None:
        if not event.text or not event.text.strip():
            return

        is_final = str(getattr(event, "mode", "")).lower() == "final"
        transcript_mode = str(getattr(event, "mode", "")).lower()
        session.speech_metrics.observe_user_transcript(
            getattr(event, "timestamp", None),
            source="realtime",
            is_final=is_final,
        )
        upsert_transcript_entry(
            session,
            speaker="User",
            text=event.text,
            timestamp=getattr(event, "timestamp", None),
            is_final=is_final,
            mode=transcript_mode,
        )
        current_user_text = str(session.transcript[-1].get("text") or event.text)
        await send_live_transcript_event(
            agent,
            speaker="User",
            text=current_user_text,
            is_final=is_final,
        )
        if is_final:
            await maybe_emit_transcript_snapshot()

    @agent.events.subscribe
    async def handle_agent_transcript(event: RealtimeAgentSpeechTranscriptionEvent) -> None:
        if not event.text or not event.text.strip():
            return

        session.speech_metrics.observe_agent_transcript(
            getattr(event, "timestamp", None),
            source="realtime",
        )
        upsert_transcript_entry(
            session,
            speaker="Persona",
            text=event.text,
            timestamp=getattr(event, "timestamp", None),
            is_final=True,
        )
        await send_live_transcript_event(
            agent,
            speaker="Persona",
            text=event.text,
            is_final=True,
        )
        await maybe_emit_transcript_snapshot()

    @agent.events.subscribe
    async def handle_llm_response(event: LLMResponseChunkEvent) -> None:
        source = (
            get_metric_source(session.modelPipeline)
            if session.speech_metrics.mode == "unknown"
            else session.speech_metrics.mode
        )
        session.speech_metrics.observe_llm_chunk(
            getattr(event, "timestamp", None),
            source=source,
        )
        delta = str(getattr(event, "delta", "") or "")
        if session.modelPipeline == "gemini_cascade" and delta.strip():
            session.agent_response_buffer += delta
            current_agent_text = clean_spoken_roleplay_text(session.agent_response_buffer)
            if not current_agent_text or current_agent_text == session.last_live_agent_text:
                return

            upsert_transcript_entry(
                session,
                speaker="Persona",
                text=current_agent_text,
                timestamp=getattr(event, "timestamp", None),
                is_final=False,
                mode="partial",
            )
            session.last_live_agent_text = current_agent_text
            await send_live_transcript_event(
                agent,
                speaker="Persona",
                text=current_agent_text,
                is_final=False,
            )

    @agent.events.subscribe
    async def handle_llm_request_started(event: LLMRequestStartedEvent) -> None:
        session.speech_metrics.observe_llm_request_started(
            getattr(event, "timestamp", None),
            source=(
                get_metric_source(session.modelPipeline)
                if session.speech_metrics.mode == "unknown"
                else session.speech_metrics.mode
            ),
        )

    @agent.events.subscribe
    async def handle_llm_response_completed(event: LLMResponseCompletedEvent) -> None:
        session.speech_metrics.observe_llm_completed(
            getattr(event, "timestamp", None),
            source=(
                get_metric_source(session.modelPipeline)
                if session.speech_metrics.mode == "unknown"
                else session.speech_metrics.mode
            ),
        )
        if session.modelPipeline == "gemini_cascade" and event.text and event.text.strip():
            cleaned_agent_text = clean_spoken_roleplay_text(event.text)
            session.agent_response_buffer = ""
            session.last_live_agent_text = ""
            if not cleaned_agent_text:
                logger.warning("Skipping empty cascaded agent response after narration cleanup")
                return

            upsert_transcript_entry(
                session,
                speaker="Persona",
                text=cleaned_agent_text,
                timestamp=getattr(event, "timestamp", None),
                is_final=True,
                mode="final",
            )
            await send_live_transcript_event(
                agent,
                speaker="Persona",
                text=cleaned_agent_text,
                is_final=True,
            )
            await maybe_emit_transcript_snapshot()

    @agent.events.subscribe
    async def handle_stt_partial(event: STTPartialTranscriptEvent) -> None:
        session.speech_metrics.observe_user_transcript(
            getattr(event, "timestamp", None),
            source="pipeline",
            is_final=False,
        )
        if event.text and event.text.strip():
            upsert_transcript_entry(
                session,
                speaker="User",
                text=event.text,
                timestamp=getattr(event, "timestamp", None),
                is_final=False,
                mode="partial",
            )
            current_user_text = str(session.transcript[-1].get("text") or event.text)
            await send_live_transcript_event(
                agent,
                speaker="User",
                text=current_user_text,
                is_final=False,
            )

    @agent.events.subscribe
    async def handle_stt_final(event: STTTranscriptEvent) -> None:
        session.speech_metrics.observe_user_transcript(
            getattr(event, "timestamp", None),
            source="pipeline",
            is_final=True,
        )
        if event.text and event.text.strip():
            upsert_transcript_entry(
                session,
                speaker="User",
                text=event.text,
                timestamp=getattr(event, "timestamp", None),
                is_final=True,
            )
            current_user_text = str(session.transcript[-1].get("text") or event.text)
            await send_live_transcript_event(
                agent,
                speaker="User",
                text=current_user_text,
                is_final=True,
            )
            await maybe_emit_transcript_snapshot()

    @agent.events.subscribe
    async def handle_turn_started(event: TurnStartedEvent) -> None:
        session.speech_metrics.observe_turn_started(
            getattr(event, "timestamp", None),
            source="pipeline",
        )

    @agent.events.subscribe
    async def handle_turn_ended(event: TurnEndedEvent) -> None:
        session.speech_metrics.observe_turn_ended(
            getattr(event, "timestamp", None),
            source="pipeline",
            duration_ms=getattr(event, "duration_ms", None),
        )

    @agent.events.subscribe
    async def handle_tts_audio(event: TTSAudioEvent) -> None:
        session.speech_metrics.observe_audio_output(
            getattr(event, "timestamp", None),
            source="pipeline",
        )

    @agent.events.subscribe
    async def handle_tts_start(event: TTSSynthesisStartEvent) -> None:
        session.speech_metrics.observe_tts_start(
            getattr(event, "timestamp", None),
            source="pipeline",
        )

    @agent.events.subscribe
    async def handle_tts_complete(event: TTSSynthesisCompleteEvent) -> None:
        session.speech_metrics.observe_tts_complete(
            getattr(event, "timestamp", None),
            source="pipeline",
        )

    @agent.events.subscribe
    async def handle_errors(event: RealtimeErrorEvent) -> None:
        logger.error("Realtime error: %s", event.error_message)
        if not event.is_recoverable:
            session_done.set()

    call = await agent.create_call(call_type, call_id)
    memory_task = asyncio.create_task(watch_memory_updates())
    try:
        async with agent.join(call):
            await agent.finish()
    finally:
        session_done.set()
        if session.snapshot_task is not None:
            await asyncio.gather(session.snapshot_task, return_exceptions=True)
        await asyncio.gather(memory_task, return_exceptions=True)
        flush_pipeline_events()
        sessions.pop(conversationId, None)

if __name__ == "__main__":
    Runner(PipelineAgentLauncher(create_agent=create_agent, join_call=join_call)).cli()

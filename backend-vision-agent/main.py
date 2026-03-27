import asyncio
import json
import logging
import os
from datetime import datetime
from typing import Any
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from urllib.request import Request, urlopen

from dotenv import load_dotenv
import httpx

from vision_agents.core import Agent, AgentLauncher, Runner, User
from vision_agents.plugins import gemini, getstream

from vision_agents.core.llm.events import (
    LLMResponseChunkEvent,
    RealtimeUserSpeechTranscriptionEvent,
    RealtimeAgentSpeechTranscriptionEvent,
    RealtimeConnectedEvent,
    RealtimeDisconnectedEvent,
    RealtimeErrorEvent,
)

logging.basicConfig(level=logging.INFO, force=True)
logger = logging.getLogger(__name__)

# Reduce noisy SDK logs during debugging
logging.getLogger("getstream").setLevel(logging.WARNING)
logging.getLogger("getstream.video").setLevel(logging.WARNING)
logging.getLogger("getstream.video.rtc").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("aioice").setLevel(logging.WARNING)

print("[main] backend-vision-agent main.py loaded")

load_dotenv()

PIPELINE_BASE_URL = os.getenv("VOICE_PIPELINE_URL")
PIPELINE_TOKEN = os.getenv("VOICE_PIPELINE_TOKEN")
VOICE_TRANSPORT = os.getenv("VOICE_TRANSPORT", "stream")

DEFAULT_INSTRUCTIONS = """
you are bob. 
impatient and vuger, cam to complain that the healthcare system is bad. 
you are talking to a customer service agent, but you are not happy with the service. 
you want to vent your frustration and make the agent understand how bad the healthcare system is. 
you want to make the agent feel bad for you and understand your pain. 
you want to make the agent feel like they are part of the problem and that they should do something about it. 
you want to make the agent feel like they are responsible for your suffering and that they should do something to help you. 
you want to make the agent feel like they are part of the solution and that they should do something to help you. 
you want to make the agent feel like they are part of the problem and that they should do something about it.
"""


@dataclass
class SessionState:
    conversationId: str
    userId: str
    personaId: str
    personaName: str
    userName: str
    instructions: str
    transcript: List[Dict[str, Any]] = field(default_factory=list)
    summary: Optional[str] = None
    events_flushed: bool = False


sessions: Dict[str, SessionState] = {}

def post_pipeline_event(payload: Dict[str, Any]) -> None:
    for k, v in payload.items():
        print(k, type(v), repr(v))
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


def summarize_transcript(transcript: List[Dict[str, Any]]) -> str:
    return transcript

def normalize_speaker_label(speaker: str, session: SessionState) -> str:
    if not speaker or speaker == "Speaker":
        return "User"

    if speaker == session.personaId:
        return session.personaName or "Agent"

    return "User"


def normalize_speaker_label(speaker: str, session: SessionState) -> str:
    if not speaker or speaker == "Unknown":
        return "User"

    if speaker == session.personaId:
        return session.personaName or "Persona"

    return speaker


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
    print(merged)

    return merged
    

async def create_agent(**kwargs: Any) -> Agent:

    persona_id = "null-persona-id"
    persona_name = "Persona"

    if VOICE_TRANSPORT != "stream":
        raise ValueError(f"Unsupported transport: {VOICE_TRANSPORT}")

    return Agent(
        edge=getstream.Edge(),
        agent_user=User(id=persona_id, name=persona_name),
        instructions=DEFAULT_INSTRUCTIONS,
        llm=gemini.Realtime(
            fps=0,
            config={
                "speech_config": {
                    "language_code": "en-US",
                },
            },
        ),
    )
async def fetch_session_meta(conversation_id: str) -> dict[str, Any]:
    if not PIPELINE_BASE_URL:
        logger.warning("PIPELINE_BASE_URL is not set")
        return {}

    url = f"{PIPELINE_BASE_URL}/api/voice-agent?conversationId={conversation_id}"
    headers = {}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 404:
                logger.warning("No session metadata found for call_id=%s", conversation_id)
                return {}
            response.raise_for_status()
            data = response.json()
            logger.info("Fetched session metadata for %s: %s", conversation_id, data)
            return data
    except Exception as e:
        logger.exception("Failed to fetch session metadata for %s: %s", conversation_id, e)
        return {}

async def join_call(agent: Agent, call_type: str, call_id: str) -> None:
    logger.info("join_call call_id: %s", call_id)

    meta = await fetch_session_meta(call_id)

    conversationId = str(meta.get("conversationId") or call_id)
    userId = str(meta.get("userId") or "unknown-user")
    personaId = str(meta.get("personaId") or "assistant")
    personaName = str(meta.get("personaName") or "Persona")
    userName = str(meta.get("userName") or "User")
    instructions = str(meta.get("instructions") or DEFAULT_INSTRUCTIONS)

    agent.agent_user = User(id=personaId, name=personaName)
    agent.instructions = type(agent.instructions)(instructions)

    session = SessionState(
        conversationId=conversationId,
        userId=userId,
        userName=userName,
        personaId=personaId,
        personaName=personaName,
        instructions=instructions,
    )
    sessions[conversationId] = session

    print(f"[join_call] start for conversation {conversationId}")
    logger.info("join_call start: %s", conversationId)
    logger.info("join_call persona_name: %s", agent.agent_user)
    logger.info("join_call instruction: %s", agent.instructions)

    session_done = asyncio.Event()

    def flush_pipeline_events() -> None:
        if session.events_flushed:
            logger.info("flush_pipeline_events already flushed")
            return

        if not session.userId:
            logger.warning("flush_pipeline_events skipped: missing user_id")
            return

        session.summary = summarize_transcript(session.transcript)
        turns = merge_transcript_turns(session.transcript, session)
        transcript_text = json.dumps(turns, ensure_ascii=False)
        logger.info("flush_pipeline_events transcript entries: %s", len(session.transcript))
        logger.info("flush_pipeline_events summary length: %s", len(session.summary or ""))

        post_pipeline_event(
            {
                "type": "call.transcription_ready",
                "conversationId": session.conversationId,
                "userId": session.userId,
                "transcriptText": transcript_text,
                "summary": transcript_text,
            }
        )

        logger.info("flush_pipeline_events transcription event posted")
        session.events_flushed = True

    @agent.events.subscribe
    async def handle_session_started(event: RealtimeConnectedEvent) -> None:
        logger.info("Session started: %s", conversationId)

    @agent.events.subscribe
    async def handle_transcript(event: RealtimeUserSpeechTranscriptionEvent) -> None:
        if not event.text or not event.text.strip():
            return

        session.transcript.append(
            {
                "speaker": "User",
                "text": event.text,
                "timestamp": getattr(event, "timestamp", None),
            }
        )

    @agent.events.subscribe
    async def handle_agent_transcript(event: RealtimeAgentSpeechTranscriptionEvent) -> None:
        if not event.text or not event.text.strip():
            return

        session.transcript.append(
            {
                "speaker": "Persona",
                "text": event.text,
                "timestamp": getattr(event, "timestamp", None),
            }
        )

    @agent.events.subscribe
    async def handle_llm_response(event: LLMResponseChunkEvent) -> None:
        if hasattr(event, "delta") and event.delta:
            logger.info("Agent response chunk received")

    @agent.events.subscribe
    async def handle_errors(event: RealtimeErrorEvent) -> None:
        logger.info("handle_errors received")
        logger.error("Realtime error: %s", event.error_message)
        if not event.is_recoverable:
            logger.info("handle_errors non-recoverable, ending session")
            session_done.set()

    call = await agent.create_call(call_type, call_id)
    try:
        async with agent.join(call):
            await agent.finish()
    finally:
        session_done.set()
        flush_pipeline_events()
        print(f"Session ended: {conversationId}")
        sessions.pop(conversationId, None)

if __name__ == "__main__":
    Runner(AgentLauncher(create_agent=create_agent, join_call=join_call)).cli()

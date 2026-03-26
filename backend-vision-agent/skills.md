---
name: Agent
description: Use when building real-time voice and video AI agents, integrating with LLMs and speech services, deploying to production, or adding tools and knowledge bases to agents. Reach for this skill when working with voice assistants, video analysis, phone bots, or multi-modal AI applications.
metadata:
    mintlify-proj: agent
    version: "1.0"
---

# Vision Agents Skill

## Product Summary

Vision Agents is an open-source Python framework for building real-time voice and video AI applications. It provides a modular `Agent` class that orchestrates LLMs, speech services (STT/TTS), video processors, and external tools via MCP. The framework ships with 25+ provider integrations (OpenAI, Gemini, Deepgram, ElevenLabs, etc.) and Stream's global edge network for low-latency transport, but is transport-agnostic.

**Key files and commands:**
- Install: `uv add vision-agents` (add extras for providers: `uv add "vision-agents[gemini,deepgram,elevenlabs]"`)
- Core class: `vision_agents.core.Agent` — the central orchestrator
- CLI modes: `uv run agent.py run` (console) or `uv run agent.py serve` (HTTP server)
- Config: `.env` file for API keys (auto-loaded via `python-dotenv`)
- Primary docs: https://visionagents.ai

## When to Use

Reach for this skill when:
- **Building voice agents** — customer support bots, voice assistants, phone systems (Twilio integration)
- **Building video agents** — real-time video analysis, pose detection, object recognition, avatars
- **Choosing LLM/STT/TTS providers** — need to swap providers or mix-and-match services
- **Deploying to production** — Docker, Kubernetes, HTTP server, horizontal scaling
- **Adding tools to agents** — function calling, MCP servers, RAG (Gemini FileSearch or TurboPuffer)
- **Testing agent behavior** — verifying tool calls, responses, and intent without audio/video
- **Integrating with external services** — Twilio for calling, GitHub via MCP, knowledge bases

## Quick Reference

### Two Core Modes

| Mode | Best For | Setup |
|------|----------|-------|
| **Realtime** | Lowest latency, native speech-to-speech | `llm=gemini.Realtime()` or `openai.Realtime()` — no separate STT/TTS needed |
| **Custom Pipeline** | Full control over STT, LLM, TTS | `llm=gemini.LLM()`, `stt=deepgram.STT()`, `tts=elevenlabs.TTS()` |

### Essential Agent Configuration

```python
from vision_agents.core import Agent, User
from vision_agents.plugins import getstream, gemini, deepgram, elevenlabs

agent = Agent(
    edge=getstream.Edge(),                    # Transport layer
    agent_user=User(name="Assistant", id="agent"),
    instructions="You're a helpful assistant.",
    llm=gemini.LLM("gemini-2.5-flash"),      # Or Realtime()
    stt=deepgram.STT(),                       # Optional for realtime mode
    tts=elevenlabs.TTS(),                     # Optional for realtime mode
    processors=[],                            # Video processors (YOLO, etc.)
    mcp_servers=[],                           # External tools via MCP
)
```

### Provider Installation

| Category | Plugins | Install |
|----------|---------|---------|
| **Realtime** | OpenAI, Gemini, Qwen, AWS Nova | `uv add "vision-agents[openai,gemini,qwen,aws]"` |
| **LLM** | OpenAI, Gemini, OpenRouter, xAI, Anthropic | `uv add "vision-agents[openai,gemini,openrouter,xai]"` |
| **STT** | Deepgram, Fish, Fast-Whisper, Wizper | `uv add "vision-agents[deepgram,fish,fast_whisper,wizper]"` |
| **TTS** | ElevenLabs, Cartesia, Deepgram, Kokoro, Pocket, AWS Polly | `uv add "vision-agents[elevenlabs,cartesia,kokoro,pocket,aws]"` |
| **Vision** | NVIDIA, Ultralytics, Roboflow, Moondream, HuggingFace | `uv add "vision-agents[nvidia,ultralytics,roboflow,moondream,huggingface]"` |
| **RAG** | TurboPuffer, Gemini FileSearch | `uv add "vision-agents[turbopuffer]"` |

### Running Agents

```bash
# Console mode (single agent, development)
uv run agent.py run

# HTTP server mode (production, multiple sessions)
uv run agent.py serve --host 0.0.0.0 --port 8000

# With video override for testing
uv run agent.py run --video-track-override=/path/to/video.mp4
```

### HTTP Server Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/calls/{call_id}/sessions` | Start a new agent session |
| DELETE | `/calls/{call_id}/sessions/{session_id}` | Close a session |
| GET | `/calls/{call_id}/sessions/{session_id}` | Get session info |
| GET | `/calls/{call_id}/sessions/{session_id}/metrics` | Real-time performance metrics |
| GET | `/health` | Liveness probe |
| GET | `/ready` | Readiness probe |

### Function Calling & Tools

```python
# Register Python functions
@llm.register_function(description="Get weather for a location")
async def get_weather(location: str) -> dict:
    return {"temperature": "22°C", "condition": "Sunny"}

# Connect MCP servers for external tools
from vision_agents.core.mcp import MCPServerRemote
github_server = MCPServerRemote(
    url="https://api.githubcopilot.com/mcp/",
    headers={"Authorization": f"Bearer {token}"}
)
agent = Agent(..., mcp_servers=[github_server])
```

## Decision Guidance

### When to Use Realtime vs Custom Pipeline

| Scenario | Use Realtime | Use Custom Pipeline |
|----------|--------------|---------------------|
| Lowest latency required | ✓ | |
| Need specific STT provider | | ✓ |
| Need specific TTS provider | | ✓ |
| Want turn detection control | | ✓ |
| Fastest to prototype | ✓ | |
| Full control over flow | | ✓ |
| Using OpenAI or Gemini | ✓ | ✓ |

### When to Use Gemini FileSearch vs TurboPuffer for RAG

| Factor | Gemini FileSearch | TurboPuffer |
|--------|-------------------|------------|
| Setup complexity | Simple | More setup |
| Chunking | Automatic | Configurable |
| Search type | Managed | Hybrid (vector + BM25) |
| Control | Less | Full |
| Cost | Included with Gemini | Separate service |
| Production use | Good for prototypes | Better for production |

### When to Deploy CPU vs GPU

| Workload | CPU | GPU |
|----------|-----|-----|
| Voice agents with cloud APIs | ✓ | |
| Video agents with cloud VLMs | ✓ | |
| Local model inference (YOLO, Roboflow) | | ✓ |
| Local VLMs (Qwen2-VL, etc.) | | ✓ |
| Most production deployments | ✓ | |

## Workflow

### Building a Voice Agent

1. **Set up environment** — Create `.env` with API keys (Stream, LLM provider, STT, TTS)
2. **Choose mode** — Realtime (fastest) or custom pipeline (most control)
3. **Create agent** — Instantiate `Agent` with `edge`, `llm`, and optional `stt`/`tts`
4. **Register tools** — Use `@llm.register_function()` or attach MCP servers
5. **Define join logic** — Implement `join_call()` to handle agent behavior when joining
6. **Test locally** — Run `uv run agent.py run` to test in console mode
7. **Deploy** — Use `Runner` with HTTP server for production, Docker for containerization

### Building a Video Agent

1. **Choose video approach** — Realtime (native video), VLM (frame buffering), or Processors (detection)
2. **Set fps** — Configure frames per second: `llm=gemini.Realtime(fps=3)`
3. **Add processors** — Chain video processors before LLM: `processors=[ultralytics.YOLOPoseProcessor()]`
4. **Buffer frames** — For VLMs, set `frame_buffer_seconds=10`
5. **Test with video file** — Use `--video-track-override=/path/to/video.mp4` for reproducible testing
6. **Deploy** — Same as voice agents; GPU only needed for local model inference

### Adding RAG to an Agent

1. **Choose RAG backend** — Gemini FileSearch (simple) or TurboPuffer (full control)
2. **Create store** — `store = gemini.GeminiFilesearchRAG(name="kb")` or `rag = turbopuffer.TurboPufferRAG()`
3. **Add documents** — `await store.add_directory("./knowledge")`
4. **Register search function** — `@llm.register_function()` wrapping `rag.search()`
5. **Test** — Verify agent retrieves and uses knowledge in responses

### Deploying to Production

1. **Prepare Docker** — Use provided `Dockerfile` (CPU) or `Dockerfile.gpu` (GPU)
2. **Set environment variables** — Create `.env` with all API keys
3. **Build image** — `docker buildx build --platform linux/amd64 -t vision-agent .`
4. **Configure health checks** — Set liveness (`/health`) and readiness (`/ready`) probes
5. **Scale horizontally** — Use Redis-backed `SessionRegistry` for multi-node deployments
6. **Monitor** — Export metrics to Prometheus via telemetry

### Testing Agent Behavior

1. **Import test utilities** — `from vision_agents.testing import TestSession, LLMJudge`
2. **Create test session** — `async with TestSession(llm=llm, instructions="...") as session:`
3. **Send input** — `response = await session.simple_response("user input")`
4. **Assert tool calls** — `response.assert_function_called("tool_name", arguments={...})`
5. **Judge intent** — `verdict = await judge.evaluate(response.chat_messages[0], intent="...")`
6. **Run tests** — `uv run pytest tests/ -m integration`

## Common Gotchas

- **Async-only functions** — `@llm.register_function()` only accepts `async def`, not sync functions. Wrap sync code in `async def` if needed.
- **Missing API keys** — Agent silently fails if `.env` keys are missing. Always verify keys are loaded: `load_dotenv()` before creating agent.
- **Realtime mode doesn't need STT/TTS** — Don't configure both `llm=openai.Realtime()` and `stt=deepgram.STT()` — realtime models handle speech natively.
- **Call IDs must match pattern** — HTTP server requires `call_id` to match `^[a-z0-9_-]+$` (lowercase, hyphens, underscores only). Invalid IDs return HTTP 400.
- **Session limits not enforced by default** — Set `max_concurrent_sessions`, `max_sessions_per_call`, or `max_session_duration_seconds` in `AgentLauncher` to prevent resource exhaustion.
- **Video processors run before LLM** — Processors intercept frames and annotate them; results are forwarded to the LLM. Order matters if chaining multiple processors.
- **Frame buffering adds latency** — VLMs buffer frames (e.g., `frame_buffer_seconds=10`); this improves accuracy but increases response time. Tune for your use case.
- **Gemini FileSearch deduplicates by content hash** — Uploading the same file twice won't create duplicates, but updating a file requires deleting the old store first.
- **TurboPuffer requires separate service** — Unlike Gemini FileSearch, TurboPuffer is a separate paid service. Ensure namespace and API key are configured.
- **MCP servers must be async** — Local MCP servers are spawned via subprocess; ensure they implement the MCP protocol correctly.
- **Horizontal scaling requires Redis** — Default `AgentLauncher` uses in-memory session registry. For multi-node deployments, configure `SessionRegistry` with Redis.
- **Docker build must target linux/amd64** — Use `docker buildx build --platform linux/amd64` for cloud deployment, not native platform.
- **GPU Dockerfile requires matching CUDA version** — Ensure CUDA drivers on the host match the version in `Dockerfile.gpu`.

## Verification Checklist

Before submitting agent code or deploying to production:

- [ ] All required API keys are in `.env` and loaded via `load_dotenv()`
- [ ] Agent mode is correct: Realtime (no STT/TTS) or Custom Pipeline (STT + TTS configured)
- [ ] LLM provider is installed: `uv add "vision-agents[provider]"`
- [ ] Functions are registered as `async def` with `@llm.register_function()`
- [ ] MCP servers (if used) are properly initialized and passed to `Agent`
- [ ] Video processors (if used) are in correct order and inherit from `VideoProcessor`
- [ ] RAG store is created and populated before agent starts
- [ ] HTTP server endpoints are tested: `/health`, `/ready`, `/calls/{id}/sessions`
- [ ] Session limits are configured if deploying to production
- [ ] Docker image builds for `linux/amd64` platform
- [ ] Environment variables are set in deployment (not hardcoded)
- [ ] Health checks are configured in Kubernetes/orchestration
- [ ] Metrics are exported to monitoring system (Prometheus)
- [ ] Agent behavior is tested with `TestSession` before deployment
- [ ] Call IDs follow pattern `^[a-z0-9_-]+$` in production
- [ ] Redis is configured if scaling horizontally across multiple nodes

## Resources

**Comprehensive navigation:** https://visionagents.ai/llms.txt

**Critical documentation pages:**
- [Installation & Plugins](https://visionagents.ai/introduction/installation) — All available providers and how to install them
- [Agent Class Reference](https://visionagents.ai/core/agent-core) — Constructor parameters, lifecycle methods, event system
- [HTTP Server & Deployment](https://visionagents.ai/guides/http-server) — Running agents as a server, session management, scaling

---

> For additional documentation and navigation, see: https://visionagents.ai/llms.txt
"""
Prototype Web UI: FastAPI + WebSockets for streaming audio and live transcripts.

Scope:
- / (GET) serve minimal HTML/JS client.
- /ws/audio accepts binary PCM16 16k mono frames from browser mic.
- /ws/events provides a unified event stream (JSON messages) to clients:
	{"event":"partial","text":"..."}
	{"event":"token","text":"..."}
	{"event":"clause","text":"...","wav":"logs/stream_clause_*.wav"}
	{"event":"metrics","ttfb_first_partial_ms":..., ...}
- Session ends when client sends a JSON control message {"control":"stop"} to /ws/audio.

Simplifications:
- Single session in process.
- No authentication.
- TTS writes clause WAV files to logs/ and sends path; client could fetch & play later.
- Dialog state/continuity metrics are placeholders; can integrate entity tracking.

Run:
	uvicorn src.apps.interactive_web:app --host 0.0.0.0 --port 8000

Browser client (served at /) captures microphone, sends PCM16 frames ~every 200ms.
"""
import asyncio
import json
from pathlib import Path
from typing import Set, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
import os
import torch

from src.asr.faster_whisper_stream import FasterWhisperStream
from src.llm.llama_cpp_impl import LlamaCppLLM
from src.tts.coqui_impl import CoquiTTS
from src.pipeline.orchestrator import Orchestrator
from src.common.logging_utils import JsonlLogger
from src.common.timers import now_ms

HTML = ""  # Inline HTML removed; frontend is served by Vite.

app = FastAPI()
app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:5173","http://127.0.0.1:5173"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"]
)

import yaml
llm = None
tts = None
LLM_CFG_PATH = "configs/llm_llamacpp.yaml"
TTS_CFG_PATH = "configs/tts_lowlat.yaml"
force_llm_impl: Optional[str] = None  # 'stub' | 'llama' | None

async def broadcast_debug(text: str):
	await broadcast({"event":"debug","text":text})

def load_models():
	global llm, tts
	if llm is None:
		try:
			if force_llm_impl == 'stub':
				raise RuntimeError("Forced stub LLM")
			llm_cfg = yaml.safe_load(Path(LLM_CFG_PATH).read_text(encoding="utf-8"))
			_llm = LlamaCppLLM(
				model_path=llm_cfg["model_path"],
				n_ctx=llm_cfg.get("n_ctx",2048),
				n_gpu_layers=llm_cfg.get("n_gpu_layers",35),
				temperature=llm_cfg.get("temperature",0.7),
				max_tokens=llm_cfg.get("max_tokens",64),
				stop=llm_cfg.get("stop", None)
			)
			llm = _llm
		except Exception:
			from src.llm.stub_impl import StubLLM
			llm = StubLLM(template="You said: {asr_text}")
	if tts is None:
		try:
			tts_cfg = yaml.safe_load(Path(TTS_CFG_PATH).read_text(encoding="utf-8"))
			tts_local = CoquiTTS(
				model_name=tts_cfg.get("model_name"),
				vocoder_name=tts_cfg.get("vocoder_name"),
				device=tts_cfg.get("device","cuda")
			)
			tts = tts_local
		except Exception:
			tts = None

@app.get("/api/init")
async def api_init(llm: Optional[str] = None):
	global force_llm_impl
	if llm in {"stub","llama"}:
		force_llm_impl = llm
		# force reload of LLM on next use
		globals()["llm"] = None
	load_models()
	status = get_backend_status()
	try:
		await broadcast_debug(f"Backend init: LLM={status['llm']['impl']} TTS={status['tts']['impl']} CUDA={status['torch']['cuda']} GPU={status['torch']['device_name']}")
	except Exception:
		pass
	return JSONResponse(status)

@app.get("/api/health")
async def api_health():
    return JSONResponse({"status":"up"})

@app.get("/api/status")
async def api_status():
	return JSONResponse(get_backend_status())

def get_backend_status():
	# torch / cuda status
	cuda = False
	device_name = None
	try:
		cuda = bool(torch.cuda.is_available())
		if cuda:
			device_name = torch.cuda.get_device_name(0)
	except Exception:
		pass
	# LLM status
	llm_status = {"impl":"stub","details":{}}
	if llm is not None:
		impl = getattr(llm, "__class__", type(llm)).__name__
		llm_status["impl"] = impl
		# try to extract llama settings if present
		try:
			from src.llm.llama_cpp_impl import LlamaCppLLM
			if isinstance(llm, LlamaCppLLM):
				llm_status["details"] = {"type":"llama_cpp"}
		except Exception:
			pass
	# include forced impl, if any
	if force_llm_impl:
		llm_status["forced"] = force_llm_impl
	# TTS status
	tts_status = {"impl":"none","details":{}}
	if tts is not None:
		tts_status["impl"] = getattr(tts, "__class__", type(tts)).__name__
		tts_status["details"] = {}
	# ASR default settings (per-connection instance uses these defaults)
	asr_compute = "float16" if cuda else "int8"
	asr_status = {"impl":"faster_whisper","model_size":"small","compute_type_default": asr_compute}
	return {
		"torch": {"cuda": cuda, "device_name": device_name},
		"llm": llm_status,
		"tts": tts_status,
		"asr": asr_status,
	}

logger = JsonlLogger("logs/session_web.jsonl")
clients: Set[WebSocket] = set()

async def broadcast(payload: dict):
	data = json.dumps(payload)
	for ws in list(clients):
		try:
			await ws.send_text(data)
		except Exception:
			clients.discard(ws)

FRONTEND_URL = os.environ.get("FRONTEND_URL")

@app.get("/")
async def index():
		# Prefer external/frontend app (Vite) for UI; fallback to minimal info page
		if FRONTEND_URL:
				return RedirectResponse(FRONTEND_URL)
		# Fallback: show a short message pointing to Vite dev server
		fallback = """
		<!doctype html><meta charset="utf-8" />
		<title>SpeechCoach Backend</title>
		<body style="background:#0e0e10;color:#e0e0e0;font-family:Arial;padding:1rem">
			<h2>SpeechCoach Backend is running</h2>
			<p>Launch the frontend (Vite) in another terminal and open <a href="http://localhost:5173">http://localhost:5173</a>.</p>
			<ul>
				<li>Health: <a href="/api/health">/api/health</a></li>
				<li>Init: <code>GET /api/init</code></li>
				<li>WebSockets: <code>ws://localhost:8000/ws/audio</code>, <code>ws://localhost:8000/ws/events</code></li>
			</ul>
			<p>To auto-redirect, set environment variable FRONTEND_URL to your frontend URL.</p>
		</body>
		"""
		return HTMLResponse(fallback)

@app.websocket("/ws/events")
async def events_ws(ws: WebSocket):
	await ws.accept()
	print("[backend] /ws/events accepted")
	clients.add(ws)
	try:
		status = get_backend_status()
		await broadcast_debug(f"Events WS subscribed. CUDA={status['torch']['cuda']} GPU={status['torch']['device_name']} ASR compute default={status['asr']['compute_type_default']}")
		while True:
			await asyncio.sleep(1)
	except WebSocketDisconnect:
		clients.discard(ws)

@app.websocket("/ws/audio")
async def audio_ws(ws: WebSocket):
	await ws.accept()
	print("[backend] /ws/audio accepted")
	# Per-connection ASR (avoid cross-session buffer pollution)
	# Ensure models are loaded even if client skipped /api/init
	try:
		load_models()
	except Exception:
		pass
	# Choose ASR compute_type based on CUDA availability
	compute_type = "float16" if torch.cuda.is_available() else "int8"
	local_asr = FasterWhisperStream(model_size="small", compute_type=compute_type, language="en")
	async def _dbg(msg: str):
		try:
			await broadcast({"event":"debug","text":msg})
		except Exception:
			pass
	orchestrator = Orchestrator(local_asr, llm, tts, logger, save_clauses=False, min_llm_chars=12, llm_debounce_ms=600, debug_callback=_dbg)
	await broadcast_debug(f"Audio WS accepted; session starting (ASR compute={compute_type})")

	async def audio_gen():
		chunks = 0
		total = 0
		while True:
			msg = await ws.receive()
			if msg.get("type") == "websocket.disconnect":
				break
			if msg["type"] == "websocket.receive" and "bytes" in msg:
				b = msg["bytes"]
				if chunks == 0:
					try:
						await broadcast_debug(f"Audio: first chunk {len(b)} bytes")
					except Exception:
						pass
				chunks += 1
				total += len(b)
				if chunks % 20 == 0:
					try:
						await broadcast_debug(f"Audio: received {chunks} chunks, {total} bytes total")
					except Exception:
						pass
				yield b
			elif msg["type"] == "websocket.receive" and "text" in msg:
				try:
					obj = json.loads(msg["text"])
				except Exception:
					obj = {}
				if obj.get("control") == "stop":
					break
		# generator end
	async def partial_forwarder():
		full=""
		while True:
			delta = await orchestrator.partial_queue.get()
			if delta is None:
				break
			# Empty string sentinel means clear (utterance boundary reset)
			if delta == "":
				full = ""
				await broadcast({"event":"partial","text":full})
				continue
			full += delta
			await broadcast({"event":"partial","text":full})
	async def clause_forwarder():
			while True:
				item = await orchestrator.clause_queue.get()
				if item is None:
					break
				if isinstance(item, dict):
					await broadcast({"event":"clause", **item})
				else:
					await broadcast({"event":"clause","text":str(item)})

	async def llm_token_forwarder():
		first = True
		while True:
			tok = await orchestrator.token_queue.get()
			if tok is None:
				break
			if first:
				try:
					await broadcast_debug("LLM: first token")
				except Exception:
					pass
				first = False
			await broadcast({"event":"token","text":tok})

	session_task = asyncio.create_task(orchestrator.run_session(audio_gen()))
	fwd_tok = asyncio.create_task(llm_token_forwarder())
	fwd_par = asyncio.create_task(partial_forwarder())
	fwd_cla = asyncio.create_task(clause_forwarder())
	summary = await session_task
	await asyncio.gather(fwd_tok, fwd_par, fwd_cla)
	await broadcast({"event":"metrics", **summary})
	logger.log(event="session_summary", **summary)
	try:
		await broadcast_debug("Session finished")
	except Exception:
		pass
	await ws.close()

@app.on_event("shutdown")
async def shutdown_event():
	logger.close()

if __name__ == "__main__":
	import uvicorn
	uvicorn.run("src.apps.interactive_web:app", host="0.0.0.0", port=8000, reload=False)

from fastapi import Query

# Global variable to store the current mode
current_mode = "streaming"

@app.get("/api/set_mode")
async def set_mode(mode: str = Query("streaming", regex="^(streaming|turn_based)$")):
    global current_mode
    current_mode = mode
    await broadcast_debug(f"Mode set to: {current_mode}")
    return JSONResponse({"status": "success", "mode": current_mode})

@app.get("/api/get_mode")
async def get_mode():
    return JSONResponse({"mode": current_mode})

@app.post("/api/submit_turn")
async def submit_turn(request: Request):
    data = await request.json()
    user_text = data.get("text", "")

    if not user_text:
        return JSONResponse({"error": "No text provided"}, status_code=400)

    try:
        # Notify ASR, LLM, and TTS states
        await broadcast_debug("ASR: Processing completed")
        await broadcast_debug("LLM: Generating response")

        # Process the text with LLM
        llm_response = llm.generate(f"User: {user_text}\nAssistant:")
        await broadcast_debug("LLM: Response generated")

        # Generate TTS audio
        audio_path = f"logs/response_{now_ms()}.wav"
        await broadcast_debug("TTS: Generating audio")
        tts.synth_to_file(llm_response, audio_path)
        await broadcast_debug("TTS: Audio generated")

        # Play the TTS audio
        return JSONResponse({"text": llm_response, "audio_url": f"/static/{audio_path}"})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.websocket("/ws/audio/streaming")
async def websocket_audio_streaming(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            # Handle streaming ASR
            asr_result = asr.process_stream(data)
            await websocket.send_text(asr_result)
    except WebSocketDisconnect:
        pass

@app.websocket("/ws/audio/turn_based")
async def websocket_audio_turn_based(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            # Handle turn-based ASR
            asr_result = asr.process_turn(data)
            await websocket.send_text(asr_result)
    except WebSocketDisconnect:
        pass

@app.post("/api/stop_asr/turn_based")
async def stop_asr_turn_based():
    # Trigger submission automatically in turn-based mode
    asr_result = asr.get_final_result()
    return await submit_turn(Request(scope={"type": "http"}, receive=None, send=None, body={"text": asr_result}))

@app.post("/api/stop_asr/streaming")
async def stop_asr_streaming():
    return JSONResponse({"status": "Streaming ASR stopped"})

# Helper function for debug messages
async def broadcast_debug(message: str):
    print(f"DEBUG: {message}")

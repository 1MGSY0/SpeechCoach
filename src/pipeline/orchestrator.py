"""Simple asyncio orchestrator wiring streaming ASR -> LLM token stream -> clause TTS.

Usage example (pseudo):
	orch = Orchestrator(asr_stream, llm, tts, logger)
	await orch.run_session(audio_source())

This is a baseline scaffold; real implementation should:
 - Handle cancellation / barge-in.
 - Include time-to-first-audio metrics.
 - Support overlapping playback.
"""

import asyncio
from typing import AsyncIterable, Optional, Awaitable, Callable
from src.common.timers import now_ms



class Orchestrator:
	def __init__(self, asr_stream, llm, tts, logger, *, save_clauses: bool = False, clause_out_dir: str = "logs", min_clause_chars: int = 8, min_llm_chars: int = 8, llm_debounce_ms: int = 400, pause_rms_thresh: float = 0.01, pause_min_chunks: int = 8, debug_callback: Optional[Callable[[str], Awaitable[None]]] = None):
		self.asr_stream = asr_stream
		self.llm = llm
		self.tts = tts
		self.logger = logger
		self.partial_queue = asyncio.Queue()
		self.token_queue = asyncio.Queue()
		self.clause_queue = asyncio.Queue()
		self.save_clauses = save_clauses
		self.clause_out_dir = clause_out_dir
		self.min_clause_chars = min_clause_chars
		self.min_llm_chars = min_llm_chars
		self.llm_debounce_ms = llm_debounce_ms
		# pause detection and overlap buffering
		self.pause_rms_thresh = pause_rms_thresh
		self.pause_min_chunks = pause_min_chunks
		self._silence_run = 0
		self.generating = False
		# timing metrics
		self._start_ms: Optional[int] = None
		self._first_partial_ms: Optional[int] = None
		self._first_token_ms: Optional[int] = None
		self._first_audio_ms: Optional[int] = None
		self._last_partial_ms: Optional[int] = None
		self._debug_cb = debug_callback

	async def _debug(self, text: str):
		if self._debug_cb is not None:
			try:
				await self._debug_cb(text)
			except Exception:
				pass

	async def feed_audio(self, audio_iter: AsyncIterable[bytes]):
		import numpy as np
		async for chunk in audio_iter:
			# Compute RMS to detect pauses (silence runs)
			arr = np.frombuffer(chunk, dtype=np.int16).astype(np.float32) / 32768.0
			rms = float(np.sqrt(np.mean(arr**2))) if arr.size else 0.0
			if rms < self.pause_rms_thresh:
				self._silence_run += 1
			else:
				self._silence_run = 0
			# Always feed ASR (we simulate capture even while assistant replies); overlap buffering is handled in llm_task
			self.asr_stream.accept_audio(chunk)
			partials = self.asr_stream.get_partials()
			if partials:
				if self._first_partial_ms is None:
					self._first_partial_ms = now_ms()
				for _offset, delta in partials:
					await self.partial_queue.put(delta)
			# If we've sustained silence and not currently generating, signal a pause marker to llm_task
			if self._silence_run >= self.pause_min_chunks and not self.generating:
				await self.partial_queue.put("__PAUSE__")
				self._silence_run = 0
		# Signal end
		await self.partial_queue.put(None)

	async def llm_task(self):
		"""Multi-turn gating: repeatedly form user utterances and respond.

		Start conditions (pause simulation):
		 - Accumulated user text >= min_llm_chars AND (pause marker OR punctuation OR debounce timeout).
		Overlap buffering: while generating=True, new partials go to future_buffer. After reply, promote future_buffer.
		"""
		buffer = ""
		future_buffer = ""
		while True:
			try:
				part = await asyncio.wait_for(self.partial_queue.get(), timeout=self.llm_debounce_ms/1000)
			except asyncio.TimeoutError:
				part = "__TIMEOUT__"
			if part is None:
				# End-of-stream: flush current, then any future speech captured
				if len(buffer) >= self.min_llm_chars and not self.generating:
					await self._run_llm_once(buffer)
				buffer = ""
				if len(future_buffer) >= self.min_llm_chars:
					await self._run_llm_once(future_buffer)
				future_buffer = ""
				break
			elif part == "__TIMEOUT__":
				# Debounce acts like a weak pause
				if len(buffer) >= self.min_llm_chars and not self.generating:
					await self._run_llm_once(buffer)
					buffer = ""
				elif 0 < len(buffer) < self.min_llm_chars and not self.generating:
					try:
						self.asr_stream.reset(); await self.partial_queue.put("")
					except Exception:
						pass
					buffer = ""
			elif part == "__PAUSE__":
				if len(buffer) >= self.min_llm_chars and not self.generating:
					await self._run_llm_once(buffer)
					buffer = ""
			else:
				self._last_partial_ms = now_ms()
				if self.generating:
					future_buffer += part
				else:
					buffer += part
				# Punctuation trigger when not generating
				if len(buffer) >= self.min_llm_chars and buffer.endswith((".","!","?")) and not self.generating:
					await self._run_llm_once(buffer)
					buffer = ""
					if len(future_buffer) >= self.min_llm_chars:
						buffer, future_buffer = future_buffer, ""
		# Signal end of token stream
		await self.token_queue.put(None)

	async def _run_llm_once(self, user_text: str):
		prompt = f"User: {user_text}\nAssistant:"
		self.logger.log(event="orchestrator_state", state="llm_start", chars=len(user_text))
		# notify UI that assistant is thinking (no tokens yet)
		await self._debug("Assistant thinking…")
		await self._debug(f"LLM input: {user_text}")
		self.generating = True
		reply_buf = ""
		async for token in self._stream_llm(prompt):
			if self._first_token_ms is None:
				self._first_token_ms = now_ms()
			await self.token_queue.put(token)
			reply_buf += token
		self.logger.log(event="orchestrator_state", state="llm_done", chars=len(user_text))
		await self._debug("llm_done")
		if reply_buf.strip():
			await self._debug(f"LLM reply: {reply_buf.strip()}")
		# Utterance boundary reached; reset ASR to avoid infinite growth of partial transcript
		try:
			self.asr_stream.reset()
			# Push empty string so UI can clear partials immediately
			await self.partial_queue.put("")
		except Exception:
			pass
		self.generating = False

	async def _stream_llm(self, prompt: str):
		# Wrap sync generator in async
		for tok in self.llm.generate_stream(prompt):
			yield tok

	async def tts_task(self):
		clause_buf = ""
		end_tokens = {".", "!", "?"}
		while True:
			tok = await self.token_queue.get()
			if tok is None:
				break
			clause_buf += tok
			if any(clause_buf.endswith(e) for e in end_tokens):
				# Only synthesize if clause has enough content to avoid very short conv lengths
				text = clause_buf.strip()
				if len(text) >= self.min_clause_chars:
					# Synthesize to memory
					wav = self.tts.synth_clauses(text)
					if wav is not None and wav.size > 0:
						if self._first_audio_ms is None:
							self._first_audio_ms = now_ms()
						# Optionally save to disk
						out_wav = None
						if self.save_clauses:
							from pathlib import Path
							import soundfile as sf
							Path(self.clause_out_dir).mkdir(parents=True, exist_ok=True)
							out_wav = str(Path(self.clause_out_dir) / f"stream_clause_{now_ms()}.wav")
							sf.write(out_wav, wav, 22050)
						# Encode WAV to bytes for UI playback
						import io, soundfile as sf, base64
						buf = io.BytesIO()
						sf.write(buf, wav, 22050, format='WAV')
						audio_b64 = base64.b64encode(buf.getvalue()).decode('ascii')
						self.logger.log(event="tts_clause", text=text, wav=out_wav or "", ts_ms=now_ms())
						await self.clause_queue.put({"text": text, "audio_b64": audio_b64})
				# reset buffer regardless
				clause_buf = ""
		# signal clause stream end
		await self.clause_queue.put(None)

	async def run_session(self, audio_iter: AsyncIterable[bytes]):
		self._start_ms = now_ms()
		await asyncio.gather(
			self.feed_audio(audio_iter),
			self.llm_task(),
			self.tts_task(),
		)
		end_ms = now_ms()
		# Return timing summary for this session
		return {
			"ttfb_first_partial_ms": (self._first_partial_ms - self._start_ms) if self._first_partial_ms else None,
			"ttfb_first_token_ms": (self._first_token_ms - self._start_ms) if self._first_token_ms else None,
			"ttfb_first_audio_ms": (self._first_audio_ms - self._start_ms) if self._first_audio_ms else None,
			"e2e_ms": end_ms - self._start_ms,
		}

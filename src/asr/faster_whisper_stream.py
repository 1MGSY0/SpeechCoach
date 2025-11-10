"""
Minimal streaming-ish wrapper for faster-whisper.

Notes:
- This implementation buffers PCM16 mono 16kHz bytes and periodically
  runs decode on the full buffer, then emits only the new text since the
  last emission. This is a simple baseline until true incremental decoding
  is wired.
- VAD is disabled by default to avoid onnxruntime on Windows.
"""

from pathlib import Path
from typing import List, Tuple
import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel


class FasterWhisperStream:
	def __init__(self, model_size: str = "small", compute_type: str = "float16", sample_rate: int = 16000, language: str = "en"):
		"""Lightweight pseudo-streaming wrapper.

		Args:
			model_size: whisper model size (e.g. tiny.en, small, medium)
			compute_type: passed to faster-whisper (float16 / int8_float16 / int8)
			sample_rate: PCM ingest rate (Hz)
			language: language hint for decode
		"""
		self.model = WhisperModel(model_size, compute_type=compute_type)
		self.sample_rate = sample_rate
		self.language = language
		self._buf = bytearray()
		self._last_text = ""

	def reset(self):
		"""Reset internal buffers so a new utterance starts fresh.

		Clears accumulated PCM bytes and the last emitted text snapshot.
		Useful on utterance boundaries to avoid the transcript growing forever.
		"""
		self._buf = bytearray()
		self._last_text = ""

	def accept_audio(self, pcm16_bytes: bytes):
		"""Append raw PCM16 mono bytes at self.sample_rate."""
		self._buf.extend(pcm16_bytes)

	def _decode_all(self) -> str:
		if not self._buf:
			return ""
		# Convert PCM16 bytes to float32 waveform
		audio = np.frombuffer(bytes(self._buf), dtype=np.int16).astype(np.float32) / 32768.0
		# faster-whisper accepts file path or numpy array
		segments, info = self.model.transcribe(
			audio,
			vad_filter=False,
			beam_size=1,
			no_speech_threshold=0.6,
			language=self.language,
		)
		text = " ".join(seg.text for seg in segments).strip()
		return text

	def get_partials(self) -> List[Tuple[int, str]]:
		"""Return list of (char_offset, new_text) since last call."""
		full_text = self._decode_all()
		if not full_text:
			return []
		if full_text.startswith(self._last_text):
			delta = full_text[len(self._last_text):]
		else:
			# model may revise earlier text; emit full
			delta = full_text
		self._last_text = full_text
		return [(len(full_text) - len(delta), delta)]


from typing import Iterator
from pathlib import Path
import time
import numpy as np
import soundfile as sf


def wav_bytes_iter(wav_path: str, chunk_ms: int = 20, realtime: bool = False) -> Iterator[bytes]:
    """Yield mono 16k PCM16 byte chunks from a WAV file.

    If the source is not 16k mono, attempt in-memory resampling to 16 kHz.
    Preferred resampler is soxr; falls back to librosa if available.
    Chunking is by time window.
    """
    p = Path(wav_path)
    audio, sr = sf.read(str(p), dtype="float32")
    # Ensure mono
    if audio.ndim == 2:
        audio = audio.mean(axis=1)
    # Ensure 16k: resample if needed (soxr preferred, librosa fallback)
    if sr != 16000:
        try:
            import soxr  # type: ignore
            audio = soxr.resample(audio, sr, 16000)
            sr = 16000
        except Exception:
            try:
                import librosa  # type: ignore
                audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)
                sr = 16000
            except Exception:
                raise ValueError(
                    f"Expected 16kHz WAV, got {sr} Hz for {wav_path}. "
                    "Install 'soxr' or 'librosa' to enable automatic resampling, or preprocess your audio to 16 kHz."
                )
    # Ensure float32
    if audio.dtype != np.float32:
        audio = audio.astype(np.float32)
    # float32 -> int16 bytes
    pcm16 = (np.clip(audio, -1.0, 1.0) * 32767.0).astype(np.int16)
    frames_per_chunk = int(sr * (chunk_ms / 1000.0))
    if frames_per_chunk <= 0:
        frames_per_chunk = 320  # 20ms at 16kHz
    for i in range(0, len(pcm16), frames_per_chunk):
        chunk = pcm16[i : i + frames_per_chunk]
        if len(chunk) == 0:
            continue
        if realtime:
            time.sleep(chunk_ms / 1000.0)
        yield chunk.tobytes()

from pathlib import Path
import warnings
import soundfile as sf
from faster_whisper import WhisperModel
from .base import ASRResult

# Faster-Whisper's VAD feature requires the onnxruntime package.
# Some environments (Windows missing MSVC runtimes, mismatched wheels, etc.)
# can raise a DLL import error when importing onnxruntime. Detect that
# at import time and fall back to disabling the VAD filter so the rest
# of the ASR pipeline can run normally.
try:
    import onnxruntime  # type: ignore
    _VAD_AVAILABLE = True
except Exception as e:
    _VAD_AVAILABLE = False
    warnings.warn(
        "onnxruntime is not available or failed to import; VAD filter will be disabled. "
        "Install/repair onnxruntime and the MSVC redistributable to re-enable VAD. "
        f"(Import error: {e})",
        RuntimeWarning,
    )

class FasterWhisperASR:
    def __init__(self, model_size="small", compute_type="float16"):
        # If no GPU, use "int8" or "int8_float16" for CPU speed
        self.model = WhisperModel(model_size, compute_type=compute_type)

    def transcribe_file(self, wav_path: str) -> ASRResult:
        wav_path = str(Path(wav_path))
        # Faster-Whisper handles resampling internally; we’ll just pass the path
        segments, info = self.model.transcribe(
            wav_path,
            # Only enable VAD when onnxruntime was successfully imported.
            vad_filter=_VAD_AVAILABLE,
            beam_size=1,
            language="en",
            no_speech_threshold=0.6
        )
        text = " ".join(seg.text for seg in segments)
        return ASRResult(text=text.strip(), t_ms=int(info.duration * 1000) if info else 0)

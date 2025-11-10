from pathlib import Path
import soundfile as sf
import numpy as np
from TTS.api import TTS
from .base import TTSBase
import io
from contextlib import redirect_stdout, redirect_stderr

class CoquiTTS(TTSBase):
    def __init__(self, model_name: str, vocoder_name: str, device: str = "cuda"):
        self.tts = TTS(model_name).to(device)
        self.vocoder_name = vocoder_name
        self.device = device

    def synth_to_file(self, text: str, out_wav: str, speaker: str = None):
        out_path = Path(out_wav)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        # Only provide the `speaker` argument when one was explicitly passed.
        # Some TTS models are single-speaker and will raise if `speaker` is given.
        tts_kwargs = {"text": text, "vocoder_path": self.vocoder_name}
        if speaker is not None:
            tts_kwargs["speaker"] = speaker
        # Suppress verbose prints from the TTS library
        with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
            wav = self.tts.tts(**tts_kwargs)
        wav = np.asarray(wav, dtype=np.float32)
        sf.write(str(out_path), wav, 22050)

    def synth_clauses_to_file(self, text: str, out_wav: str, speaker: str = None):
        """Synthesize short clauses separated by punctuation and concatenate.

        This provides a coarse-grained 'incremental' TTS suitable for
        speak-while-you-think experiments.
        """
        import re
        clauses = [c.strip() for c in re.split(r"([\.!?]+)\s+", text) if c and not c.isspace()]
        # Re-join to pairs of clause+ending punctuation
        rebuilt = []
        buf = ""
        for c in clauses:
            if c in (".", "!", "?"):
                buf += c
                rebuilt.append(buf)
                buf = ""
            else:
                buf += (c + " ")
        if buf:
            rebuilt.append(buf.strip())

        waves = []
        for clause in rebuilt:
            tts_kwargs = {"text": clause, "vocoder_path": self.vocoder_name}
            if speaker is not None:
                tts_kwargs["speaker"] = speaker
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                w = self.tts.tts(**tts_kwargs)
            waves.append(np.asarray(w, dtype=np.float32))
        if waves:
            wav = np.concatenate(waves)
            out_path = Path(out_wav)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            sf.write(str(out_path), wav, 22050)

    def synth_clauses(self, text: str, speaker: str = None):
        """Synthesize clauses and return the concatenated waveform as float32 numpy array.

        Returns None if no audio is produced (e.g., empty/invalid input).
        """
        import re
        clauses = [c.strip() for c in re.split(r"([\.!?]+)\s+", text) if c and not c.isspace()]
        rebuilt = []
        buf = ""
        for c in clauses:
            if c in (".", "!", "?"):
                buf += c
                rebuilt.append(buf)
                buf = ""
            else:
                buf += (c + " ")
        if buf:
            rebuilt.append(buf.strip())

        waves = []
        for clause in rebuilt:
            tts_kwargs = {"text": clause, "vocoder_path": self.vocoder_name}
            if speaker is not None:
                tts_kwargs["speaker"] = speaker
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                w = self.tts.tts(**tts_kwargs)
            waves.append(np.asarray(w, dtype=np.float32))
        if not waves:
            return None
        return np.concatenate(waves)

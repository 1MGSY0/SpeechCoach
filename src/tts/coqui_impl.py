from pathlib import Path
import soundfile as sf
import numpy as np
from TTS.api import TTS
from .base import TTSBase

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
        wav = self.tts.tts(**tts_kwargs)
        wav = np.asarray(wav, dtype=np.float32)
        sf.write(str(out_path), wav, 22050)

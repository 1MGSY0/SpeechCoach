from typing import Optional

class TTSBase:
    def synth_to_file(self, text: str, out_wav: str, speaker: Optional[str] = None):
        raise NotImplementedError
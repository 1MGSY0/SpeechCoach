from typing import NamedTuple

class ASRResult(NamedTuple):
    text: str
    t_ms: int   # duration or a placeholder timing field if needed

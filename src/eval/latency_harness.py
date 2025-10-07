import time, json
from pathlib import Path
from src.common.timers import now_ms

class LatencyLogger:
    def __init__(self, path): self.f = open(path, "a", encoding="utf-8")
    def log(self, obj): self.f.write(json.dumps(obj, ensure_ascii=False)+"\n"); self.f.flush()

# In your orchestrator, at each boundary:
# log({"event":"asr_first_partial","ts_ms":now_ms(), "turn_id":k, ...})
# ...
# At the end of a turn, compute derived metrics and log a summary row.

'''
Metrics we log per turn (mirrors telecom paper’s breakdown):

asr_t_first_partial_ms, asr_t_final_ms
llm_t_start_ms, llm_t_first_token_ms, llm_t_end_ms
tts_t_start_ms, tts_t_first_audio_ms, tts_t_end_ms

Derived:
TTFB (time-to-first-audio) = tts_t_first_audio_ms - asr_t_first_partial_ms
LLM gen time = llm_t_end_ms - llm_t_start_ms
E2E turn latency = tts_t_end_ms - asr_t_first_partial_ms
This matches how low-latency voice pipelines report latency (ASR partials → concurrent LLM → concurrent TTS).

'''
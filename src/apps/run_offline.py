import argparse
import yaml
from pathlib import Path
from rich import print
from src.common.timers import now_ms
from src.common.logging_utils import JsonlLogger

# ASR
from src.asr.faster_whisper_impl import FasterWhisperASR
# LLM
from src.llm.stub_impl import StubLLM
# TTS
from src.tts.coqui_impl import CoquiTTS

def load_yaml(p):
    with open(p, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--in_wav", default="data/audio/sample.wav")
    parser.add_argument("--asr_cfg", default="configs/asr.yaml")
    parser.add_argument("--llm_cfg", default="configs/llm.yaml")
    parser.add_argument("--tts_cfg", default="configs/tts_lowlat.yaml")
    parser.add_argument("--out_wav", default="logs/tts_out.wav")
    parser.add_argument("--log", default="logs/session_offline.jsonl")
    args = parser.parse_args()

    asr_cfg = load_yaml(args.asr_cfg)
    llm_cfg = load_yaml(args.llm_cfg)
    tts_cfg = load_yaml(args.tts_cfg)

    logger = JsonlLogger(args.log)

    # --- ASR ---
    t0 = now_ms()
    asr = FasterWhisperASR(
        model_size=asr_cfg.get("model_size", "small"),
        compute_type=asr_cfg.get("compute_type", "float16")
    )
    t1 = now_ms()
    asr_load_ms = t1 - t0

    t2 = now_ms()
    asr_res = asr.transcribe_file(args.in_wav)
    t3 = now_ms()
    asr_infer_ms = t3 - t2

    print(f"[bold cyan]ASR text:[/bold cyan] {asr_res.text}")

    # --- LLM (stub) ---
    llm = StubLLM(template=llm_cfg.get("template", "You said: {asr_text}"))
    prompt = llm_cfg.get("template", "").format(asr_text=asr_res.text)
    t4 = now_ms()
    reply_text = llm.generate(prompt)
    t5 = now_ms()
    llm_ms = t5 - t4

    print(f"[bold magenta]LLM reply:[/bold magenta] {reply_text}")

    # --- TTS ---
    tts = CoquiTTS(
        model_name=tts_cfg.get("model_name"),
        vocoder_name=tts_cfg.get("vocoder_name"),
        device=tts_cfg.get("device", "cuda")
    )
    t6 = now_ms()
    tts.synth_to_file(reply_text, args.out_wav)
    t7 = now_ms()
    tts_ms = t7 - t6

    e2e_ms = (t7 - t2)

    print(f"[green]Timings (ms):[/green] ASR_load={asr_load_ms} ASR_infer={asr_infer_ms} "
          f"LLM={llm_ms} TTS={tts_ms} E2E={e2e_ms}")
    print(f"[yellow]Output saved to:[/yellow] {args.out_wav}")

    logger.log(event="timings",
               asr_model=asr_cfg.get("model_size"),
               asr_compute=asr_cfg.get("compute_type"),
               asr_load_ms=asr_load_ms,
               asr_infer_ms=asr_infer_ms,
               llm_impl="stub",
               llm_ms=llm_ms,
               tts_model=tts_cfg.get("model_name"),
               tts_ms=tts_ms,
               e2e_ms=e2e_ms,
               in_wav=args.in_wav,
               out_wav=args.out_wav)

    logger.close()

if __name__ == "__main__":
    main()

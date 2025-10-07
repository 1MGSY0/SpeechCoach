# src/apps/run_batch.py
import argparse, yaml, glob, os
from pathlib import Path
from rich import print
from src.common.timers import now_ms
from src.common.logging_utils import JsonlLogger
from src.asr.faster_whisper_impl import FasterWhisperASR
from src.llm.stub_impl import StubLLM
from src.llm.llama_cpp_impl import LlamaCppLLM
from src.tts.coqui_impl import CoquiTTS

def load_yaml(p): 
    with open(p, "r", encoding="utf-8") as f: 
        return yaml.safe_load(f)

def get_llm(cfg):
    impl = cfg.get("impl", "stub")
    if impl == "stub":
        return StubLLM(template=cfg.get("template", "You said: {asr_text}"))
    if impl == "llama_cpp":
        return LlamaCppLLM(
            model_path=cfg["model_path"],
            n_ctx=cfg.get("n_ctx", 2048),
            n_gpu_layers=cfg.get("n_gpu_layers", 35),
            temperature=cfg.get("temperature", 0.7),
        )
    raise ValueError(f"Unknown LLM impl: {impl}")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in_dir", default="data/audio")             # folder of wavs: 01.wav, 02.wav, ...
    ap.add_argument("--asr_cfg", default="configs/asr.yaml")
    ap.add_argument("--llm_cfg", default="configs/llm.yaml")      # swap to llm_llamacpp.yaml to test TinyLlama
    ap.add_argument("--tts_cfg", default="configs/tts_lowlat.yaml")
    ap.add_argument("--out_dir", default="logs/batch_out")
    ap.add_argument("--log", default="logs/session_batch.jsonl")
    args = ap.parse_args()

    Path(args.out_dir).mkdir(parents=True, exist_ok=True)
    logger = JsonlLogger(args.log)

    asr_cfg = load_yaml(args.asr_cfg)
    llm_cfg = load_yaml(args.llm_cfg)
    tts_cfg = load_yaml(args.tts_cfg)

    # init modules once (measure load times if needed)
    asr = FasterWhisperASR(
        model_size=asr_cfg.get("model_size","small"),
        compute_type=asr_cfg.get("compute_type","float16"),
    )
    llm = get_llm(llm_cfg)
    tts = CoquiTTS(
        model_name=tts_cfg.get("model_name"),
        vocoder_name=tts_cfg.get("vocoder_name"),
        device=tts_cfg.get("device","cuda")
    )

    # state for continuity (concatenate previous ASR text)
    prev_ctx = ""

    wavs = sorted(glob.glob(os.path.join(args.in_dir, "*.wav")))
    for idx, wav_path in enumerate(wavs, 1):
        turn_id = idx
        print(f"[bold cyan]Turn {turn_id}[/bold cyan]: {wav_path}")

        # --- ASR ---
        t_asr0 = now_ms()
        asr_res = asr.transcribe_file(wav_path)
        t_asr1 = now_ms()

        # --- LLM ---
        prompt = llm_cfg.get("template","You said: {asr_text}").format(asr_text=asr_res.text)
        # include prev context for continuity (simple baseline)
        prompt = f"{prev_ctx}\nUser: {asr_res.text}\nAssistant:"
        t_llm0 = now_ms()
        reply_text = llm.generate(prompt)
        t_llm1 = now_ms()

        # --- TTS ---
        out_wav = str(Path(args.out_dir) / f"turn_{turn_id:02d}.wav")
        t_tts0 = now_ms()
        tts.synth_to_file(reply_text, out_wav)
        t_tts1 = now_ms()

        # Update context (keep small to stay realistic)
        prev_ctx = (prev_ctx + f"\nUser: {asr_res.text}\nAssistant: {reply_text}").splitlines()[-10:]

        e2e_ms = t_tts1 - t_asr0
        print(f"ASR_ms={t_asr1-t_asr0} LLM_ms={t_llm1-t_llm0} TTS_ms={t_tts1-t_tts0} E2E_ms={e2e_ms}")

        logger.log(
            event="turn",
            turn_id=turn_id,
            in_wav=wav_path,
            out_wav=out_wav,
            asr_text=asr_res.text,
            reply_text=reply_text,
            asr_ms=t_asr1-t_asr0,
            llm_ms=t_llm1-t_llm0,
            tts_ms=t_tts1-t_tts0,
            e2e_ms=e2e_ms
        )

    logger.close()

if __name__ == "__main__":
    main()

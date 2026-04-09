"""Utility to pre-download and stage model artifacts referenced by configs.

Supports:
 - Llama.cpp GGUF models (from Hugging Face TheBloke repos) via --llm_cfg
 - Faster-Whisper model weights via --asr_model_size (instantiates WhisperModel)
 - Coqui TTS acoustic + vocoder via --tts_model / --tts_vocoder (instantiates TTS)
 - Bark (optional) via --bark (lazy import)

Heuristics:
 - For llama-cpp, if the config file has impl: llama_cpp and a model_path that
   does not exist, we attempt to derive the repo id from the filename prefix.
   Known mapping is embedded below; extend if you add more models.

Usage examples:
    python -m tools.download_models --llm_cfg configs/llm_llamacpp.yaml
    python -m tools.download_models --asr_model_size small
    python -m tools.download_models --tts_model tts_models/en/ljspeech/fast_pitch --tts_vocoder vocoder_models/en/ljspeech/hifigan_v2
    python -m tools.download_models --llm_cfg configs/llm_llamacpp.yaml --asr_model_size small --tts_model tts_models/en/ljspeech/fast_pitch --tts_vocoder vocoder_models/en/ljspeech/hifigan_v2

Notes:
 - Requires huggingface_hub, faster-whisper, TTS packages installed.
 - Safe to re-run; skips existing files unless --force.
"""
import argparse
import sys
from pathlib import Path
import json

KNOWN_LLAMA_REPOS = {
    # filename prefix (lowercase) : repo id
    "tinyllama-1.1b-chat-v1.0": "TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF",
}

def load_yaml(path: str):
    import yaml
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def ensure_llama_cpp(cfg_path: str, force: bool = False) -> Path:
    cfg = load_yaml(cfg_path)
    if cfg.get("impl") != "llama_cpp":
        print(f"[llm] Skipped: impl != llama_cpp in {cfg_path}")
        return Path(".")
    model_rel = cfg.get("model_path")
    if not model_rel:
        print(f"[llm] No model_path field in {cfg_path}")
        return Path(".")
    target = Path(model_rel)
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and not force:
        print(f"[llm] Exists: {target}")
        return target
    fname = target.name
    prefix = fname.split(".Q")[0].lower()  # crude prefix until first quant tag
    repo_id = KNOWN_LLAMA_REPOS.get(prefix)
    if not repo_id:
        print(f"[llm] Unknown prefix '{prefix}'. Add mapping to KNOWN_LLAMA_REPOS. Aborting llama download.")
        return target
    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        print("[llm] huggingface_hub not installed. pip install huggingface-hub")
        return target
    print(f"[llm] Downloading {fname} from {repo_id} ...")
    downloaded = hf_hub_download(repo_id=repo_id, filename=fname)
    # copy to target path if different
    if Path(downloaded) != target:
        import shutil
        shutil.copy2(downloaded, target)
    print(f"[llm] Saved to {target}")
    return target

def ensure_faster_whisper(model_size: str):
    if not model_size:
        return
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("[asr] faster-whisper not installed.")
        return
    print(f"[asr] Preloading faster-whisper model '{model_size}' (this will download weights if missing)...")
    try:
        WhisperModel(model_size, compute_type="float16")  # instantiation triggers download
    except Exception as e:
        print(f"[asr] Failed to load model '{model_size}': {e}")
    else:
        print(f"[asr] Model '{model_size}' ready.")

def ensure_tts(model_name: str, vocoder_name: str, device: str = "cpu"):
    if not model_name:
        return
    try:
        from TTS.api import TTS
    except ImportError:
        print("[tts] Coqui TTS not installed.")
        return
    print(f"[tts] Preloading acoustic '{model_name}' + vocoder '{vocoder_name}' ...")
    try:
        tts = TTS(model_name).to(device)
        # The API downloads models inside the TTS cache; there is no separate manual step.
        _ = tts.tts("Test.")  # quick warm-up synthesis (optional)
    except Exception as e:
        print(f"[tts] Failed to preload: {e}")
    else:
        print("[tts] Models cached.")

def ensure_bark(enable: bool):
    if not enable:
        return
    try:
        import bark
    except ImportError:
        print("[bark] bark package not installed.")
        return
    print("[bark] Bark downloads will occur lazily when first used; no explicit predownload step implemented.")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--llm_cfg", default="")
    ap.add_argument("--asr_model_size", default="")
    ap.add_argument("--tts_model", default="")
    ap.add_argument("--tts_vocoder", default="")
    ap.add_argument("--tts_device", default="cuda")
    ap.add_argument("--bark", action="store_true")
    ap.add_argument("--force", action="store_true", help="Redownload GGUF even if present")
    args = ap.parse_args()

    results = {}
    if args.llm_cfg:
        results["llm_model"] = str(ensure_llama_cpp(args.llm_cfg, force=args.force))
    if args.asr_model_size:
        ensure_faster_whisper(args.asr_model_size)
        results["asr_model_size"] = args.asr_model_size
    if args.tts_model:
        ensure_tts(args.tts_model, args.tts_vocoder, device=args.tts_device)
        results["tts_model"] = args.tts_model
        results["tts_vocoder"] = args.tts_vocoder
    if args.bark:
        ensure_bark(True)
        results["bark"] = True

    print("\n[summary]", json.dumps(results, indent=2))

if __name__ == "__main__":
    main()

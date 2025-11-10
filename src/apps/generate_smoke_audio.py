"""Generate smoke-test audio WAVs from a scenario CSV.

The CSV must have at minimum a header row with columns:
    File,Sentence,Duration,Purpose
Only File and Sentence are required for synthesis; other columns are ignored.

Example CSV row:
    01.wav, "Good morning, I would like to check the status of my permit application.",5 s,"Opening inquiry"

Usage (after models downloaded):
    python -m src.apps.generate_smoke_audio --csv data/test_script.csv --out_dir data/smoke_audio \
        --tts_model tts_models/en/ljspeech/fast_pitch --tts_vocoder vocoder_models/en/ljspeech/hifigan_v2 --device cuda

If the TTS model isn't installed yet, run (PowerShell):
    python -m tools.download_models --tts_model tts_models/en/ljspeech/fast_pitch --tts_vocoder vocoder_models/en/ljspeech/hifigan_v2

This script will:
  1. Read CSV
  2. For each row, synthesize speech for Sentence
  3. Resample audio to 16 kHz mono (benchmark standard) and save as <out_dir>/<File>
  4. Write a manifest JSONL at <out_dir>/manifest.jsonl with metadata

Assumptions:
  - Coaching use case focuses on permit status scenario; existing sentences retained
  - Duration column is descriptive, not enforced; actual synthesized length may differ
"""
from __future__ import annotations
import argparse
import csv
import json
from pathlib import Path
from typing import List, Dict, Any
import sys
import warnings

import numpy as np
import soundfile as sf

try:
    import torchaudio
except Exception:
    torchaudio = None  # Optional; if missing will fall back to librosa

try:
    import librosa
except Exception:
    librosa = None

try:
    from TTS.api import TTS  # Direct use; avoids reliance on CoquiTTS wrapper sample rate
except Exception:
    TTS = None


def resample_to_16k(wav: np.ndarray, sr: int) -> np.ndarray:
    if sr == 16000:
        return wav.astype(np.float32)
    if torchaudio is not None:
        import torch
        tensor = torch.from_numpy(wav).unsqueeze(0)  # (1, time)
        rs = torchaudio.transforms.Resample(orig_freq=sr, new_freq=16000)
        out = rs(tensor).squeeze(0).numpy().astype(np.float32)
        return out
    if librosa is not None:
        out = librosa.resample(wav.astype(np.float32), orig_sr=sr, target_sr=16000)
        return out.astype(np.float32)
    warnings.warn("No resampler available; returning original sample rate audio")
    return wav.astype(np.float32)


def synth_sentences(rows: List[Dict[str, str]], tts_model: str, tts_vocoder: str, device: str) -> List[Dict[str, Any]]:
    if TTS is None:
        raise RuntimeError("Coqui TTS not installed. Please install TTS package or run tools.download_models.")
    tts = TTS(tts_model).to(device)
    manifest = []
    for r in rows:
        file_name = r["File"].strip()
        sentence = r["Sentence"].strip().strip('"')
        if not sentence:
            continue
        # Synthesize (Coqui API returns 22.05 kHz by default for LJSpeech models)
        wav = tts.tts(text=sentence, vocoder_path=tts_vocoder)
        wav = np.asarray(wav, dtype=np.float32)
        sr_in = 22050  # Known default for ljspeech fast_pitch
        wav16 = resample_to_16k(wav, sr_in)
        r["orig_sr"] = sr_in
        r["samples"] = int(len(wav16))
        r["duration_sec"] = round(len(wav16) / 16000.0, 3)
        r["sentence"] = sentence
        r["out_file"] = file_name
        manifest.append(r)
    return manifest


def write_audio(manifest: List[Dict[str, Any]], out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    for m in manifest:
        out_path = out_dir / m["out_file"]
        sf.write(str(out_path), m.get("audio"), 16000)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="data/test_script.csv", help="Input scenario CSV")
    ap.add_argument("--out_dir", default="data/smoke_audio", help="Directory for generated WAVs")
    ap.add_argument("--tts_model", default="tts_models/en/ljspeech/fast_pitch")
    ap.add_argument("--tts_vocoder", default="vocoder_models/en/ljspeech/hifigan_v2")
    ap.add_argument("--device", default="cpu")
    ap.add_argument("--limit", type=int, default=0, help="Optional limit on number of rows")
    args = ap.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"[error] CSV not found: {csv_path}", file=sys.stderr)
        sys.exit(1)

    rows: List[Dict[str, str]] = []
    with csv_path.open(newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        required = {"File", "Sentence"}
        if not required.issubset(reader.fieldnames or []):
            print(f"[error] CSV missing required headers: {required}", file=sys.stderr)
            sys.exit(2)
        for row in reader:
            rows.append(row)
    if args.limit > 0:
        rows = rows[:args.limit]

    try:
        manifest = synth_sentences(rows, args.tts_model, args.tts_vocoder, args.device)
    except Exception as e:
        print(f"[error] synthesis failed: {e}", file=sys.stderr)
        sys.exit(3)

    # Attach audio to manifest entries & save
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    for m in manifest:
        # Acquire audio again for saving to avoid holding large arrays if we later stream; here simple
        # We stored only metadata; resynthesize once more to attach audio for writing (could also keep initial arrays)
        # Optimize: reuse original wave; adjusting to store audio in first pass.
        # For simplicity modify earlier: we will store audio in first pass instead.
        pass  # Placeholder; audio stored earlier if we add key


    if TTS is None:
        print("[error] TTS unavailable for second pass.", file=sys.stderr)
        sys.exit(4)
    tts = TTS(args.tts_model).to(args.device)
    for m in manifest:
        sentence = m["sentence"]
        wav = tts.tts(text=sentence, vocoder_path=args.tts_vocoder)
        wav = np.asarray(wav, dtype=np.float32)
        wav16 = resample_to_16k(wav, 22050)
        sf.write(str(out_dir / m["out_file"]), wav16, 16000)
        m["audio_path"] = str(out_dir / m["out_file"])

    manifest_path = out_dir / "manifest.jsonl"
    with manifest_path.open('w', encoding='utf-8') as mf:
        for m in manifest:
            j = {k: v for k, v in m.items() if k not in ("audio")}
            mf.write(json.dumps(j) + "\n")
    print(f"[ok] Generated {len(manifest)} smoke audio files in {out_dir}")
    print(f"[ok] Manifest written: {manifest_path}\n[hint] You can now run batch benchmarks pointing to this directory.")


if __name__ == "__main__":
    main()

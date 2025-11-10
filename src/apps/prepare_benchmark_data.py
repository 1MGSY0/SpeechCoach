"""
Download small speech subsets and normalize to 16 kHz mono WAV so benchmarks can run.

Datasets:
- LibriSpeech test-clean (subset by --n)
- Common Voice (English) test/validation (best effort; will skip if API mismatch)
- Synthetic consultation samples via Coqui TTS (optional)

Outputs go to --out_dir (default: data/audio), flat layout:
  data/audio/ls_001.wav, ls_002.wav, ...
  data/audio/cv_001.wav, cv_002.wav, ...
  data/audio/synth_001.wav, ...

Requires: torch, torchaudio, librosa, soundfile, YAML (for TTS config if synth enabled).
"""
import argparse
from pathlib import Path
import random
import warnings
from typing import Optional

import numpy as np
import soundfile as sf

import torch
import torchaudio

try:
    import yaml
except Exception:
    yaml = None

# Optional TTS for synthetic samples
try:
    from src.tts.coqui_impl import CoquiTTS
except Exception:
    CoquiTTS = None


def save_audio_16k(waveform: torch.Tensor, sample_rate: int, out_path: Path):
    """Save tensor waveform to 16 kHz mono WAV."""
    waveform = waveform.detach().cpu()
    if waveform.ndim == 2:
        # (channels, time) -> mono
        if waveform.size(0) > 1:
            waveform = waveform.mean(dim=0, keepdim=True)
        else:
            pass
    if waveform.ndim == 1:
        waveform = waveform.unsqueeze(0)
    # Resample if needed using torchaudio
    if sample_rate != 16000:
        resampler = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=16000)
        waveform = resampler(waveform)
        sr = 16000
    else:
        sr = sample_rate
    # To numpy float32 mono
    wav = waveform.squeeze(0).numpy().astype(np.float32)
    sf.write(str(out_path), wav, sr)


def prepare_librispeech(root: Path, out_dir: Path, n: int, seed: int):
    print("Preparing LibriSpeech test-clean…")
    ds = torchaudio.datasets.LIBRISPEECH(str(root), url="test-clean", download=True)
    idxs = list(range(len(ds)))
    random.Random(seed).shuffle(idxs)
    count = 0
    for i in idxs:
        waveform, sr, _utterance, _speaker_id, _chapter_id, _utterance_id = ds[i]
        out = out_dir / f"ls_{count+1:03d}.wav"
        save_audio_16k(waveform, sr, out)
        count += 1
        if count >= n:
            break
    print(f"Saved {count} LibriSpeech files to {out_dir}")


def prepare_commonvoice(root: Path, out_dir: Path, n: int, seed: int) -> int:
    print("Preparing Common Voice (en)…")
    count = 0
    try:
        # Try common configurations; API varies across versions.
        try:
            ds = torchaudio.datasets.COMMONVOICE(str(root), tsv="test.tsv", url="english", download=True)
        except TypeError:
            # Older API variant
            ds = torchaudio.datasets.COMMONVOICE(str(root), tsv="test.tsv", download=True)
        idxs = list(range(len(ds)))
        random.Random(seed).shuffle(idxs)
        for i in idxs:
            sample = ds[i]
            # Some API variants return (waveform, sample_rate, *rest)
            if isinstance(sample, tuple) and isinstance(sample[0], torch.Tensor):
                waveform, sr = sample[0], int(sample[1])
            else:
                # Unknown structure; skip
                continue
            out = out_dir / f"cv_{count+1:03d}.wav"
            save_audio_16k(waveform, sr, out)
            count += 1
            if count >= n:
                break
    except Exception as e:
        warnings.warn(f"COMMONVOICE download or API failed: {e}. Skipping Common Voice.")
    if count:
        print(f"Saved {count} Common Voice files to {out_dir}")
    return count


def prepare_synthetic(out_dir: Path, tts_cfg_path: Optional[Path], n: int):
    if CoquiTTS is None:
        warnings.warn("CoquiTTS unavailable; cannot synthesize samples.")
        return 0
    print("Synthesizing consultation-like samples via TTS…")
    sentences = [
        "Hello, thanks for calling. Can you confirm your case ID?",
        "Your appeal is due by 2025-12-15. I will email you the checklist.",
        "I understand your concern. Let's schedule a follow-up next week."
    ]
    if n < len(sentences):
        sentences = sentences[:n]
    model_name = "tts_models/en/ljspeech/fast_pitch"
    vocoder_name = "vocoder_models/en/ljspeech/hifigan_v2"
    device = "cuda"
    if tts_cfg_path and yaml is not None and tts_cfg_path.exists():
        cfg = yaml.safe_load(tts_cfg_path.read_text(encoding='utf-8'))
        model_name = cfg.get('model_name', model_name)
        vocoder_name = cfg.get('vocoder_name', vocoder_name)
        device = cfg.get('device', device)
    tts = CoquiTTS(model_name=model_name, vocoder_name=vocoder_name, device=device)
    count = 0
    for i, s in enumerate(sentences, 1):
        out = out_dir / f"synth_{i:03d}.wav"
        tts.synth_to_file(s, str(out))
        count += 1
    print(f"Synthesized {count} files to {out_dir}")
    return count


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dataset', choices=['librispeech','commonvoice','consultation','all'], default='all')
    ap.add_argument('--out_dir', default='data/audio')
    ap.add_argument('--root', default='data/datasets')
    ap.add_argument('--n', type=int, default=10, help='Max files per dataset')
    ap.add_argument('--seed', type=int, default=0)
    ap.add_argument('--synthesize', action='store_true', help='Also synthesize consultation-like samples')
    ap.add_argument('--tts_cfg', default='configs/tts_lowlat.yaml')
    args = ap.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    root = Path(args.root)
    root.mkdir(parents=True, exist_ok=True)

    total = 0
    if args.dataset in ('librispeech','all'):
        prepare_librispeech(root / 'librispeech', out_dir, n=args.n, seed=args.seed)
        total += args.n
    if args.dataset in ('commonvoice','all'):
        total += prepare_commonvoice(root / 'commonvoice', out_dir, n=args.n, seed=args.seed)
    if args.synthesize or args.dataset in ('consultation','all'):
        tts_cfg = Path(args.tts_cfg) if args.tts_cfg else None
        total += prepare_synthetic(out_dir, tts_cfg, n=min(args.n, 10))

    print(f"Done. Files available under: {out_dir}")


if __name__ == '__main__':
    main()

# Smoke-test scenario data and audio

This folder documents the small, hand-curated scenario used for quick smoke tests of the pipeline.

## CSV schema

File: `data/test_script.csv`

Columns:
- File: Output WAV filename (e.g., `01.wav`)
- Sentence: The utterance text to synthesize
- Duration: Descriptive duration label (not enforced by TTS)
- Purpose: Short tag of what the line tests

Notes:
- The CSV uses standard commas as separators and quotes around text fields, so it opens cleanly in Excel/Sheets.
- Only `File` and `Sentence` are required for audio generation.

## Generate audio

Audio output directory: `data/smoke_audio/`

Prerequisites:
- Coqui TTS models installed (fast_pitch + HiFi-GAN_v2). You can prefetch them:

```powershell
python -m tools.download_models --tts_model tts_models/en/ljspeech/fast_pitch --tts_vocoder vocoder_models/en/ljspeech/hifigan_v2
```

Synthesize WAVs from CSV:

```powershell
python -m src.apps.generate_smoke_audio --csv data/test_script.csv --out_dir data/smoke_audio --device cpu
```

Optional flags:
- `--limit N` to synthesize only the first N rows
- `--device cuda` to use GPU if available
- `--tts_model` and `--tts_vocoder` to override defaults

Outputs:
- `data/smoke_audio/<File>` — 16 kHz mono WAV suitable for benchmarks
- `data/smoke_audio/manifest.jsonl` — one JSON object per line with metadata (file, sentence, duration, purpose)

## Using in benchmarks

Point batch runner to the directory of generated files, or copy select WAVs into `data/audio/` if required by your scripts.

Consider tagging the scenario with a profile (e.g., `configs/stories/permit_appeal.yaml`) for consistency with your use case.

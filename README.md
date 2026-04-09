# SpeechCoach
Real-time speech-to-speech coaching agent (Windows + RTX laptop target).

## Docker Pipeline

For the full local web app + Convex + vision agent + Inngest stack, use the Docker guide:

- [`docs/docker-pipeline.md`](/c:/Users/gushi/LTU/SpeechCoach/docs/docker-pipeline.md)

For a production-style Docker run that avoids `next dev` compile-on-first-request behavior, use:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.docker up --build -d
```

## Quickstart

1) Create and activate a virtual environment (PowerShell):

```
python -m venv .venv
. .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip setuptools wheel
```

2) Install dependencies:

```
python -m pip install -r requirements.txt
```

3) GPU sanity check:

```
python -m src.apps.check_cuda
```

4) Run a single offline turn (ASR -> LLM -> TTS):

```
python -m src.apps.run_offline --in_wav data/audio/sample.wav
```

5) Batch benchmark and generate a report:

```
# run batch over data/audio/*.wav and log timings
python -m src.apps.run_batch --in_dir data/audio --llm_cfg configs/llm_llamacpp.yaml --tts_cfg configs/tts_lowlat.yaml

# compute continuity (BERTScore; BLEURT optional)
python -m src.eval.score_report --log logs/session_batch.jsonl --out_csv logs/eval_reports/continuity_scores.csv

# summarize latency means
python -m src.eval.latency_benchmark --log logs/session_batch.jsonl

# assemble one-pager report
python -m src.eval.make_report --latency_log logs/session_batch.jsonl --continuity_csv logs/eval_reports/continuity_scores.csv --llm_cfg configs/llm_llamacpp.yaml
```

6) Optional story context:

```
python -m src.apps.run_batch --in_dir data/audio --story_cfg configs/stories/permit_appeal.yaml
```

7) Prepare benchmark audio (datasets and/or synthetic):

```
# Download small subsets and normalize to 16 kHz mono in data/audio
python -m src.apps.prepare_benchmark_data --dataset all --n 8 --synthesize

# Only LibriSpeech test-clean samples
python -m src.apps.prepare_benchmark_data --dataset librispeech --n 10

# Only Common Voice (best effort depending on torchaudio API)
python -m src.apps.prepare_benchmark_data --dataset commonvoice --n 10
```

## New: Choosable benchmark pipeline

Use the unified benchmark CLI to run either turn-based or streaming variants and export a CSV summary.

```
# Turn-based (sequential ASR -> LLM -> TTS)
python -m src.apps.run_benchmark --variant turn_based --in_dir data/audio --latency_csv logs/latency_turn_based.csv

# Streaming cascaded (ASR partials -> LLM token stream -> clause TTS)
python -m src.apps.run_benchmark --variant streaming --in_dir data/audio --chunk_ms 20 --realtime --latency_csv logs/latency_streaming.csv
```

Notes:
- Streaming run logs session-level TTFB: first ASR partial, first LLM token, first audio.
- CSV includes per-turn latencies; TTFB rows are appended at the end.

## Streaming & Orchestration (experimental)
- Minimal streaming ASR wrapper: `src/asr/faster_whisper_stream.py` (buffers audio, emits text deltas).
- Token streaming for Llama.cpp: `generate_stream()` in `src/llm/llama_cpp_impl.py`.
- Clause-based TTS: `synth_clauses_to_file()` in `src/tts/coqui_impl.py`.
- Async pipeline scaffold: `src/pipeline/orchestrator.py` (ASR partials -> LLM tokens -> TTS clauses).

## Reports
- Template: `reports/TEMPLATE_report.md`
- Generated to: `logs/eval_reports/report.md`

## Citation

@misc{yamagishi2019vctk,
  author={Yamagishi, Junichi and Veaux, Christophe and MacDonald, Kirsten},
  title={{CSTR VCTK Corpus}: English Multi-speaker Corpus for {CSTR} Voice Cloning Toolkit (version 0.92)},
  publisher={University of Edinburgh. The Centre for Speech Technology Research (CSTR)},
  year=2019,
  doi={10.7488/ds/2645},
}

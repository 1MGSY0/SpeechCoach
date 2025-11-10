import argparse, pathlib, subprocess, sys, os
from pathlib import Path

DEF_VARIANTS = [
    # (latency_log, llm_cfg, variant_label)
    ("logs/session_batch_stub.jsonl", "configs/llm.yaml", "batch_stub"),
    ("logs/session_batch_llama.jsonl", "configs/llm_llamacpp.yaml", "batch_llama"),
    ("logs/session_benchmark_turn.jsonl", "configs/llm_llamacpp.yaml", "turn_based"),
    ("logs/session_benchmark_stream.jsonl", "configs/llm_llamacpp.yaml", "streaming"),
]


def _safe_print(s: str, stream=None):
    if stream is None:
        stream = sys.stdout
    try:
        print(s, file=stream)
    except UnicodeEncodeError:
        # Fallback for consoles with limited code pages (e.g., cp932):
        # write UTF-8 bytes with backslash escapes to avoid crashes.
        data = s.encode('utf-8', errors='backslashreplace') + b"\n"
        stream.buffer.write(data)
        stream.flush()


def run(cmd: list[str]):
    _safe_print("[run] " + " ".join(cmd))
    env = os.environ.copy()
    env.setdefault('PYTHONIOENCODING', 'utf-8')
    res = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if res.returncode != 0:
        _safe_print(res.stdout)
        _safe_print(res.stderr, stream=sys.stderr)
        raise SystemExit(f"Command failed: {' '.join(cmd)}")
    return res.stdout


def ensure_continuity(log_path: str, out_csv: str):
    p_csv = Path(out_csv)
    if p_csv.exists():
        return
    run([sys.executable, "-m", "src.eval.score_report", "--log", log_path, "--out_csv", out_csv])


def ensure_latency_log(latency_log: str, llm_cfg: str, label: str, *, auto: bool, in_dir: str, tts_cfg: str, chunk_ms: int, realtime: bool) -> bool:
    p = Path(latency_log)
    if p.exists():
        return True
    if not auto:
        print(f"[skip] Missing latency log {latency_log}; re-run with --auto_benchmark to generate.")
        return False
    p.parent.mkdir(parents=True, exist_ok=True)
    # Auto-generate based on label
    if label.startswith("batch_"):
        # Use run_batch
        tail = label.split("batch_", 1)[-1]
        out_dir = f"logs/batch_{tail}_out"
        run([
            sys.executable, "-m", "src.apps.run_batch",
            "--in_dir", in_dir,
            "--llm_cfg", llm_cfg,
            "--tts_cfg", tts_cfg,
            "--log", latency_log,
            "--out_dir", out_dir,
        ])
        return Path(latency_log).exists()
    elif label in ("turn_based", "streaming"):
        # Use run_benchmark
        cmd = [
            sys.executable, "-m", "src.apps.run_benchmark",
            "--variant", label,
            "--in_dir", in_dir,
            "--llm_cfg", llm_cfg,
            "--tts_cfg", tts_cfg,
            "--log", latency_log,
        ]
        if label == "streaming":
            cmd += ["--chunk_ms", str(chunk_ms)]
            if realtime:
                cmd += ["--realtime"]
        run(cmd)
        return Path(latency_log).exists()
    else:
        print(f"[warn] Unknown label '{label}', cannot auto-generate {latency_log}.")
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--variants", nargs="*", help="Override default variant tuples: latency_log:llm_cfg:label ...")
    ap.add_argument("--out_dir", default="logs/eval_reports", help="Directory to place generated reports.")
    ap.add_argument("--continuity_suffix", default="continuity_scores.csv", help="Filename for continuity CSV per variant.")
    ap.add_argument("--auto_benchmark", action="store_true", help="Auto-run batch/benchmark to create missing latency logs.")
    ap.add_argument("--in_dir", default="data/audio", help="Input WAVs folder for generating logs when --auto_benchmark is used.")
    ap.add_argument("--tts_cfg", default="configs/tts_lowlat.yaml", help="TTS config to use for auto generation.")
    ap.add_argument("--chunk_ms", type=int, default=40, help="Streaming chunk size ms when auto-generating streaming logs.")
    ap.add_argument("--realtime", action="store_true", help="Enable realtime pacing for streaming when auto-generating logs.")
    args = ap.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.variants:
        variants = []
        for spec in args.variants:
            parts = spec.split(":")
            if len(parts) != 3:
                raise SystemExit(f"Invalid variant spec '{spec}', expected latency_log:llm_cfg:label")
            variants.append(tuple(parts))
    else:
        variants = DEF_VARIANTS

    for latency_log, llm_cfg, label in variants:
        ok = ensure_latency_log(latency_log, llm_cfg, label,
                                auto=args.auto_benchmark,
                                in_dir=args.in_dir,
                                tts_cfg=args.tts_cfg,
                                chunk_ms=args.chunk_ms,
                                realtime=args.realtime)
        if not ok:
            continue
        continuity_csv = out_dir / f"{label}_{args.continuity_suffix}"
        report_md = out_dir / f"report_{label}.md"
        ensure_continuity(latency_log, str(continuity_csv))
        run([
            sys.executable, "-m", "src.eval.make_report",
            "--latency_log", latency_log,
            "--continuity_csv", str(continuity_csv),
            "--llm_cfg", llm_cfg,
            "--variant", label,
            "--out_md", str(report_md)
        ])
        print(f"Generated report: {report_md}")

if __name__ == "__main__":
    main()

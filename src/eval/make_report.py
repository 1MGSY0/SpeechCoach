import argparse, json, os, platform, torch, datetime
from pathlib import Path
import yaml

def load_jsonl(p):
    rows = []
    for line in Path(p).read_text(encoding="utf-8").splitlines():
        try:
            rows.append(json.loads(line))
        except Exception:
            pass
    return rows

def mean(xs): 
    xs = [x for x in xs if isinstance(x, (int, float))]
    return round(sum(xs)/len(xs), 2) if xs else 0.0

def fill(s, mapping):
    for k, v in mapping.items():
        s = s.replace("{{"+k+"}}", str(v))
    return s

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--latency_log", default="logs/session_batch.jsonl")
    ap.add_argument("--continuity_csv", default="logs/eval_reports/continuity_scores.csv")
    ap.add_argument("--template", default="reports/TEMPLATE_report.md")
    ap.add_argument("--asr_cfg", default="configs/asr.yaml")
    ap.add_argument("--llm_cfg", default="configs/llm.yaml")
    ap.add_argument("--tts_cfg", default="configs/tts_lowlat.yaml")
    ap.add_argument("--variant", default="", help="Architecture/variant label (e.g., turn_based, streaming_cascade).")
    ap.add_argument("--out_md", default="logs/eval_reports/report.md")
    args = ap.parse_args()

    Path(args.out_md).parent.mkdir(parents=True, exist_ok=True)

    # Load logs
    turns = [r for r in load_jsonl(args.latency_log) if r.get("event") == "turn"]
    asr_ms = [r.get("asr_ms",0) for r in turns]
    llm_ms = [r.get("llm_ms",0) for r in turns]
    tts_ms = [r.get("tts_ms",0) for r in turns]
    e2e_ms = [r.get("e2e_ms",0) for r in turns]

    # Load continuity CSV (optional)
    continuity_rows = ""
    continuity_avg = ""
    continuity_metric_type = ""
    bleurt_avg = ""
    csv_p = Path(args.continuity_csv)
    if csv_p.exists():
        lines = csv_p.read_text(encoding="utf-8").strip().splitlines()
        vals = []
        bl_vals = []
        # Expect header: turn_id,continuity_score,bleurt,metric_type
        for line in lines[1:]:
            parts = line.split(",")
            if len(parts) < 4:
                continue
            tid, score, bl, mtype = parts[:4]
            continuity_metric_type = mtype  # last line defines type (all same)
            # Keep table to 3 columns to match template; metric type is shown in header text
            continuity_rows += f"| {tid} | {score} | {bl} |\n"
            try:
                vals.append(float(score))
            except:
                pass
            try:
                if bl:
                    bl_vals.append(float(bl))
            except:
                pass
        continuity_avg = round(sum(vals)/len(vals), 4) if vals else ""
        bleurt_avg = round(sum(bl_vals)/len(bl_vals), 4) if bl_vals else ""

    # Load template
    tpl = Path(args.template).read_text(encoding="utf-8")
    # If continuity metric isn't BERTScore, tweak headings in the template for clarity
    if continuity_metric_type and continuity_metric_type != "bertscore":
        # Update the avg label and table column heading
        tpl = tpl.replace("BERTScore F1 (avg)", f"Continuity ({continuity_metric_type}) (avg)")
        tpl = tpl.replace("| Turn | BERTScore F1 | BLEURT |", f"| Turn | {continuity_metric_type.capitalize()} | BLEURT |")

    # Load cfgs (names only)
    def cfg_name(p):
        try:
            c = yaml.safe_load(Path(p).read_text(encoding="utf-8"))
            if isinstance(c, dict):
                return f"{c.get('impl','?')}"
        except Exception:
            pass
        return Path(p).name

    # Attempt to detect package versions
    try:
        import faster_whisper as _fw
        fwver = getattr(_fw, '__version__', '')
    except Exception:
        fwver = ''
    try:
        import TTS as _tts_pkg
        ttsver = getattr(_tts_pkg, '__version__', '')
    except Exception:
        ttsver = ''

    # Training metrics
    try:
        from src.eval.training_metrics import compute_training_metrics
        full_rows = [json.loads(l) for l in Path(args.latency_log).read_text(encoding='utf-8').splitlines() if l.strip()]
        tmetrics = compute_training_metrics(full_rows)
    except Exception:
        tmetrics = {}

    mapping = {
        "DATE": datetime.date.today().isoformat(),
        "ASR_MODEL": cfg_name(args.asr_cfg),
        "LLM_MODEL": cfg_name(args.llm_cfg),
        "TTS_MODEL": cfg_name(args.tts_cfg),
        "DEVICE": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
        "CUDA": torch.version.cuda if torch.cuda.is_available() else "N/A",
        "DRIVER": platform.platform(),
        "N_TURNS": len(turns),
        "ASR_MEAN": mean(asr_ms),
        "LLM_MEAN": mean(llm_ms),
        "TTS_MEAN": mean(tts_ms),
        "E2E_MEAN": mean(e2e_ms),
        "BERT_F1": continuity_avg if continuity_metric_type == "bertscore" else "",
        "JACCARD_CONTINUITY": continuity_avg if continuity_metric_type == "jaccard" else "",
        "BLEURT_AVG": bleurt_avg,
    "CONTINUITY_ROWS": continuity_rows or "| – | – | – | – |\n",
    "CONTINUITY_METRIC": continuity_metric_type,
    "CASE_ID_MENTIONS": tmetrics.get('case_id_mentions',''),
    "DEADLINE_MENTIONS": tmetrics.get('deadline_mentions',''),
    "RESPONSIVENESS": tmetrics.get('responsiveness',''),
        "WHAT_HELPED_LATENCY": "",
        "BOTTLENECKS": "",
        "NEXT_STEPS": "",
        "ASR_CFG": Path(args.asr_cfg).name,
        "LLM_CFG": Path(args.llm_cfg).name,
        "TTS_CFG": Path(args.tts_cfg).name,
    "VARIANT": args.variant or "N/A",
    "TORCH": torch.__version__,
        "PYVER": platform.python_version(),
    "FWVER": fwver,
    "TTSVER": ttsver,
    }

    out = fill(tpl, mapping)
    Path(args.out_md).write_text(out, encoding="utf-8")
    print(f"Report written to {args.out_md}")

if __name__ == "__main__":
    main()

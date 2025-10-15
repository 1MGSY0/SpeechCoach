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
    bert_avg = ""
    bleurt_avg = ""
    csv_p = Path(args.continuity_csv)
    if csv_p.exists():
        lines = csv_p.read_text(encoding="utf-8").strip().splitlines()
        vals = []
        for i, line in enumerate(lines[1:], start=1):
            tid, b, bl = line.split(",")
            continuity_rows += f"| {tid} | {b} | {bl} |\n"
            try:
                vals.append(float(b))
            except:
                pass
        bert_avg = round(sum(vals)/len(vals), 4) if vals else ""
        # Compute BLEURT avg quickly if present
        bl_vals = []
        for i, line in enumerate(lines[1:], start=1):
            parts = line.split(",")
            if len(parts) >= 3:
                try:
                    bl_vals.append(float(parts[2]))
                except:
                    pass
        bleurt_avg = round(sum(bl_vals)/len(bl_vals), 4) if bl_vals else ""

    # Load template
    tpl = Path(args.template).read_text(encoding="utf-8")

    # Load cfgs (names only)
    def cfg_name(p):
        try:
            c = yaml.safe_load(Path(p).read_text(encoding="utf-8"))
            if isinstance(c, dict):
                return f"{c.get('impl','?')}"
        except Exception:
            pass
        return Path(p).name

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
        "BERT_F1": bert_avg,
        "BLEURT_AVG": bleurt_avg,
        "CONTINUITY_ROWS": continuity_rows or "| – | – | – |\n",
        "WHAT_HELPED_LATENCY": "",
        "BOTTLENECKS": "",
        "NEXT_STEPS": "",
        "ASR_CFG": Path(args.asr_cfg).name,
        "LLM_CFG": Path(args.llm_cfg).name,
        "TTS_CFG": Path(args.tts_cfg).name,
        "TORCH": torch.__version__,
        "PYVER": platform.python_version(),
        "FWVER": "",  # leave blank or fill if you track versions
        "TTSVER": "",
    }

    out = fill(tpl, mapping)
    Path(args.out_md).write_text(out, encoding="utf-8")
    print(f"Report written to {args.out_md}")

if __name__ == "__main__":
    main()

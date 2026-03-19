import os
# Reduce noisy backend imports/logs and avoid TensorFlow/JAX where possible
os.environ.setdefault("TRANSFORMERS_NO_TF", "1")  # prevent transformers from loading TensorFlow
os.environ.setdefault("TRANSFORMERS_NO_JAX", "1")
os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
import argparse, json
from pathlib import Path
from collections import defaultdict

# Fallback similarity metric (token Jaccard) always available
def _jaccard(a: str, b: str) -> float:
    sa = set(a.lower().split())
    sb = set(b.lower().split())
    if not sa or not sb:
        return 0.0
    inter = len(sa & sb)
    union = len(sa | sb)
    return inter / union if union else 0.0

try:
    from bert_score import score as bertscore
    HAVE_BERTSCORE = True
except Exception:
    HAVE_BERTSCORE = False

# BLEURT import is deferred until a checkpoint is explicitly requested to
# avoid triggering TensorFlow DLL load errors on systems without proper TF setup.
HAVE_BLEURT = None  # will be set True/False only if user asks for BLEURT

def load_jsonl(p):
    for line in Path(p).read_text(encoding="utf-8").splitlines():
        yield json.loads(line)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--log", default="logs/session_batch.jsonl")
    ap.add_argument("--out_csv", default="logs/eval_reports/continuity_scores.csv")
    ap.add_argument("--bleurt_ckpt", default="", help="Path to BLEURT checkpoint (optional; requires TensorFlow).")
    args = ap.parse_args()

    Path(args.out_csv).parent.mkdir(parents=True, exist_ok=True)

    turns = [e for e in load_jsonl(args.log) if e.get("event") == "turn"]
    # Build per-turn context: concat all previous user utterances
    user_history = []
    hyps, refs = [], []
    for t in turns:
        ref = " ".join(user_history).strip() or "(no prior context)"
        hyp = t.get("reply_text","")
        hyps.append(hyp)
        refs.append(ref)
        # update history with last user text
        user_text = t.get("asr_text","")
        if user_text:
            user_history.append(user_text)

    # BERTScore (optional) with robust fallback
    have_bertscore = HAVE_BERTSCORE  # use local flag to avoid scope issues
    if have_bertscore:
        try:
            P,R,F = bertscore(hyps, refs, lang="en")
            f1 = [float(x) for x in F]
        except Exception:
            # Suppress verbose stack traces (e.g., TensorFlow DLL load). Keep output concise.
            print("BERTScore failed. Falling back to Jaccard token similarity.")
            have_bertscore = False
            f1 = [ _jaccard(h,r) for h,r in zip(hyps, refs) ]
    else:
        f1 = [ _jaccard(h,r) for h,r in zip(hyps, refs) ]

    # BLEURT (optional & lazy)
    bleurt = [""] * len(hyps)
    if args.bleurt_ckpt:
        global HAVE_BLEURT
        if HAVE_BLEURT is None:
            try:
                from bleurt import score as bleurt_score  # type: ignore
                HAVE_BLEURT = True
            except Exception:
                HAVE_BLEURT = False
        if HAVE_BLEURT:
            try:
                scorer = bleurt_score.BleurtScorer(args.bleurt_ckpt)
                bleurt = scorer.score(references=refs, candidates=hyps)
            except Exception as e:
                print(f"BLEURT load/score failed: {e}. Skipping BLEURT.")
                bleurt = [""] * len(hyps)

    # Write CSV
    header = "turn_id,continuity_score,bleurt,metric_type"
    metric_type = "bertscore" if have_bertscore else "jaccard"
    rows = [header]
    for i, (b, bl) in enumerate(zip(f1, bleurt), start=1):
        rows.append(f"{i},{b},{bl},{metric_type}")
    Path(args.out_csv).write_text("\n".join(rows), encoding="utf-8")

    # Print summary
    if f1 and have_bertscore:
        avg_b = sum(f1)/len(f1)
        print(f"BERTScore F1 avg over {len(f1)} turns: {avg_b:.4f}")
    elif not have_bertscore:
        avg_j = sum(f1)/len(f1) if f1 else 0.0
        print(f"Jaccard token similarity avg over {len(f1)} turns: {avg_j:.4f}")
    if args.bleurt_ckpt and HAVE_BLEURT:
        vals = [v for v in bleurt if isinstance(v, float)]
        if vals:
            print(f"BLEURT avg: {sum(vals)/len(vals):.4f} (ckpt: {args.bleurt_ckpt})")
        else:
            print("BLEURT not computed (no values).")
    else:
        if args.bleurt_ckpt:
            print("BLEURT skipped (import failed or scoring error).")
        else:
            print("BLEURT skipped (no --bleurt_ckpt provided).")

if __name__ == "__main__":
    main()

# src/eval/score_report.py
import argparse, json
from pathlib import Path
from collections import defaultdict
from bert_score import score as bertscore

try:
    from bleurt import score as bleurt_score
    HAVE_BLEURT = True
except Exception:
    HAVE_BLEURT = False

def load_jsonl(p):
    for line in Path(p).read_text(encoding="utf-8").splitlines():
        yield json.loads(line)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--log", default="logs/session_batch.jsonl")
    ap.add_argument("--out_csv", default="logs/eval_reports/continuity_scores.csv")
    ap.add_argument("--bleurt_ckpt", default="")  # optional
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

    # BERTScore
    P,R,F = bertscore(hyps, refs, lang="en")
    f1 = [float(x) for x in F]

    # BLEURT (optional)
    bleurt = []
    if HAVE_BLEURT and args.bleurt_ckpt:
        scorer = bleurt_score.BleurtScorer(args.bleurt_ckpt)
        bleurt = scorer.score(references=refs, candidates=hyps)
    else:
        bleurt = [""] * len(hyps)

    # Write CSV
    rows = ["turn_id,bertscore_f1,bleurt"]
    for i, (b, bl) in enumerate(zip(f1, bleurt), start=1):
        rows.append(f"{i},{b},{bl}")
    Path(args.out_csv).write_text("\n".join(rows), encoding="utf-8")

    # Print summary
    if f1:
        avg_b = sum(f1)/len(f1)
        print(f"BERTScore F1 avg over {len(f1)} turns: {avg_b:.4f}")
    if args.bleurt_ckpt and HAVE_BLEURT:
        vals = [v for v in bleurt if isinstance(v, float)]
        if vals:
            print(f"BLEURT avg: {sum(vals)/len(vals):.4f} (ckpt: {args.bleurt_ckpt})")
        else:
            print("BLEURT not computed (no values).")
    else:
        print("BLEURT skipped (install + provide --bleurt_ckpt to enable).")

if __name__ == "__main__":
    main()

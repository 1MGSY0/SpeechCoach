from bert_score import score as bertscore
# bleurt requires checkpoint download; use BLEURT-20
def bertscore_ctx(hyp:str, ref:str):
    P,R,F = bertscore([hyp], [ref], lang="en")
    return float(F[0])

def entity_carryover(prev_ctx_text:str, reply:str):
    # naive: find case IDs, dates, names; compute precision/recall over expected mentions
    return {"precision":..., "recall":...}

from bert_score import score as bertscore
import re

def bertscore_ctx(hyp: str, ref: str):
    P, R, F = bertscore([hyp], [ref], lang="en")
    return float(F[0])

_CASE_RE = re.compile(r"\b[A-Z]{2,}\d{2,}\b")      # e.g. AB1234
_DATE_RE = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")   # YYYY-MM-DD
_NAME_RE = re.compile(r"\b[A-Z][a-z]+\b")           # Capitalized words (very naive)

def _extract_entities(text: str):
    return set(_CASE_RE.findall(text)) | set(_DATE_RE.findall(text))

def entity_carryover(prev_ctx_text: str, reply: str):
    prev_entities = _extract_entities(prev_ctx_text)
    reply_entities = _extract_entities(reply)
    if not prev_entities:
        return {"precision": 0.0, "recall": 0.0}
    tp = len(prev_entities & reply_entities)
    precision = tp / len(reply_entities) if reply_entities else 0.0
    recall = tp / len(prev_entities) if prev_entities else 0.0
    return {"precision": round(precision, 3), "recall": round(recall, 3)}

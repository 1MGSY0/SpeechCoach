import re

_CASE_RE = re.compile(r"\b[A-Z]{2,}-?\d{3,}\b")
_DATE_RE = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")

def compute_training_metrics(log_rows):
    """Compute simple grading metrics over dialog turns.

    Metrics:
    - case_id_mentions: count of assistant replies mentioning case-like IDs.
    - deadline_mentions: count of replies mentioning dates (YYYY-MM-DD).
    - responsiveness: fraction of turns where assistant replied non-empty.
    """
    total = len([r for r in log_rows if r.get('event')=='turn'])
    replies = [r.get('reply_text','') for r in log_rows if r.get('event')=='turn']
    case_id_mentions = sum(1 for t in replies if _CASE_RE.search(t or ''))
    deadline_mentions = sum(1 for t in replies if _DATE_RE.search(t or ''))
    non_empty = sum(1 for t in replies if (t or '').strip())
    responsiveness = round(non_empty / total, 3) if total else 0.0
    return {
        'case_id_mentions': case_id_mentions,
        'deadline_mentions': deadline_mentions,
        'responsiveness': responsiveness,
    }

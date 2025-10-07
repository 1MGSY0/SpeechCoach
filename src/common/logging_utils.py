import json
from pathlib import Path

class JsonlLogger:
    def __init__(self, path: str):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.f = self.path.open("a", encoding="utf-8")

    def log(self, **kwargs):
        self.f.write(json.dumps(kwargs, ensure_ascii=False) + "\n")
        self.f.flush()

    def close(self):
        self.f.close()

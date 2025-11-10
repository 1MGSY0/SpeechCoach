from collections import deque

class ContextManager:
    def __init__(self, max_turns: int = 10):
        self.turns = deque(maxlen=max_turns)
    def add(self, user: str, assistant: str):
        self.turns.append((user, assistant))
    def summary(self) -> str:
        return "\n".join([f"User: {u}\nAssistant: {a}" for u,a in self.turns])

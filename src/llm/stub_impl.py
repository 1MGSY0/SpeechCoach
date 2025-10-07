from .base import LLMBase

class StubLLM(LLMBase):
    def __init__(self, template: str):
        self.template = template

    def generate(self, prompt: str) -> str:
        # trivial echo-style; prompt should include placeholders already filled
        return prompt


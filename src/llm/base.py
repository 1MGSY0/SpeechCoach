class LLMBase:
    def generate(self, prompt: str) -> str:
        raise NotImplementedError

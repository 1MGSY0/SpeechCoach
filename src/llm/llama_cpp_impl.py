# src/llm/llama_cpp_impl.py
from .base import LLMBase
from llama_cpp import Llama

class LlamaCppLLM(LLMBase):
    def __init__(self, model_path: str, n_ctx: int = 2048, n_gpu_layers: int = 35, temperature: float = 0.7,
                 max_tokens: int = 64, stop: list[str] | None = None):
        self.llm = Llama(model_path=model_path, n_ctx=n_ctx, n_gpu_layers=n_gpu_layers, verbose=False)
        self.temperature = temperature
        self.max_tokens = max_tokens
        # Stop if the model starts fabricating multi-turn roles
        self.stop = stop or ["\nUser:", "User:", "\nAssistant:", "Assistant:"]

    def generate(self, prompt: str) -> str:
        out = self.llm.create_completion(
            prompt=prompt,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
            stop=self.stop,
            stream=False,
        )
        return out["choices"][0]["text"]

    def generate_stream(self, prompt: str, max_tokens: int | None = None):
        """Yield tokens (strings) incrementally using llama-cpp's streaming."""
        max_tok = max_tokens if max_tokens is not None else self.max_tokens
        sentence_endings = {".", "!", "?"}
        sentence_count = 0
        for chunk in self.llm.create_completion(
            prompt=prompt,
            max_tokens=max_tok,
            temperature=self.temperature,
            stop=self.stop,
            stream=True,
        ):
            text = chunk.get("choices", [{}])[0].get("text", "")
            if text:
                # Count sentence-ending punctuation
                for ch in text:
                    if ch in sentence_endings:
                        sentence_count += 1
                        if sentence_count >= 2:
                            # Emit up to this point then stop early
                            yield ch
                            return
                yield text


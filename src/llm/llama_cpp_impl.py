# src/llm/llama_cpp_impl.py
from .base import LLMBase
from llama_cpp import Llama

class LlamaCppLLM(LLMBase):
    def __init__(self, model_path: str, n_ctx: int = 2048, n_gpu_layers: int = 35, temperature: float = 0.7):
        self.llm = Llama(model_path=model_path, n_ctx=n_ctx, n_gpu_layers=n_gpu_layers, verbose=False)
        self.temperature = temperature

    def generate(self, prompt: str) -> str:
        out = self.llm.create_completion(
            prompt=prompt, max_tokens=160, temperature=self.temperature, stream=False
        )
        return out["choices"][0]["text"]


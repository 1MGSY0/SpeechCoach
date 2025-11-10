from .base import LLMBase

class StubLLM(LLMBase):
    def __init__(self, template: str):
        self.template = template

    def generate(self, prompt: str) -> str:
        # trivial echo-style; prompt should include placeholders already filled
        return prompt

    def generate_stream(self, prompt: str):
        """Yield a tiny echo-style response for streaming UI tests.

        Extract last 'User: ...' segment if present, and reply as 'You said: ...'.
        """
        user_text = ""
        try:
            # Expect prompt like: 'User: <text>\nAssistant:'
            if "User:" in prompt:
                after = prompt.split("User:", 1)[1]
                if "\nAssistant:" in after:
                    user_text = after.split("\nAssistant:", 1)[0].strip()
                else:
                    user_text = after.strip()
        except Exception:
            user_text = ""
        reply = self.template.replace("{asr_text}", user_text or "(no input)")
        # Stream a few chunks to simulate tokens
        for part in reply.split(" "):
            yield part + " "


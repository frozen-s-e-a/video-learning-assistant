from app.providers.not_implemented import NotImplementedProvider
from app.schemas import ProviderInfo


class OpenAIProvider(NotImplementedProvider):
    provider_name = "OpenAI"
    info = ProviderInfo(
        id="openai",
        label="GPT",
        models=["gpt-4o"],
        vision=True,
        enabled=True,
    )

    def supports_vision(self, model: str) -> bool:
        return self.info.vision

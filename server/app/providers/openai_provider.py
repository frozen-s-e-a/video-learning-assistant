from app.providers.fake import FakeProvider
from app.schemas import ProviderInfo


class OpenAIProvider(FakeProvider):
    info = ProviderInfo(
        id="openai",
        label="GPT",
        models=["gpt-4o"],
        vision=True,
        enabled=True,
    )

    def supports_vision(self, model: str) -> bool:
        return self.info.vision

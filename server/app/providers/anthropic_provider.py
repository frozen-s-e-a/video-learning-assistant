from app.providers.fake import FakeProvider
from app.schemas import ProviderInfo


class AnthropicProvider(FakeProvider):
    info = ProviderInfo(
        id="anthropic",
        label="Claude",
        models=["claude-sonnet-4"],
        vision=True,
        enabled=True,
    )

    def supports_vision(self, model: str) -> bool:
        return self.info.vision

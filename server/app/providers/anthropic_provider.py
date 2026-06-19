from app.providers.not_implemented import NotImplementedProvider
from app.schemas import ProviderInfo


class AnthropicProvider(NotImplementedProvider):
    provider_name = "Anthropic"
    info = ProviderInfo(
        id="anthropic",
        label="Claude",
        models=["claude-sonnet-4"],
        vision=True,
        enabled=True,
    )

    def supports_vision(self, model: str) -> bool:
        return self.info.vision

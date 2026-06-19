from app.providers.not_implemented import NotImplementedProvider
from app.schemas import ProviderInfo


class MimoProvider(NotImplementedProvider):
    provider_name = "MiMo"
    info = ProviderInfo(
        id="mimo",
        label="MiMo",
        models=["mimo-v2.5", "mimo-v2.5-pro"],
        vision=True,
        enabled=True,
    )

    def supports_vision(self, model: str) -> bool:
        return self.info.vision

from app.providers.fake import FakeProvider
from app.schemas import ProviderInfo


class MimoProvider(FakeProvider):
    info = ProviderInfo(
        id="mimo",
        label="MiMo",
        models=["mimo-v2.5", "mimo-v2.5-pro"],
        vision=True,
        enabled=True,
    )

    def supports_vision(self, model: str) -> bool:
        return self.info.vision

from app.providers.fake import FakeProvider
from app.schemas import ProviderInfo


class DeepSeekProvider(FakeProvider):
    info = ProviderInfo(
        id="deepseek",
        label="DeepSeek",
        models=["deepseek-chat", "deepseek-reasoner"],
        vision=False,
        enabled=True,
    )

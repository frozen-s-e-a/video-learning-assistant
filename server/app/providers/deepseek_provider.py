from app.providers.not_implemented import NotImplementedProvider
from app.schemas import ProviderInfo


class DeepSeekProvider(NotImplementedProvider):
    provider_name = "DeepSeek"
    info = ProviderInfo(
        id="deepseek",
        label="DeepSeek",
        models=["deepseek-chat", "deepseek-reasoner"],
        vision=False,
        enabled=True,
    )

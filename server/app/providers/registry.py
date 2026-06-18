from app.config import Settings
from app.providers.anthropic_provider import AnthropicProvider
from app.providers.base import BaseProvider
from app.providers.deepseek_provider import DeepSeekProvider
from app.providers.fake import FakeProvider
from app.providers.mimo_provider import MimoProvider
from app.providers.openai_provider import OpenAIProvider


def build_provider_registry(settings: Settings) -> dict[str, BaseProvider]:
    providers: dict[str, BaseProvider] = {"fake": FakeProvider()}

    if settings.openai_api_key:
        providers["openai"] = OpenAIProvider()
    if settings.anthropic_api_key:
        providers["anthropic"] = AnthropicProvider()
    if settings.deepseek_api_key:
        providers["deepseek"] = DeepSeekProvider()
    if settings.mimo_api_key:
        providers["mimo"] = MimoProvider()

    return providers

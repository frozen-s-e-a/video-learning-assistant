from app.config import Settings
from app.providers.base import BaseProvider
from app.providers.fake import FakeProvider


def build_provider_registry(settings: Settings) -> dict[str, BaseProvider]:
    return {"fake": FakeProvider()}

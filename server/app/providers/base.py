from abc import ABC, abstractmethod

from app.schemas import AnalyzeFrameRequest, AnalyzeFrameResponse, ProviderInfo


class BaseProvider(ABC):
    info: ProviderInfo

    def supports_vision(self, model: str) -> bool:
        return self.info.vision

    @abstractmethod
    async def analyze_with_image(
        self, request: AnalyzeFrameRequest
    ) -> AnalyzeFrameResponse:
        raise NotImplementedError

    @abstractmethod
    async def analyze_with_text(
        self, request: AnalyzeFrameRequest, extracted_text: str
    ) -> AnalyzeFrameResponse:
        raise NotImplementedError

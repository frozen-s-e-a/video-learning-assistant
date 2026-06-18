from abc import ABC, abstractmethod

from app.schemas import AnalyzeFrameRequest, AnalyzeFrameResponse, ProviderInfo


class BaseProvider(ABC):
    info: ProviderInfo

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

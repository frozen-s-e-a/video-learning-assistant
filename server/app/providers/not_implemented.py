from app.errors import api_error
from app.providers.base import BaseProvider
from app.schemas import (
    AnalyzeFrameRequest,
    AnalyzeFrameResponse,
    FollowUpRequest,
    FollowUpResponse,
)


class NotImplementedProvider(BaseProvider):
    provider_name: str

    def _raise_not_implemented(self):
        raise api_error(
            501,
            "PROVIDER_NOT_IMPLEMENTED",
            f"{self.provider_name} provider is not implemented yet",
        )

    async def analyze_with_image(
        self, request: AnalyzeFrameRequest
    ) -> AnalyzeFrameResponse:
        self._raise_not_implemented()

    async def analyze_with_text(
        self, request: AnalyzeFrameRequest, extracted_text: str
    ) -> AnalyzeFrameResponse:
        self._raise_not_implemented()

    async def follow_up(self, request: FollowUpRequest) -> FollowUpResponse:
        self._raise_not_implemented()

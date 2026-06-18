import base64
from binascii import Error as Base64Error

from app.errors import api_error
from app.providers.base import BaseProvider
from app.schemas import AnalyzeFrameRequest, AnalyzeFrameResponse
from app.services.ocr import OcrService

MAX_IMAGE_BYTES = 6 * 1024 * 1024
MAX_BASE64_CHARS = ((MAX_IMAGE_BYTES + 2) // 3) * 4


class AnalyzerService:
    def __init__(
        self,
        providers: dict[str, BaseProvider],
        ocr_service: OcrService,
    ) -> None:
        self.providers = providers
        self.ocr_service = ocr_service

    async def analyze(self, request: AnalyzeFrameRequest) -> AnalyzeFrameResponse:
        provider = self.providers.get(request.provider)
        if provider is None:
            raise api_error(400, "MODEL_NOT_CONFIGURED", "Selected provider is not configured")

        self._validate_image_size(request.image.data)

        if request.model not in provider.info.models:
            raise api_error(400, "MODEL_NOT_CONFIGURED", "Selected model is not configured")

        if provider.supports_vision(request.model):
            return await provider.analyze_with_image(request)

        extracted_text = await self.ocr_service.extract_text(request)
        return await provider.analyze_with_text(request, extracted_text)

    def models(self) -> list[dict[str, object]]:
        return [provider.info.model_dump() for provider in self.providers.values()]

    def _validate_image_size(self, image_data: str) -> None:
        if len(image_data) > MAX_BASE64_CHARS:
            raise api_error(413, "IMAGE_TOO_LARGE", "Image payload is too large")

        try:
            raw = base64.b64decode(image_data, validate=True)
        except Base64Error:
            raise api_error(400, "INVALID_REQUEST", "Image data must be valid base64")

        if len(raw) > MAX_IMAGE_BYTES:
            raise api_error(413, "IMAGE_TOO_LARGE", "Image payload is too large")

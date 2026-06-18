from app.errors import api_error
from app.schemas import AnalyzeFrameRequest


class OcrService:
    def __init__(self, enabled: bool = False) -> None:
        self.enabled = enabled

    async def extract_text(self, request: AnalyzeFrameRequest) -> str:
        if not self.enabled:
            raise api_error(
                400,
                "OCR_NOT_CONFIGURED",
                "The selected provider requires OCR, but OCR is not configured.",
            )
        return ""

from uuid import uuid4

from app.providers.base import BaseProvider
from app.schemas import (
    AnalyzeFrameRequest,
    AnalyzeFrameResponse,
    AnswerPayload,
    AnswerSection,
    ExtractedContent,
    ProviderInfo,
)


class FakeProvider(BaseProvider):
    info = ProviderInfo(
        id="fake",
        label="Fake",
        models=["fake-vision", "fake-text"],
        vision=True,
        enabled=True,
    )

    def supports_vision(self, model: str) -> bool:
        return model == "fake-vision"

    async def analyze_with_image(
        self, request: AnalyzeFrameRequest
    ) -> AnalyzeFrameResponse:
        return AnalyzeFrameResponse(
            analysisId=str(uuid4()),
            detectedType="code",
            mode="vision",
            extracted=ExtractedContent(
                code="async function loadData() { return fetch('/api'); }",
                keywords=["async", "fetch"],
            ),
            answer=AnswerPayload(
                title="Fake analysis",
                sections=[
                    AnswerSection(
                        heading="Overall meaning",
                        content="This frame appears to explain asynchronous data loading.",
                    )
                ],
            ),
            suggestedQuestions=["Why is async used here?"],
        )

    async def analyze_with_text(
        self, request: AnalyzeFrameRequest, extracted_text: str
    ) -> AnalyzeFrameResponse:
        response = await self.analyze_with_image(request)
        response.mode = "ocr_text"
        response.extracted.code = extracted_text
        return response

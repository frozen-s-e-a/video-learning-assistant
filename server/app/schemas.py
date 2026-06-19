from typing import Literal

from pydantic import BaseModel, Field

TaskType = Literal["auto", "code", "error", "concept"]
DetectedType = Literal["code", "error", "concept", "mixed", "unknown"]
AnalysisMode = Literal["vision", "ocr_text"]


class ImagePayload(BaseModel):
    mimeType: Literal["image/jpeg", "image/png"]
    data: str = Field(min_length=1)


class Selection(BaseModel):
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    devicePixelRatio: float | None = Field(default=None, gt=0)
    viewportWidth: int | None = Field(default=None, gt=0)
    viewportHeight: int | None = Field(default=None, gt=0)


class SubtitlePayload(BaseModel):
    current: str | None = None
    nearby: list[str] = Field(default_factory=list)


class VideoContext(BaseModel):
    site: str
    title: str
    url: str
    timeSeconds: float | None = None


class AnalyzeFrameRequest(BaseModel):
    provider: str
    model: str
    taskType: TaskType = "auto"
    image: ImagePayload
    selection: Selection | None = None
    subtitle: SubtitlePayload | None = None
    videoContext: VideoContext
    question: str = Field(min_length=1)


class FollowUpRequest(BaseModel):
    analysisId: str
    provider: str
    model: str
    message: str = Field(min_length=1)
    context: dict = Field(default_factory=dict)


class ProviderInfo(BaseModel):
    id: str
    label: str
    models: list[str]
    vision: bool
    enabled: bool


class ExtractedContent(BaseModel):
    code: str = ""
    error: str = ""
    keywords: list[str] = Field(default_factory=list)


class AnswerSection(BaseModel):
    heading: str
    content: str


class AnswerPayload(BaseModel):
    title: str
    sections: list[AnswerSection]


class AnalyzeFrameResponse(BaseModel):
    analysisId: str
    detectedType: DetectedType
    mode: AnalysisMode
    extracted: ExtractedContent
    answer: AnswerPayload
    suggestedQuestions: list[str] = Field(default_factory=list)


class FollowUpResponse(BaseModel):
    analysisId: str
    answer: AnswerPayload
    suggestedQuestions: list[str] = Field(default_factory=list)

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.auth import require_token
from app.config import Settings, get_settings
from app.providers.registry import build_provider_registry
from app.schemas import AnalyzeFrameRequest
from app.services.analyzer import AnalyzerService
from app.services.ocr import OcrService


def build_analyzer(settings: Settings = Depends(get_settings)) -> AnalyzerService:
    return AnalyzerService(
        providers=build_provider_registry(settings),
        ocr_service=OcrService(enabled=False),
    )


def create_app() -> FastAPI:
    app = FastAPI(title="Video Learning Assistant")

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "Request validation failed",
                }
            },
        )

    @app.exception_handler(HTTPException)
    async def handle_http_error(request: Request, exc: HTTPException):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception):
        if hasattr(exc, "status_code") and hasattr(exc, "detail"):
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Unexpected server error",
                }
            },
        )

    @app.get("/health")
    def health() -> dict[str, bool]:
        return {"ok": True}

    @app.get("/api/models", dependencies=[Depends(require_token)])
    def models(analyzer: AnalyzerService = Depends(build_analyzer)):
        return {"providers": analyzer.models()}

    @app.post("/api/analyze-frame", dependencies=[Depends(require_token)])
    async def analyze_frame(
        request: AnalyzeFrameRequest,
        analyzer: AnalyzerService = Depends(build_analyzer),
    ):
        return await analyzer.analyze(request)

    return app


app = create_app()

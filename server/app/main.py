from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from app.auth import require_token


def create_app() -> FastAPI:
    app = FastAPI(title="Video Learning Assistant")

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
    def models() -> dict[str, list[dict[str, object]]]:
        return {"providers": []}

    return app


app = create_app()

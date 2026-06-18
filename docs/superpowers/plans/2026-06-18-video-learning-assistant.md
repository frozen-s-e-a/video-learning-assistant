# Video Learning Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome/Edge extension plus FastAPI cloud backend that analyzes paused programming tutorial video frames with selectable GPT, Claude, DeepSeek, and Xiaomi MiMo providers.

**Architecture:** The extension handles browser interaction, video-site adapters, screenshot capture, side-panel UI, and local history. The FastAPI backend handles bearer-token authentication, request validation, model capability routing, OCR gating, and provider API calls behind one stable response schema.

**Tech Stack:** Python 3.11+, FastAPI, pytest, httpx, pydantic-settings, plain Chrome Manifest V3 JavaScript modules, browser extension APIs, Vitest for extension unit tests.

---

## File Structure

Create these files:

```text
server/
  requirements.txt
  .env.example
  app/
    __init__.py
    main.py
    config.py
    auth.py
    schemas.py
    errors.py
    providers/
      __init__.py
      base.py
      registry.py
      fake.py
      openai_provider.py
      anthropic_provider.py
      deepseek_provider.py
      mimo_provider.py
    services/
      __init__.py
      analyzer.py
      ocr.py
  tests/
    conftest.py
    test_health_and_auth.py
    test_models.py
    test_analyze.py

extension/
  manifest.json
  package.json
  vitest.config.js
  src/
    background.js
    content.js
    sidepanel.html
    sidepanel.js
    options.html
    options.js
    adapters/
      bilibili.js
      youtube.js
      generic.js
      index.js
    services/
      apiClient.js
      capture.js
      history.js
      settings.js
    ui/
      overlay.js
      pauseButton.js
  tests/
    history.test.js
    adapterSelection.test.js
    apiClient.test.js

docs/
  deployment.md
  extension-install.md
```

Responsibility map:

- `server/app/main.py`: FastAPI app wiring and endpoints.
- `server/app/config.py`: environment-driven settings.
- `server/app/auth.py`: bearer-token validation.
- `server/app/schemas.py`: request and response models shared across endpoints.
- `server/app/errors.py`: typed API error responses.
- `server/app/providers/*`: provider capability and API routing.
- `server/app/services/analyzer.py`: selects vision or OCR/text path.
- `server/app/services/ocr.py`: OCR boundary with explicit disabled behavior.
- `extension/src/content.js`: site detection, video pause/play wiring, UI injection.
- `extension/src/background.js`: screenshot capture and backend message broker.
- `extension/src/sidepanel.js`: analysis UI and follow-up interaction.
- `extension/src/options.js`: backend URL, token, provider, model, and history settings.
- `extension/src/adapters/*`: Bilibili, YouTube, and generic video adapters.
- `extension/src/services/*`: API client, capture messaging, history, and settings storage.
- `extension/src/ui/*`: pause button and region selection overlay.

---

### Task 1: Backend Project Skeleton, Settings, Auth, and Health

**Files:**
- Create: `server/requirements.txt`
- Create: `server/.env.example`
- Create: `server/app/__init__.py`
- Create: `server/app/config.py`
- Create: `server/app/auth.py`
- Create: `server/app/errors.py`
- Create: `server/app/main.py`
- Create: `server/tests/conftest.py`
- Create: `server/tests/test_health_and_auth.py`

- [ ] **Step 1: Write dependency file**

Create `server/requirements.txt`:

```text
fastapi==0.115.6
uvicorn[standard]==0.32.1
pydantic==2.10.3
pydantic-settings==2.6.1
httpx==0.28.1
pytest==8.3.4
pytest-asyncio==0.24.0
python-multipart==0.0.19
Pillow==11.0.0
```

- [ ] **Step 2: Write environment example**

Create `server/.env.example`:

```text
APP_ACCESS_TOKEN=change-me
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=
MIMO_API_KEY=
```

- [ ] **Step 3: Write backend tests first**

Create `server/tests/conftest.py`:

```python
import os

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("APP_ACCESS_TOKEN", "test-token")
    from app.main import create_app

    return TestClient(create_app())
```

Create `server/tests/test_health_and_auth.py`:

```python
def test_health_does_not_require_auth(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_models_requires_auth(client):
    response = client.get("/api/models")

    assert response.status_code == 401
    assert response.json() == {
        "error": {
            "code": "UNAUTHORIZED",
            "message": "Missing or invalid authorization token",
        }
    }


def test_models_rejects_wrong_token(client):
    response = client.get(
        "/api/models",
        headers={"Authorization": "Bearer wrong-token"},
    )

    assert response.status_code == 401
```

- [ ] **Step 4: Run tests and verify they fail because the app does not exist**

Run:

```powershell
cd server
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m pytest tests/test_health_and_auth.py -v
```

Expected: FAIL with an import error for `app.main`.

- [ ] **Step 5: Implement settings, auth, errors, and health**

Create `server/app/__init__.py`:

```python
```

Create `server/app/config.py`:

```python
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_access_token: str
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    deepseek_api_key: str | None = None
    mimo_api_key: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

Create `server/app/errors.py`:

```python
from fastapi import HTTPException


def api_error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"error": {"code": code, "message": message}},
    )
```

Create `server/app/auth.py`:

```python
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings
from app.errors import api_error

bearer = HTTPBearer(auto_error=False)


def require_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    settings: Settings = Depends(get_settings),
) -> None:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise api_error(401, "UNAUTHORIZED", "Missing or invalid authorization token")

    if credentials.credentials != settings.app_access_token:
        raise api_error(401, "UNAUTHORIZED", "Missing or invalid authorization token")
```

Create `server/app/main.py`:

```python
from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse

from app.auth import require_token


def create_app() -> FastAPI:
    app = FastAPI(title="Video Learning Assistant")

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
```

- [ ] **Step 6: Run tests and verify they pass**

Run:

```powershell
cd server
.\.venv\Scripts\python -m pytest tests/test_health_and_auth.py -v
```

Expected: 3 PASS.

- [ ] **Step 7: Commit backend skeleton**

Run:

```powershell
git add server
git commit -m "feat: add FastAPI backend skeleton"
```

---

### Task 2: Backend Schemas, Model Registry, and Analyze Endpoint with Fake Provider

**Files:**
- Create: `server/app/schemas.py`
- Create: `server/app/providers/__init__.py`
- Create: `server/app/providers/base.py`
- Create: `server/app/providers/fake.py`
- Create: `server/app/providers/registry.py`
- Create: `server/app/services/__init__.py`
- Create: `server/app/services/ocr.py`
- Create: `server/app/services/analyzer.py`
- Modify: `server/app/main.py`
- Create: `server/tests/test_models.py`
- Create: `server/tests/test_analyze.py`

- [ ] **Step 1: Write registry and analyze tests**

Create `server/tests/test_models.py`:

```python
def auth_headers():
    return {"Authorization": "Bearer test-token"}


def test_models_returns_fake_provider_for_development(client):
    response = client.get("/api/models", headers=auth_headers())

    assert response.status_code == 200
    assert response.json() == {
        "providers": [
            {
                "id": "fake",
                "label": "Fake",
                "models": ["fake-vision", "fake-text"],
                "vision": True,
                "enabled": True,
            }
        ]
    }
```

Create `server/tests/test_analyze.py`:

```python
import base64


def auth_headers():
    return {"Authorization": "Bearer test-token"}


def tiny_jpeg_base64():
    return base64.b64encode(
        bytes.fromhex(
            "ffd8ffe000104a46494600010101006000600000ffdb004300"
            "0302020302020303030304030304050805050404050a07070608"
            "0c0a0c0c0b0a0b0b0d0e12100d0e110e0b0b1016101113141515"
            "1515150c0f171816141812141514ffdb00430103040405040509"
            "050509140d0b0d14141414141414141414141414141414141414"
            "1414141414141414141414141414141414141414141414141414"
            "1414141414ffc00011080001000103012200021101031101ffc4"
            "001f000001050101010101010000000000000000010203040506"
            "0708090a0bffc400b5100002010303020403050504040000017d"
            "01020300041105122131410613516107227114328191a1082342"
            "b1c11552d1f02433627282090a161718191a25262728292a3435"
            "363738393a434445464748494a535455565758595a6364656667"
            "68696a737475767778797a838485868788898a92939495969798"
            "999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6"
            "c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2"
            "f3f4f5f6f7f8f9faffc4001f0100030101010101010101010000"
            "000000000102030405060708090a0bffc400b511000201020404"
            "0304070504040001027700010203110405213106124151076171"
            "132232810814291a1b1c109233352f0156272d10a162434e125"
            "f11718191a262728292a35363738393a434445464748494a5354"
            "55565758595a636465666768696a737475767778797a82838485"
            "868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4"
            "b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2"
            "e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002"
            "110311003f00f7fa28a2803fffd9"
        )
    ).decode("ascii")


def analyze_payload(provider="fake", model="fake-vision"):
    return {
        "provider": provider,
        "model": model,
        "taskType": "auto",
        "image": {"mimeType": "image/jpeg", "data": tiny_jpeg_base64()},
        "selection": None,
        "subtitle": {"current": "This function fetches data.", "nearby": []},
        "videoContext": {
            "site": "bilibili",
            "title": "Async tutorial",
            "url": "https://www.bilibili.com/video/BV1",
            "timeSeconds": 42,
        },
        "question": "Explain this frame",
    }


def test_analyze_frame_with_fake_provider(client):
    response = client.post(
        "/api/analyze-frame",
        headers=auth_headers(),
        json=analyze_payload(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["detectedType"] == "code"
    assert body["mode"] == "vision"
    assert body["answer"]["title"] == "Fake analysis"
    assert body["suggestedQuestions"] == ["Why is async used here?"]


def test_unknown_provider_returns_model_not_configured(client):
    response = client.post(
        "/api/analyze-frame",
        headers=auth_headers(),
        json=analyze_payload(provider="missing", model="x"),
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "MODEL_NOT_CONFIGURED"
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
cd server
.\.venv\Scripts\python -m pytest tests/test_models.py tests/test_analyze.py -v
```

Expected: FAIL because schemas and analyze endpoint are missing.

- [ ] **Step 3: Implement schemas**

Create `server/app/schemas.py`:

```python
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
```

- [ ] **Step 4: Implement provider interface and fake provider**

Create `server/app/providers/__init__.py`:

```python
```

Create `server/app/providers/base.py`:

```python
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
```

Create `server/app/providers/fake.py`:

```python
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
```

Create `server/app/providers/registry.py`:

```python
from app.config import Settings
from app.providers.base import BaseProvider
from app.providers.fake import FakeProvider


def build_provider_registry(settings: Settings) -> dict[str, BaseProvider]:
    return {"fake": FakeProvider()}
```

- [ ] **Step 5: Implement OCR boundary and analyzer**

Create `server/app/services/__init__.py`:

```python
```

Create `server/app/services/ocr.py`:

```python
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
```

Create `server/app/services/analyzer.py`:

```python
import base64
from binascii import Error as Base64Error

from app.errors import api_error
from app.providers.base import BaseProvider
from app.schemas import AnalyzeFrameRequest, AnalyzeFrameResponse
from app.services.ocr import OcrService

MAX_IMAGE_BYTES = 6 * 1024 * 1024


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

        if provider.info.vision:
            return await provider.analyze_with_image(request)

        extracted_text = await self.ocr_service.extract_text(request)
        return await provider.analyze_with_text(request, extracted_text)

    def models(self) -> list[dict[str, object]]:
        return [provider.info.model_dump() for provider in self.providers.values()]

    def _validate_image_size(self, image_data: str) -> None:
        try:
            raw = base64.b64decode(image_data, validate=True)
        except Base64Error:
            raise api_error(400, "INVALID_REQUEST", "Image data must be valid base64")

        if len(raw) > MAX_IMAGE_BYTES:
            raise api_error(413, "IMAGE_TOO_LARGE", "Image payload is too large")
```

- [ ] **Step 6: Wire endpoints**

Replace `server/app/main.py` with:

```python
from fastapi import Depends, FastAPI, Request
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
```

- [ ] **Step 7: Run backend tests**

Run:

```powershell
cd server
.\.venv\Scripts\python -m pytest -v
```

Expected: all backend tests PASS.

- [ ] **Step 8: Commit analyze contract**

Run:

```powershell
git add server
git commit -m "feat: add backend analyze contract"
```

---

### Task 3: Provider Capability Registry and Non-Vision OCR Gate

**Files:**
- Create: `server/app/providers/openai_provider.py`
- Create: `server/app/providers/anthropic_provider.py`
- Create: `server/app/providers/deepseek_provider.py`
- Create: `server/app/providers/mimo_provider.py`
- Modify: `server/app/providers/registry.py`
- Modify: `server/tests/test_models.py`
- Modify: `server/tests/test_analyze.py`

- [ ] **Step 1: Extend tests for configured providers and OCR gate**

Append to `server/tests/test_models.py`:

```python
def test_models_includes_configured_openai(client, monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "openai-key")

    response = client.get("/api/models", headers=auth_headers())

    assert response.status_code == 200
    provider_ids = [provider["id"] for provider in response.json()["providers"]]
    assert "openai" in provider_ids
```

Append to `server/tests/test_analyze.py`:

```python
def test_non_vision_provider_without_ocr_returns_ocr_not_configured(client, monkeypatch):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "deepseek-key")

    response = client.post(
        "/api/analyze-frame",
        headers=auth_headers(),
        json=analyze_payload(provider="deepseek", model="deepseek-chat"),
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "OCR_NOT_CONFIGURED"
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
cd server
.\.venv\Scripts\python -m pytest tests/test_models.py tests/test_analyze.py -v
```

Expected: FAIL because real provider shells are missing.

- [ ] **Step 3: Implement provider shells**

Create `server/app/providers/openai_provider.py`:

```python
from app.providers.fake import FakeProvider
from app.schemas import ProviderInfo


class OpenAIProvider(FakeProvider):
    info = ProviderInfo(
        id="openai",
        label="GPT",
        models=["gpt-4o"],
        vision=True,
        enabled=True,
    )
```

Create `server/app/providers/anthropic_provider.py`:

```python
from app.providers.fake import FakeProvider
from app.schemas import ProviderInfo


class AnthropicProvider(FakeProvider):
    info = ProviderInfo(
        id="anthropic",
        label="Claude",
        models=["claude-sonnet-4"],
        vision=True,
        enabled=True,
    )
```

Create `server/app/providers/deepseek_provider.py`:

```python
from app.providers.fake import FakeProvider
from app.schemas import ProviderInfo


class DeepSeekProvider(FakeProvider):
    info = ProviderInfo(
        id="deepseek",
        label="DeepSeek",
        models=["deepseek-chat", "deepseek-reasoner"],
        vision=False,
        enabled=True,
    )
```

Create `server/app/providers/mimo_provider.py`:

```python
from app.providers.fake import FakeProvider
from app.schemas import ProviderInfo


class MimoProvider(FakeProvider):
    info = ProviderInfo(
        id="mimo",
        label="MiMo",
        models=["mimo-v2.5", "mimo-v2.5-pro"],
        vision=True,
        enabled=True,
    )
```

Replace `server/app/providers/registry.py` with:

```python
from app.config import Settings
from app.providers.anthropic_provider import AnthropicProvider
from app.providers.base import BaseProvider
from app.providers.deepseek_provider import DeepSeekProvider
from app.providers.fake import FakeProvider
from app.providers.mimo_provider import MimoProvider
from app.providers.openai_provider import OpenAIProvider


def build_provider_registry(settings: Settings) -> dict[str, BaseProvider]:
    providers: dict[str, BaseProvider] = {"fake": FakeProvider()}

    if settings.openai_api_key:
        providers["openai"] = OpenAIProvider()
    if settings.anthropic_api_key:
        providers["anthropic"] = AnthropicProvider()
    if settings.deepseek_api_key:
        providers["deepseek"] = DeepSeekProvider()
    if settings.mimo_api_key:
        providers["mimo"] = MimoProvider()

    return providers
```

- [ ] **Step 4: Run provider tests**

Run:

```powershell
cd server
.\.venv\Scripts\python -m pytest tests/test_models.py tests/test_analyze.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit provider capability registry**

Run:

```powershell
git add server
git commit -m "feat: add provider capability registry"
```

---

### Task 4: Extension Skeleton, Settings Storage, and Local History

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/package.json`
- Create: `extension/vitest.config.js`
- Create: `extension/src/services/settings.js`
- Create: `extension/src/services/history.js`
- Create: `extension/src/options.html`
- Create: `extension/src/options.js`
- Create: `extension/tests/history.test.js`

- [ ] **Step 1: Write extension package and test config**

Create `extension/package.json`:

```json
{
  "name": "video-learning-assistant-extension",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "2.1.8",
    "jsdom": "25.0.1"
  }
}
```

Create `extension/vitest.config.js`:

```javascript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
  },
});
```

- [ ] **Step 2: Write history tests**

Create `extension/tests/history.test.js`:

```javascript
import { describe, expect, it } from "vitest";
import { trimHistoryEntries } from "../src/services/history.js";

describe("trimHistoryEntries", () => {
  it("keeps newest entries first and limits by count", () => {
    const entries = [
      { id: "old", createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "new", createdAt: "2026-01-02T00:00:00.000Z" },
      { id: "middle", createdAt: "2026-01-01T12:00:00.000Z" }
    ];

    expect(trimHistoryEntries(entries, 2).map((entry) => entry.id)).toEqual([
      "new",
      "middle"
    ]);
  });
});
```

- [ ] **Step 3: Run tests and verify they fail**

Run:

```powershell
cd extension
npm install
npm test
```

Expected: FAIL because `history.js` does not exist.

- [ ] **Step 4: Implement manifest, settings, history, and options page**

Create `extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Video Learning Assistant",
  "version": "0.1.0",
  "description": "Analyze paused programming tutorial video frames with AI.",
  "permissions": ["activeTab", "storage", "tabs", "scripting", "sidePanel"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "src/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content.js"],
      "run_at": "document_idle"
    }
  ],
  "side_panel": {
    "default_path": "src/sidepanel.html"
  },
  "options_page": "src/options.html",
  "action": {
    "default_title": "Video Learning Assistant"
  }
}
```

Create `extension/src/services/settings.js`:

```javascript
export const DEFAULT_SETTINGS = {
  backendUrl: "",
  accessToken: "",
  defaultProvider: "fake",
  defaultModel: "fake-vision",
  defaultTaskType: "auto",
  historyLimit: 50,
  showPauseButton: true
};

export async function getSettings(storage = chrome.storage.local) {
  const stored = await storage.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings, storage = chrome.storage.local) {
  await storage.set({ ...DEFAULT_SETTINGS, ...settings });
}
```

Create `extension/src/services/history.js`:

```javascript
export function trimHistoryEntries(entries, limit) {
  return [...entries]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function addHistoryEntry(entry, limit, storage = chrome.storage.local) {
  const stored = await storage.get({ historyEntries: [] });
  const nextEntries = trimHistoryEntries(
    [{ ...entry, createdAt: entry.createdAt ?? new Date().toISOString() }, ...stored.historyEntries],
    limit
  );
  await storage.set({ historyEntries: nextEntries });
  return nextEntries;
}

export async function clearHistory(storage = chrome.storage.local) {
  await storage.set({ historyEntries: [] });
}
```

Create `extension/src/options.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Video Learning Assistant Settings</title>
    <style>
      body { font: 14px system-ui, sans-serif; max-width: 720px; margin: 32px auto; }
      label { display: block; margin: 14px 0; }
      input, select { width: 100%; padding: 8px; margin-top: 4px; }
      button { padding: 8px 12px; }
      #status { margin-left: 8px; }
    </style>
  </head>
  <body>
    <h1>Video Learning Assistant</h1>
    <label>Backend URL <input id="backendUrl"></label>
    <label>Access Token <input id="accessToken" type="password"></label>
    <label>Provider
      <select id="defaultProvider">
        <option value="fake">Fake</option>
        <option value="openai">GPT</option>
        <option value="anthropic">Claude</option>
        <option value="deepseek">DeepSeek</option>
        <option value="mimo">MiMo</option>
      </select>
    </label>
    <label>Model <input id="defaultModel"></label>
    <label>Task Type
      <select id="defaultTaskType">
        <option value="auto">Auto</option>
        <option value="code">Code</option>
        <option value="error">Error</option>
        <option value="concept">Concept</option>
      </select>
    </label>
    <label>History Limit <input id="historyLimit" type="number" min="1" max="500"></label>
    <label><input id="showPauseButton" type="checkbox"> Show pause button</label>
    <button id="save">Save</button><span id="status"></span>
    <script type="module" src="./options.js"></script>
  </body>
</html>
```

Create `extension/src/options.js`:

```javascript
import { getSettings, saveSettings } from "./services/settings.js";

const fields = [
  "backendUrl",
  "accessToken",
  "defaultProvider",
  "defaultModel",
  "defaultTaskType",
  "historyLimit",
  "showPauseButton"
];

function readForm() {
  return {
    backendUrl: document.querySelector("#backendUrl").value.trim(),
    accessToken: document.querySelector("#accessToken").value.trim(),
    defaultProvider: document.querySelector("#defaultProvider").value,
    defaultModel: document.querySelector("#defaultModel").value.trim(),
    defaultTaskType: document.querySelector("#defaultTaskType").value,
    historyLimit: Number(document.querySelector("#historyLimit").value),
    showPauseButton: document.querySelector("#showPauseButton").checked
  };
}

function writeForm(settings) {
  for (const field of fields) {
    const element = document.querySelector(`#${field}`);
    if (element.type === "checkbox") {
      element.checked = Boolean(settings[field]);
    } else {
      element.value = settings[field];
    }
  }
}

async function main() {
  writeForm(await getSettings());
  document.querySelector("#save").addEventListener("click", async () => {
    await saveSettings(readForm());
    document.querySelector("#status").textContent = "Saved";
  });
}

main();
```

- [ ] **Step 5: Run extension tests**

Run:

```powershell
cd extension
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit extension settings and history**

Run:

```powershell
git add extension
git commit -m "feat: add extension settings and history"
```

---

### Task 5: Video Site Adapters and Pause Button UI

**Files:**
- Create: `extension/src/adapters/bilibili.js`
- Create: `extension/src/adapters/youtube.js`
- Create: `extension/src/adapters/generic.js`
- Create: `extension/src/adapters/index.js`
- Create: `extension/src/ui/pauseButton.js`
- Create: `extension/src/content.js`
- Create: `extension/tests/adapterSelection.test.js`

- [ ] **Step 1: Write adapter selection tests**

Create `extension/tests/adapterSelection.test.js`:

```javascript
import { describe, expect, it } from "vitest";
import { selectAdapterName } from "../src/adapters/index.js";

describe("selectAdapterName", () => {
  it("selects bilibili for Bilibili video pages", () => {
    expect(selectAdapterName("https://www.bilibili.com/video/BV123")).toBe("bilibili");
  });

  it("selects youtube for YouTube watch pages", () => {
    expect(selectAdapterName("https://www.youtube.com/watch?v=abc")).toBe("youtube");
  });

  it("falls back to generic for other pages", () => {
    expect(selectAdapterName("https://example.com/course")).toBe("generic");
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
cd extension
npm test
```

Expected: FAIL because adapter modules do not exist.

- [ ] **Step 3: Implement adapters**

Create `extension/src/adapters/generic.js`:

```javascript
export class GenericVideoAdapter {
  constructor(doc = document, win = window) {
    this.document = doc;
    this.window = win;
  }

  detect() {
    return Boolean(this.getVideoElement());
  }

  getVideoElement() {
    const videos = [...this.document.querySelectorAll("video")]
      .filter((video) => video.offsetWidth > 0 && video.offsetHeight > 0);
    return videos.sort((a, b) => (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight))[0] ?? null;
  }

  getVideoContext() {
    const video = this.getVideoElement();
    return {
      site: "generic",
      title: this.document.title || "Untitled video",
      url: this.window.location.href,
      timeSeconds: video ? video.currentTime : null
    };
  }

  getCurrentSubtitle() {
    return { current: null, nearby: [] };
  }

  onPause(callback) {
    const video = this.getVideoElement();
    if (video) video.addEventListener("pause", callback);
  }

  onPlay(callback) {
    const video = this.getVideoElement();
    if (video) video.addEventListener("play", callback);
  }
}
```

Create `extension/src/adapters/bilibili.js`:

```javascript
import { GenericVideoAdapter } from "./generic.js";

export class BilibiliAdapter extends GenericVideoAdapter {
  detect() {
    return this.window.location.hostname.includes("bilibili.com") && Boolean(this.getVideoElement());
  }

  getVideoContext() {
    const base = super.getVideoContext();
    const title =
      this.document.querySelector("h1.video-title")?.textContent?.trim() ||
      this.document.querySelector(".video-title")?.textContent?.trim() ||
      base.title;
    return { ...base, site: "bilibili", title };
  }

  getCurrentSubtitle() {
    const current =
      this.document.querySelector(".bpx-player-subtitle-current-text")?.textContent?.trim() ||
      this.document.querySelector(".bilibili-player-video-subtitle")?.textContent?.trim() ||
      null;
    return { current, nearby: current ? [current] : [] };
  }
}
```

Create `extension/src/adapters/youtube.js`:

```javascript
import { GenericVideoAdapter } from "./generic.js";

export class YouTubeAdapter extends GenericVideoAdapter {
  detect() {
    return this.window.location.hostname.includes("youtube.com") &&
      this.window.location.pathname === "/watch" &&
      Boolean(this.getVideoElement());
  }

  getVideoContext() {
    const base = super.getVideoContext();
    const title =
      this.document.querySelector("h1 yt-formatted-string")?.textContent?.trim() ||
      this.document.querySelector("h1")?.textContent?.trim() ||
      base.title;
    return { ...base, site: "youtube", title };
  }

  getCurrentSubtitle() {
    const captions = [...this.document.querySelectorAll(".ytp-caption-segment")]
      .map((node) => node.textContent.trim())
      .filter(Boolean);
    return { current: captions.at(-1) ?? null, nearby: captions };
  }
}
```

Create `extension/src/adapters/index.js`:

```javascript
import { BilibiliAdapter } from "./bilibili.js";
import { GenericVideoAdapter } from "./generic.js";
import { YouTubeAdapter } from "./youtube.js";

export function selectAdapterName(url) {
  const parsed = new URL(url);
  if (parsed.hostname.includes("bilibili.com") && parsed.pathname.startsWith("/video/")) {
    return "bilibili";
  }
  if (parsed.hostname.includes("youtube.com") && parsed.pathname === "/watch") {
    return "youtube";
  }
  return "generic";
}

export function createAdapter(doc = document, win = window) {
  const name = selectAdapterName(win.location.href);
  if (name === "bilibili") return new BilibiliAdapter(doc, win);
  if (name === "youtube") return new YouTubeAdapter(doc, win);
  return new GenericVideoAdapter(doc, win);
}
```

- [ ] **Step 4: Implement pause button and content script**

Create `extension/src/ui/pauseButton.js`:

```javascript
export function createPauseButton(onAnalyze) {
  const container = document.createElement("div");
  container.id = "vla-pause-button";
  container.style.cssText = [
    "position: fixed",
    "right: 24px",
    "bottom: 96px",
    "z-index: 2147483647",
    "display: none",
    "gap: 8px",
    "align-items: center",
    "background: #111827",
    "color: white",
    "padding: 10px",
    "border-radius: 8px",
    "box-shadow: 0 8px 30px rgba(0,0,0,.25)",
    "font: 14px system-ui, sans-serif"
  ].join(";");

  const select = document.createElement("select");
  select.innerHTML = `
    <option value="auto">Auto</option>
    <option value="code">Code</option>
    <option value="error">Error</option>
    <option value="concept">Concept</option>
  `;

  const button = document.createElement("button");
  button.textContent = "Analyze current frame";
  button.addEventListener("click", () => onAnalyze(select.value));

  container.append(select, button);
  document.documentElement.append(container);

  return {
    show() {
      container.style.display = "flex";
    },
    hide() {
      container.style.display = "none";
    }
  };
}
```

Create `extension/src/content.js`:

```javascript
import { createAdapter } from "./adapters/index.js";
import { createPauseButton } from "./ui/pauseButton.js";

const adapter = createAdapter();
const pauseButton = createPauseButton((taskType) => {
  const videoContext = adapter.getVideoContext();
  const subtitle = adapter.getCurrentSubtitle();
  chrome.runtime.sendMessage({
    type: "VLA_ANALYZE_CURRENT_FRAME",
    payload: { taskType, videoContext, subtitle }
  });
});

let pauseTimer = null;

function showAfterDebounce() {
  clearTimeout(pauseTimer);
  pauseTimer = setTimeout(() => {
    const video = adapter.getVideoElement();
    if (video?.paused) pauseButton.show();
  }, 300);
}

function hideButton() {
  clearTimeout(pauseTimer);
  pauseButton.hide();
}

function attach() {
  if (!adapter.detect()) return;
  adapter.onPause(showAfterDebounce);
  adapter.onPlay(hideButton);
}

attach();
```

- [ ] **Step 5: Run extension tests**

Run:

```powershell
cd extension
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit adapters and pause button**

Run:

```powershell
git add extension
git commit -m "feat: add video adapters and pause button"
```

---

### Task 6: Screenshot Capture, API Client, Side Panel, and History Wiring

**Files:**
- Create: `extension/src/services/apiClient.js`
- Create: `extension/src/services/capture.js`
- Create: `extension/src/background.js`
- Create: `extension/src/sidepanel.html`
- Create: `extension/src/sidepanel.js`
- Modify: `extension/src/services/history.js`
- Create: `extension/tests/apiClient.test.js`

- [ ] **Step 1: Write API client test**

Create `extension/tests/apiClient.test.js`:

```javascript
import { describe, expect, it, vi } from "vitest";
import { analyzeFrame } from "../src/services/apiClient.js";

describe("analyzeFrame", () => {
  it("sends bearer token and payload to the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ analysisId: "1" })
    });

    const response = await analyzeFrame({
      backendUrl: "https://example.com",
      accessToken: "token",
      payload: { provider: "fake" },
      fetchImpl: fetchMock
    });

    expect(response).toEqual({ analysisId: "1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/analyze-frame",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token" })
      })
    );
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
cd extension
npm test
```

Expected: FAIL because `apiClient.js` does not exist.

- [ ] **Step 3: Implement API client and capture helper**

Create `extension/src/services/apiClient.js`:

```javascript
export async function analyzeFrame({ backendUrl, accessToken, payload, fetchImpl = fetch }) {
  const response = await fetchImpl(`${backendUrl.replace(/\/$/, "")}/api/analyze-frame`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  if (!response.ok) {
    const message = body?.error?.message || "Backend request failed";
    throw new Error(message);
  }
  return body;
}
```

Create `extension/src/services/capture.js`:

```javascript
export function dataUrlToImagePayload(dataUrl) {
  const [meta, data] = dataUrl.split(",");
  const mimeType = meta.includes("image/png") ? "image/png" : "image/jpeg";
  return { mimeType, data };
}

export async function captureVisibleTab() {
  const dataUrl = await chrome.tabs.captureVisibleTab({ format: "jpeg", quality: 82 });
  return dataUrlToImagePayload(dataUrl);
}
```

- [ ] **Step 4: Implement background service worker**

Create `extension/src/background.js`:

```javascript
import { analyzeFrame } from "./services/apiClient.js";
import { captureVisibleTab } from "./services/capture.js";
import { addHistoryEntry } from "./services/history.js";
import { getSettings } from "./services/settings.js";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "VLA_ANALYZE_CURRENT_FRAME") return false;

  handleAnalyze(message.payload)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function handleAnalyze(payload) {
  const settings = await getSettings();
  const image = await captureVisibleTab();

  const result = await analyzeFrame({
    backendUrl: settings.backendUrl,
    accessToken: settings.accessToken,
    payload: {
      provider: settings.defaultProvider,
      model: settings.defaultModel,
      taskType: payload.taskType || settings.defaultTaskType,
      image,
      selection: payload.selection || null,
      subtitle: payload.subtitle,
      videoContext: payload.videoContext,
      question: "Explain the current paused video frame."
    }
  });

  await addHistoryEntry({
    id: result.analysisId,
    videoTitle: payload.videoContext.title,
    videoUrl: payload.videoContext.url,
    timeSeconds: payload.videoContext.timeSeconds,
    provider: settings.defaultProvider,
    model: settings.defaultModel,
    taskType: payload.taskType || settings.defaultTaskType,
    question: "Explain the current paused video frame.",
    answerSummary: result.answer.title
  }, settings.historyLimit);

  await chrome.storage.session.set({ latestAnalysis: result });
  await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  return result;
}
```

- [ ] **Step 5: Implement side panel**

Create `extension/src/sidepanel.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Video Learning Assistant</title>
    <style>
      body { font: 14px system-ui, sans-serif; margin: 0; padding: 16px; }
      section { border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 12px; }
      textarea { width: 100%; min-height: 72px; }
      button { padding: 8px 10px; }
      .muted { color: #6b7280; }
    </style>
  </head>
  <body>
    <section>
      <h1>Learning Assistant</h1>
      <div id="status" class="muted">No analysis yet.</div>
    </section>
    <section id="answer"></section>
    <section>
      <label for="question">Follow-up question</label>
      <textarea id="question"></textarea>
      <button id="ask">Ask</button>
    </section>
    <script type="module" src="./sidepanel.js"></script>
  </body>
</html>
```

Create `extension/src/sidepanel.js`:

```javascript
function renderAnalysis(result) {
  const status = document.querySelector("#status");
  const answer = document.querySelector("#answer");

  if (!result) {
    status.textContent = "No analysis yet.";
    answer.innerHTML = "";
    return;
  }

  status.textContent = `${result.detectedType} analysis via ${result.mode}`;
  answer.innerHTML = `
    <h2>${escapeHtml(result.answer.title)}</h2>
    ${result.answer.sections.map((section) => `
      <article>
        <h3>${escapeHtml(section.heading)}</h3>
        <p>${escapeHtml(section.content)}</p>
      </article>
    `).join("")}
    <h3>Suggested questions</h3>
    <ul>${result.suggestedQuestions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ul>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function main() {
  const stored = await chrome.storage.session.get({ latestAnalysis: null });
  renderAnalysis(stored.latestAnalysis);
}

main();
```

- [ ] **Step 6: Run tests**

Run:

```powershell
cd extension
npm test
```

Expected: PASS.

- [ ] **Step 7: Commit capture and side panel**

Run:

```powershell
git add extension
git commit -m "feat: connect extension capture to backend"
```

---

### Task 7: Region Selection Overlay

**Files:**
- Create: `extension/src/ui/overlay.js`
- Modify: `extension/src/content.js`
- Modify: `extension/src/sidepanel.html`
- Modify: `extension/src/sidepanel.js`

- [ ] **Step 1: Add region selection UI module**

Create `extension/src/ui/overlay.js`:

```javascript
export function startRegionSelection() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = [
      "position: fixed",
      "inset: 0",
      "z-index: 2147483647",
      "cursor: crosshair",
      "background: rgba(15, 23, 42, .16)"
    ].join(";");

    const box = document.createElement("div");
    box.style.cssText = [
      "position: fixed",
      "border: 2px solid #2563eb",
      "background: rgba(37, 99, 235, .12)",
      "display: none"
    ].join(";");

    document.documentElement.append(overlay, box);

    let startX = 0;
    let startY = 0;

    overlay.addEventListener("mousedown", (event) => {
      startX = event.clientX;
      startY = event.clientY;
      box.style.display = "block";
      updateBox(box, startX, startY, startX, startY);
    });

    overlay.addEventListener("mousemove", (event) => {
      if (box.style.display !== "block") return;
      updateBox(box, startX, startY, event.clientX, event.clientY);
    });

    overlay.addEventListener("mouseup", (event) => {
      const selection = toSelection(startX, startY, event.clientX, event.clientY);
      overlay.remove();
      box.remove();
      resolve(selection.width > 8 && selection.height > 8 ? selection : null);
    });
  });
}

function updateBox(box, x1, y1, x2, y2) {
  const selection = toSelection(x1, y1, x2, y2);
  box.style.left = `${selection.x}px`;
  box.style.top = `${selection.y}px`;
  box.style.width = `${selection.width}px`;
  box.style.height = `${selection.height}px`;
}

function toSelection(x1, y1, x2, y2) {
  return {
    x: Math.round(Math.min(x1, x2)),
    y: Math.round(Math.min(y1, y2)),
    width: Math.round(Math.abs(x2 - x1)),
    height: Math.round(Math.abs(y2 - y1))
  };
}
```

- [ ] **Step 2: Wire region selection in content script**

Modify `extension/src/content.js`:

```javascript
import { createAdapter } from "./adapters/index.js";
import { startRegionSelection } from "./ui/overlay.js";
import { createPauseButton } from "./ui/pauseButton.js";

const adapter = createAdapter();
const pauseButton = createPauseButton((taskType) => {
  sendAnalyzeMessage(taskType, null);
});

let pauseTimer = null;

function sendAnalyzeMessage(taskType, selection) {
  const videoContext = adapter.getVideoContext();
  const subtitle = adapter.getCurrentSubtitle();
  chrome.runtime.sendMessage({
    type: "VLA_ANALYZE_CURRENT_FRAME",
    payload: { taskType, videoContext, subtitle, selection }
  });
}

function showAfterDebounce() {
  clearTimeout(pauseTimer);
  pauseTimer = setTimeout(() => {
    const video = adapter.getVideoElement();
    if (video?.paused) pauseButton.show();
  }, 300);
}

function hideButton() {
  clearTimeout(pauseTimer);
  pauseButton.hide();
}

function attach() {
  if (!adapter.detect()) return;
  adapter.onPause(showAfterDebounce);
  adapter.onPlay(hideButton);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "VLA_SELECT_REGION") return false;

  startRegionSelection().then((selection) => {
    if (selection) sendAnalyzeMessage(message.taskType || "auto", selection);
    sendResponse({ ok: true, selection });
  });

  return true;
});

attach();
```

- [ ] **Step 3: Add side panel action**

Modify the action section of `extension/src/sidepanel.html`:

```html
    <section>
      <button id="selectRegion">Select region and analyze</button>
      <label for="question">Follow-up question</label>
      <textarea id="question"></textarea>
      <button id="ask">Ask</button>
    </section>
```

Modify `extension/src/sidepanel.js` inside `main()` after `renderAnalysis(stored.latestAnalysis);`:

```javascript
  document.querySelector("#selectRegion").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.tabs.sendMessage(tab.id, {
      type: "VLA_SELECT_REGION",
      taskType: "auto"
    });
  });
```

- [ ] **Step 4: Run extension tests**

Run:

```powershell
cd extension
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit region selection**

Run:

```powershell
git add extension
git commit -m "feat: add region selection analysis"
```

---

### Task 8: Documentation and Manual Verification

**Files:**
- Create: `docs/deployment.md`
- Create: `docs/extension-install.md`
- Modify: `server/app/main.py`
- Modify: `extension/manifest.json`

- [ ] **Step 1: Add CORS middleware to backend**

Modify `server/app/main.py` inside `create_app()` immediately after `app = FastAPI(...)`:

```python
from fastapi.middleware.cors import CORSMiddleware
```

Then add:

```python
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["chrome-extension://*"],
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )
```

If wildcard Chrome extension origins are rejected by the browser during manual testing, set `allow_origins` to the installed extension origin shown on `chrome://extensions`.

- [ ] **Step 2: Write deployment docs**

Create `docs/deployment.md`:

```markdown
# Backend Deployment

## Local development

```powershell
cd server
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8787
```

Open:

```text
http://127.0.0.1:8787/health
```

## Cloud server

1. Install Python 3.11+.
2. Copy the `server` directory to the server.
3. Create `.env` from `.env.example`.
4. Set `APP_ACCESS_TOKEN` and provider API keys.
5. Run with Uvicorn behind HTTPS reverse proxy.

Example service command:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8787
```

The public HTTPS endpoint should forward to port `8787`.
```

- [ ] **Step 3: Write extension install docs**

Create `docs/extension-install.md`:

```markdown
# Extension Install

1. Open Chrome or Edge.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable developer mode.
4. Click "Load unpacked".
5. Select the `extension` directory.
6. Open the extension options page.
7. Set the backend URL, access token, provider, and model.
8. Open a Bilibili or YouTube tutorial video.
9. Pause the video.
10. Click "Analyze current frame".

The first version stores recent analysis history in browser local storage and does not store screenshots by default.
```

- [ ] **Step 4: Run full automated checks**

Run:

```powershell
cd server
.\.venv\Scripts\python -m pytest -v
cd ..\extension
npm test
```

Expected: all tests PASS.

- [ ] **Step 5: Manual backend check**

Run:

```powershell
cd server
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8787
```

In another shell:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:8787/health'
```

Expected:

```text
ok
--
True
```

- [ ] **Step 6: Manual extension check**

Load `extension/` unpacked in Chrome or Edge. Configure:

```text
Backend URL: http://127.0.0.1:8787
Access Token: test-token
Provider: fake
Model: fake-vision
Task Type: Auto
```

Open a Bilibili video page. Pause the video.

Expected:

- The analyze button appears after about 300 ms.
- Clicking it opens the side panel.
- The side panel displays "Fake analysis".

- [ ] **Step 7: Commit docs and final wiring**

Run:

```powershell
git add server extension docs
git commit -m "docs: add deployment and install guide"
```

---

## Self-Review Checklist

- Spec coverage: backend API, auth, provider selection, OCR gate, Bilibili adapter, YouTube adapter, generic adapter, pause button, screenshot capture, side panel, settings, and local history all have implementation tasks.
- Scope control: the plan builds a personal-use MVP with fake provider and provider capability shells before full provider API wiring.
- Type consistency: request fields use `provider`, `model`, `taskType`, `image`, `selection`, `subtitle`, `videoContext`, and `question` consistently across schemas and extension payloads.
- Verification: every task has a failing-test step, passing-test step, and commit step.

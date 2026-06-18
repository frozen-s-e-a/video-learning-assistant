# Video Learning Assistant Design

## Goal

Build a personal browser-based learning assistant for programming tutorial videos. When the user pauses a video, the extension shows an "analyze current frame" action. Only after the user clicks it, the extension captures the current screen context, sends it to a cloud FastAPI backend, and displays an AI explanation.

The first version is for personal use. It prioritizes Bilibili, supports YouTube, and falls back to generic pages with visible HTML video elements.

## Scope

In scope:

- Chrome and Edge browser extension.
- Site adapters for Bilibili and YouTube.
- Generic video adapter for other sites.
- Pause-triggered analyze button.
- Manual analysis only after user click.
- Current tab screenshot capture.
- Region selection for focused questions.
- Best-effort subtitle extraction.
- FastAPI cloud backend.
- Personal bearer-token authentication.
- Provider selection for GPT, Claude, DeepSeek, and Xiaomi MiMo.
- Vision-first analysis when the selected provider supports images.
- OCR/text fallback when the selected provider does not support images.
- Browser-local recent history.

Out of scope for the first version:

- User accounts.
- Payment or quota system.
- Cloud history sync.
- Realtime audio transcription.
- Long-term screenshot storage.
- Mobile browser support.

## Architecture

The system has three main boundaries:

```text
Video page
  -> Browser extension content script
  -> Extension background and side panel
  -> FastAPI cloud backend
  -> Model provider APIs
```

The extension owns browser interaction:

- Detect page/site type.
- Find the active video element.
- Listen for pause and play events.
- Show or hide the analyze button.
- Capture the current tab.
- Read title, URL, current playback time, and subtitles when available.
- Let the user select a region of the frame.
- Display analysis and follow-up answers.
- Store recent history locally.

The backend owns AI and security:

- Validate the personal access token.
- Validate request size and image payloads.
- Route requests to GPT, Claude, DeepSeek, or MiMo.
- Use image analysis for providers with vision support.
- Use OCR plus text analysis for providers without vision support.
- Return structured analysis responses.

## Extension Design

### Main Modules

```text
extension/
  manifest.json
  src/
    background/
    content/
    sidepanel/
    options/
    adapters/
    services/
    storage/
```

### Page Button

When a supported video is paused for at least 300 ms, the content script shows a compact button near the player:

```text
Analyze current frame
```

The button is hidden while the video is playing. Clicking the button starts capture and analysis. Pausing alone never calls the backend.

The button includes a task selector:

```text
Auto / Code / Error / Concept
```

Default task type is `Auto`.

### Side Panel

The side panel shows:

- Selected provider and model.
- Video title and timestamp.
- Detected frame type.
- Extracted code, error text, or concept keywords.
- AI explanation.
- Suggested follow-up questions.
- Follow-up input.
- Reanalyze action.
- Region-selection action.
- Recent history entry point.

Answer formatting depends on detected task type.

For code:

- What the code does.
- Key syntax.
- Execution flow.
- Common misunderstandings.

For errors:

- Error meaning.
- Most likely cause.
- Debugging steps.
- Fix suggestions.

For concepts:

- What the slide is about.
- Key concepts.
- Concrete examples.
- Relationship to subtitle context.

### Region Selection

When the user chooses region selection, the content script renders a transparent overlay. The user drags a rectangle over code, terminal output, a diagram, or a slide area.

The extension records the rectangle coordinates and sends them with the screenshot. If feasible, the extension crops locally before upload; otherwise the backend crops using the supplied rectangle.

Region analysis is preferred over full-frame analysis because programming videos often contain too much unrelated information.

### Settings Page

The options page contains:

- Backend base URL.
- Personal access token.
- Default provider: GPT, Claude, DeepSeek, or MiMo.
- Default model.
- Default task type.
- Recent history limit.
- Whether to show the pause button automatically.

Recommended defaults:

```text
Provider: GPT
Task type: Auto
History limit: 50
Show pause button: enabled
```

### Local History

Recent history is stored in browser local storage. The first version does not save screenshots by default.

History entry shape:

```json
{
  "id": "uuid",
  "videoTitle": "string",
  "videoUrl": "string",
  "timeSeconds": 1234,
  "provider": "openai",
  "model": "gpt-4o",
  "taskType": "code",
  "question": "string",
  "answerSummary": "string",
  "createdAt": "ISO-8601"
}
```

The extension keeps only the newest configured number of entries.

## Site Adapter Design

All adapters implement:

```text
VideoSiteAdapter
  detect()
  getVideoElement()
  getVideoContext()
  getCurrentSubtitle()
  onPause(callback)
  onPlay(callback)
```

### BilibiliAdapter

Bilibili is the top priority.

Responsibilities:

- Detect `bilibili.com/video/*` and common Bilibili video pages.
- Find the main video element.
- Listen for pause and play.
- Read video title.
- Read current playback time.
- Try to read visible subtitle DOM.
- Try to read subtitle data if available in page state or subtitle requests.

Subtitle extraction is best-effort. If it fails, analysis still proceeds with screenshot, title, URL, and timestamp.

### YouTubeAdapter

YouTube is the second priority.

Responsibilities:

- Detect `youtube.com/watch`.
- Find the main video element.
- Listen for pause and play.
- Read video title and channel name when available.
- Read current playback time.
- Try to read captions from visible caption DOM or available caption tracks.
- Re-detect after YouTube single-page navigation changes.

YouTube DOM changes often, so caption failure must not break the main analysis flow.

### GenericVideoAdapter

Fallback adapter for other sites.

Responsibilities:

- Find the largest visible HTML `video` element.
- Listen for pause and play.
- Use `document.title` as video title.
- Use `location.href` as URL.
- Read `video.currentTime` when available.

Generic mode does not guarantee subtitles.

## Backend API

### Authentication

All API endpoints except `/health` require:

```text
Authorization: Bearer <personal-token>
```

The token is configured through the backend environment variable:

```text
APP_ACCESS_TOKEN=...
```

### Endpoints

```text
GET  /health
GET  /api/models
POST /api/analyze-frame
POST /api/follow-up
```

### `GET /health`

Used by the extension settings page to test connectivity.

Response:

```json
{
  "ok": true
}
```

### `GET /api/models`

Returns configured providers and model capabilities.

Example:

```json
{
  "providers": [
    {
      "id": "openai",
      "label": "GPT",
      "models": ["gpt-4o"],
      "vision": true
    },
    {
      "id": "anthropic",
      "label": "Claude",
      "models": ["claude-sonnet-4"],
      "vision": true
    },
    {
      "id": "deepseek",
      "label": "DeepSeek",
      "models": ["deepseek-chat", "deepseek-reasoner"],
      "vision": false
    },
    {
      "id": "mimo",
      "label": "MiMo",
      "models": ["mimo-v2.5", "mimo-v2.5-pro"],
      "vision": true
    }
  ]
}
```

Only providers with configured API keys should be returned as enabled.

### `POST /api/analyze-frame`

Analyzes the current paused frame.

Request:

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "taskType": "auto",
  "image": {
    "mimeType": "image/jpeg",
    "data": "base64..."
  },
  "selection": {
    "x": 100,
    "y": 120,
    "width": 600,
    "height": 300
  },
  "subtitle": {
    "current": "current subtitle",
    "nearby": ["previous", "current", "next"]
  },
  "videoContext": {
    "site": "bilibili",
    "title": "video title",
    "url": "https://example.com",
    "timeSeconds": 1234
  },
  "question": "What does this code mean?"
}
```

Response:

```json
{
  "analysisId": "uuid",
  "detectedType": "code",
  "mode": "vision",
  "extracted": {
    "code": "string",
    "error": "string",
    "keywords": ["string"]
  },
  "answer": {
    "title": "string",
    "sections": [
      {
        "heading": "string",
        "content": "string"
      }
    ]
  },
  "suggestedQuestions": ["string"]
}
```

### `POST /api/follow-up`

Answers follow-up questions.

Request:

```json
{
  "analysisId": "uuid",
  "provider": "openai",
  "model": "gpt-4o",
  "message": "Why does this error happen?",
  "context": {
    "previousQuestion": "string",
    "previousAnswer": "string",
    "extracted": {}
  }
}
```

The first version may keep the context client-side and send it back with each follow-up. This avoids server-side persistent conversation storage.

## Model Provider Design

The backend exposes one internal provider interface:

```text
BaseProvider
  analyze_with_image(request)
  analyze_with_text(request)
```

Provider implementations:

```text
OpenAIProvider
AnthropicProvider
DeepSeekProvider
MimoProvider
```

Routing rules:

- GPT: use vision when configured with a vision-capable model.
- Claude: use vision when configured with a vision-capable model.
- DeepSeek: use OCR plus text analysis unless configured model supports vision.
- Xiaomi MiMo: use vision when configured with a multimodal model; otherwise use OCR plus text analysis.

The provider layer hides provider-specific API schemas from the extension.

## OCR Design

The OCR service is a backend boundary:

```text
OcrService.extract_text(image, selection)
```

Preferred OCR engines:

- PaddleOCR.
- EasyOCR.

If OCR is not configured and the selected model cannot analyze images, the backend returns:

```json
{
  "error": {
    "code": "OCR_NOT_CONFIGURED",
    "message": "The selected provider requires OCR, but OCR is not configured."
  }
}
```

This keeps the first version usable with GPT and Claude even if OCR installation is delayed.

## Error Handling

Backend errors use a consistent shape:

```json
{
  "error": {
    "code": "MODEL_NOT_CONFIGURED",
    "message": "Selected provider is not configured"
  }
}
```

Primary error codes:

- `UNAUTHORIZED`
- `BACKEND_UNAVAILABLE`
- `MODEL_NOT_CONFIGURED`
- `MODEL_TIMEOUT`
- `IMAGE_TOO_LARGE`
- `OCR_NOT_CONFIGURED`
- `INVALID_REQUEST`

The extension maps these to user-friendly messages.

## Performance

Extension:

- Do not analyze continuously.
- Show the pause button only after a short pause debounce.
- Capture only after user click.
- Compress screenshots to JPEG.
- Limit screenshot dimensions, with a target max width of 1600 px.
- Prefer cropped region uploads when region selection is active.
- Prevent duplicate concurrent analysis requests.

Backend:

- Limit request body size.
- Validate image MIME type.
- Resize oversized images before provider calls.
- Set model call timeouts.
- Add basic per-token rate limiting.
- Avoid logging full base64 images.

## Security and Privacy

Security:

- Cloud backend must be served over HTTPS.
- All API requests use a bearer token.
- Provider API keys stay only on the server.
- Extension stores only backend URL, personal token, model preferences, and local history.
- CORS allows the extension origin and required development origins only.

Privacy:

- Backend does not persist screenshots by default.
- Browser local history stores text summaries and video context.
- Screenshot saving is not enabled in the first version.
- User can clear local history.

Backend environment variables:

```text
APP_ACCESS_TOKEN=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
DEEPSEEK_API_KEY=...
MIMO_API_KEY=...
```

## Testing Strategy

Extension tests:

- Bilibili pause shows analyze button.
- Bilibili play hides analyze button.
- Bilibili capture succeeds.
- Bilibili subtitle absence does not block analysis.
- YouTube pause and play detection works.
- YouTube navigation re-detection works.
- Generic video fallback works on a simple HTML page.
- Settings persist backend URL, token, provider, and model.
- History keeps only the configured newest entries.

Backend tests:

- `/health` returns ok.
- Missing token returns 401.
- Wrong token returns 401.
- `/api/models` returns only configured providers as enabled.
- `/api/analyze-frame` rejects oversized images.
- Unconfigured provider returns `MODEL_NOT_CONFIGURED`.
- Non-vision provider without OCR returns `OCR_NOT_CONFIGURED`.
- Provider routing chooses image or text path correctly.
- Model timeout returns `MODEL_TIMEOUT`.

Manual acceptance:

- On Bilibili, pause a programming video, click analyze, and get a code explanation.
- On Bilibili, select a terminal error region and get debugging guidance.
- On YouTube, pause a tutorial, click analyze, and get an explanation even if captions are unavailable.
- On a generic video page, pause and analyze using screenshot-only context.

## Delivery Structure

```text
extension/
  Browser extension source

server/
  FastAPI backend source

docs/
  Setup, deployment, and usage docs
```

## Open Implementation Notes

- Exact Bilibili subtitle extraction should be discovered during implementation because Bilibili page structures and subtitle APIs vary by video type.
- Exact YouTube caption extraction should be treated as best-effort because YouTube DOM and player internals change frequently.
- Xiaomi MiMo API integration should be implemented against the API documentation available to the user at implementation time.
- The first implementation should keep provider interfaces stable even if some providers initially return `MODEL_NOT_CONFIGURED` until their API keys and request adapters are configured.

# Backend Deployment

## Local development

```powershell
cd server
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8787
```

Conda alternative:

```powershell
conda create -n video-learning-assistant python=3.11
conda activate video-learning-assistant
python -m pip install -r server\requirements.txt
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

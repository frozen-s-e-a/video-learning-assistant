# Backend Deployment

## Local development

### From repository root, with venv

```powershell
cd server
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8787
```

### From repository root, with Conda

```powershell
conda create -n video-learning-assistant python=3.11
conda activate video-learning-assistant
python -m pip install -r server\requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8787 --app-dir server
```

Open:

```text
http://127.0.0.1:8787/health
```

## Cloud server

1. Install Python 3.11+.
2. Copy the `server` directory to the server.
3. Change into the copied `server` directory.
4. Create `.env` from `.env.example`.
5. Set `APP_ACCESS_TOKEN` and provider API keys.
6. Run with Uvicorn behind HTTPS reverse proxy.

Example setup and service command from the copied `server` directory:

```bash
cp .env.example .env
python -m uvicorn app.main:app --host 127.0.0.1 --port 8787
```

If your process manager must start outside the `server` directory, set the app directory explicitly:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8787 --app-dir server
```

The public HTTPS endpoint should forward to port `8787`.

from fastapi.testclient import TestClient


PROVIDER_ENV_KEYS = (
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "DEEPSEEK_API_KEY",
    "MIMO_API_KEY",
)


def auth_headers():
    return {"Authorization": "Bearer test-token"}


def make_client(monkeypatch, **provider_keys):
    monkeypatch.setenv("APP_ACCESS_TOKEN", "test-token")
    for key in PROVIDER_ENV_KEYS:
        monkeypatch.setenv(key, provider_keys.get(key, ""))

    from app.config import get_settings
    from app.main import create_app

    get_settings.cache_clear()
    return TestClient(create_app())


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


def test_models_includes_configured_openai(monkeypatch):
    with make_client(monkeypatch, OPENAI_API_KEY="openai-key") as client:
        response = client.get("/api/models", headers=auth_headers())

    assert response.status_code == 200
    provider_ids = [provider["id"] for provider in response.json()["providers"]]
    assert "openai" in provider_ids
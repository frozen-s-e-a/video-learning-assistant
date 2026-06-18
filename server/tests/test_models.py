from fastapi.testclient import TestClient


def auth_headers():
    return {"Authorization": "Bearer test-token"}


def make_client(monkeypatch):
    monkeypatch.setenv("APP_ACCESS_TOKEN", "test-token")
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
    monkeypatch.setenv("OPENAI_API_KEY", "openai-key")

    with make_client(monkeypatch) as client:
        response = client.get("/api/models", headers=auth_headers())

    assert response.status_code == 200
    provider_ids = [provider["id"] for provider in response.json()["providers"]]
    assert "openai" in provider_ids

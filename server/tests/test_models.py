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

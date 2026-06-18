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


def test_models_accepts_valid_token(client):
    response = client.get(
        "/api/models",
        headers={"Authorization": "Bearer test-token"},
    )

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

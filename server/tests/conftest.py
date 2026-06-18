import os

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("APP_ACCESS_TOKEN", "test-token")
    from app.main import create_app

    return TestClient(create_app())

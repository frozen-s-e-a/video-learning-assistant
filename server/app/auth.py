import secrets

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

    if not secrets.compare_digest(credentials.credentials, settings.app_access_token):
        raise api_error(401, "UNAUTHORIZED", "Missing or invalid authorization token")

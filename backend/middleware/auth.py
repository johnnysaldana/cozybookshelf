from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

def get_api_keys():
    """Get valid API keys from environment variables"""
    keys = []

    web_app_key = os.getenv("WEB_APP_API_KEY")
    personal_key = os.getenv("PERSONAL_API_KEY")

    if web_app_key:
        keys.append(web_app_key)
    if personal_key:
        keys.append(personal_key)

    return keys

def verify_api_key(api_key: Optional[str] = Security(API_KEY_HEADER)) -> str:
    """
    Verify the API key from the request header.
    Returns the API key if valid, raises HTTPException otherwise.
    """
    # Check if API key authentication is enabled
    if os.getenv("API_KEY_AUTH_ENABLED", "false").lower() != "true":
        return "auth_disabled"

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key missing",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    valid_keys = get_api_keys()

    if not valid_keys:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API keys not configured",
        )

    if api_key not in valid_keys:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key",
        )

    return api_key

def get_optional_api_key(api_key: Optional[str] = Security(API_KEY_HEADER)) -> Optional[str]:
    """
    Optional API key verification for endpoints that should work with or without authentication.
    Returns the API key if provided and valid, None if not provided, raises HTTPException if invalid.
    """
    if os.getenv("API_KEY_AUTH_ENABLED", "false").lower() != "true":
        return None

    if not api_key:
        return None

    valid_keys = get_api_keys()

    if api_key not in valid_keys:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key",
        )

    return api_key
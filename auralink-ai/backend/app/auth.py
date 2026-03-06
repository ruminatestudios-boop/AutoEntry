"""
Clerk JWT verification for protected API routes.
Uses JWKS from Clerk to verify Bearer tokens.
"""
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_settings

_security = HTTPBearer(auto_error=False)
_jwks_client: Optional[jwt.PyJWKClient] = None


def _get_jwks_client() -> jwt.PyJWKClient:
    """Get or create PyJWKClient for Clerk JWKS."""
    global _jwks_client
    if _jwks_client is not None:
        return _jwks_client
    settings = get_settings()
    jwks_url = getattr(settings, "clerk_jwks_url", None) or "https://api.clerk.com/v1/jwks"
    _jwks_client = jwt.PyJWKClient(jwks_url)
    return _jwks_client


async def verify_clerk(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
) -> dict:
    """
    Verify Clerk JWT from Authorization: Bearer <token>.
    Returns decoded claims or raises 401.
    When Clerk is not configured, allows all requests (dev mode).
    """
    settings = get_settings()
    if not settings.clerk_secret_key:
        return {"sub": "dev", "sid": "dev"}
    token = credentials.credentials if credentials else None
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid authorization")
    try:
        jwks = _get_jwks_client()
        header = jwt.get_unverified_header(token)
        signing_key = jwks.get_signing_key_from_jwt(token)
        decoded = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_exp": True, "verify_nbf": True},
        )
        return decoded
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


async def optional_verify_clerk(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
) -> Optional[dict]:
    """
    Optional auth: when token present, verify (raise 401 if invalid); when absent, return None.
    Use for routes that work for both anonymous and authenticated (e.g. landing save-as-draft).
    """
    settings = get_settings()
    if not settings.clerk_secret_key:
        return {"sub": "dev", "sid": "dev"}
    token = credentials.credentials if credentials else None
    if not token:
        return None
    try:
        jwks = _get_jwks_client()
        signing_key = jwks.get_signing_key_from_jwt(token)
        decoded = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_exp": True, "verify_nbf": True},
        )
        return decoded
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

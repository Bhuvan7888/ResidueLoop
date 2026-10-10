from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from dataclasses import dataclass
from typing import Any
from app.core.config import get_settings

security = HTTPBearer()


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    phone: str

def verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict[str, Any]:
    settings = get_settings()
    try:
        # Pinned algorithm, check aud and exp
        payload = jwt.decode(
            credentials.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user_id(payload: dict[str, Any] = Depends(verify_jwt)) -> str:
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    return str(user_id)


def get_current_user(payload: dict[str, Any] = Depends(verify_jwt)) -> AuthenticatedUser:
    user_id = payload.get("sub")
    phone = payload.get("phone")
    if not isinstance(user_id, str) or not isinstance(phone, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    return AuthenticatedUser(id=user_id, phone=phone)

def get_supabase_client() -> Any:
    from supabase import create_client
    settings = get_settings()
    # Pinned to service role to check profiles securely bypassing RLS if needed,
    # or anon key. Service role is safer here to verify server-side.
    return create_client(settings.supabase_url, settings.supabase_service_role_key)

def require_role(allowed_roles: list[str]) -> Any:
    def role_checker(user_id: str = Depends(get_current_user_id)) -> str:
        try:
            client = get_supabase_client()
            # MOCK: We mock the response if missing keys, but otherwise run it
            response = client.table("profiles").select("role").eq("id", user_id).single().execute()
            user_role = response.data.get("role")
            if user_role not in allowed_roles:
                raise HTTPException(status_code=403, detail="Forbidden: Insufficient role")
            return user_id
        except Exception:
            # If the user doesn't exist or DB errors, block them
            raise HTTPException(status_code=403, detail="Forbidden: Insufficient role")
    return role_checker

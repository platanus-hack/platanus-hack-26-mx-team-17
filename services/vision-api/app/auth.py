"""Validación del JWT de Supabase.

El cliente envía `Authorization: Bearer <jwt>`. Validamos firma (HS256) y
expiración, devolviendo el `sub` (user id).

Probamos dos formatos del secreto porque Supabase cloud almacena el secret
como string base64 pero gotrue puede usarlo raw (UTF-8) o decodificado.
NUNCA registramos el token ni el secreto.
"""

from __future__ import annotations

import base64
from dataclasses import dataclass

import jwt
from fastapi import Request

from .config import Settings
from .errors import unauthenticated


@dataclass
class AuthenticatedUser:
    id: str


def _extract_bearer(request: Request) -> str:
    header = request.headers.get("Authorization", "")
    prefix = "Bearer "
    if not header.startswith(prefix):
        raise unauthenticated("Falta el header Authorization Bearer")
    token = header[len(prefix):].strip()
    if not token:
        raise unauthenticated("Token vacio")
    return token


def _candidate_keys(secret_str: str) -> list[bytes]:
    """Devuelve las representaciones posibles del secreto para probar."""
    secret_str = secret_str.strip()  # elimina espacios/newlines accidentales
    candidates: list[bytes] = [secret_str.encode()]
    # Supabase cloud a veces almacena el secreto como base64 del key material real.
    for padding in ("", "=", "=="):
        try:
            decoded = base64.b64decode(secret_str + padding)
            if decoded not in candidates:
                candidates.append(decoded)
            break
        except Exception:
            continue
    return candidates


def _verify_token(token: str, secret_str: str) -> dict:
    """Verifica el JWT probando raw UTF-8 y base64-decoded del secreto."""
    last_exc: Exception | None = None
    for key_bytes in _candidate_keys(secret_str):
        try:
            return jwt.decode(
                token,
                key_bytes,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except jwt.ExpiredSignatureError as exc:
            raise unauthenticated("JWT expirado — cierra sesión y vuelve a entrar") from exc
        except jwt.InvalidAudienceError as exc:
            raise unauthenticated("JWT audience incorrecto (esperado: authenticated)") from exc
        except jwt.InvalidSignatureError as exc:
            last_exc = exc
            continue
        except jwt.PyJWTError as exc:
            last_exc = exc
            continue

    raise unauthenticated(
        "JWT firma incorrecta — VISION_SUPABASE_JWT_SECRET no coincide con Supabase"
    ) from last_exc


def authenticate(request: Request, settings: Settings) -> AuthenticatedUser:
    """Valida el JWT del request y devuelve el usuario, o lanza 401."""
    token = _extract_bearer(request)

    if settings.auth_disabled:
        try:
            claims = jwt.decode(token, options={"verify_signature": False})
        except jwt.PyJWTError as exc:
            raise unauthenticated("Token no decodificable") from exc
    else:
        if not settings.supabase_jwt_secret:
            raise unauthenticated("Servicio sin secreto JWT configurado")
        claims = _verify_token(token, settings.supabase_jwt_secret)

    user_id = claims.get("sub")
    if not user_id:
        raise unauthenticated("JWT sin 'sub'")
    return AuthenticatedUser(id=str(user_id))

"""Validación del JWT de Supabase.

El cliente envía `Authorization: Bearer <jwt>`. Validamos firma (HS256 con el
JWT secret de Supabase) y expiración, y devolvemos el `sub` (user id).

NUNCA registramos el token ni el header completo. El cliente jamás envía la
service role key; eso es exclusivo del lado servidor.
"""

from __future__ import annotations

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


def authenticate(request: Request, settings: Settings) -> AuthenticatedUser:
    """Valida el JWT del request y devuelve el usuario, o lanza 401."""
    token = _extract_bearer(request)

    # Modo desarrollo/test: sin verificación de firma (sólo decodifica claims).
    if settings.auth_disabled:
        try:
            claims = jwt.decode(token, options={"verify_signature": False})
        except jwt.PyJWTError as exc:
            raise unauthenticated("Token no decodificable") from exc
    else:
        if not settings.supabase_jwt_secret:
            # Sin secreto no podemos verificar: tratamos como no autenticado
            # (no abrimos un agujero de seguridad silencioso).
            raise unauthenticated("Servicio sin secreto JWT configurado")
        try:
            claims = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except jwt.PyJWTError as exc:
            raise unauthenticated("JWT invalido o expirado") from exc

    user_id = claims.get("sub")
    if not user_id:
        raise unauthenticated("JWT sin 'sub'")
    return AuthenticatedUser(id=str(user_id))

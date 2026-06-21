"""Validación del JWT de Supabase usando JWKS (ES256 / algoritmo asimétrico).

Supabase emite tokens firmados con ECDSA P-256 (ES256). La clave pública se
obtiene del endpoint JWKS del proyecto y se identifica por el campo `kid` del
header JWT. El secreto Legacy HS256 no se usa para autenticar usuarios.

El caché de claves se rellena en la primera petición y se refresca si se
encuentra un `kid` desconocido (rotación de llaves).
"""

from __future__ import annotations

import json
import logging
import threading
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
from jwt.algorithms import ECAlgorithm
from fastapi import Request

from .config import Settings
from .errors import unauthenticated

logger = logging.getLogger(__name__)

# Caché en memoria: kid → clave pública (objeto de cryptography).
_jwks_cache: dict[str, Any] = {}
_jwks_lock = threading.Lock()


def _fetch_jwks(supabase_url: str) -> dict[str, Any]:
    """Descarga JWKS y devuelve un mapa kid → clave pública."""
    url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    resp = httpx.get(url, timeout=10.0)
    resp.raise_for_status()
    keys: dict[str, Any] = {}
    for key_data in resp.json().get("keys", []):
        kid = key_data.get("kid")
        if not kid:
            continue
        kty = key_data.get("kty", "")
        try:
            if kty == "EC":
                keys[kid] = ECAlgorithm.from_jwk(json.dumps(key_data))
        except Exception as exc:
            logger.warning("JWKS: clave %s ignorada — %s", kid, exc)
    return keys


def _get_public_key(kid: str, supabase_url: str) -> Any:
    """Devuelve la clave pública para el kid dado, cargando JWKS si es necesario."""
    global _jwks_cache

    # Ruta rápida: ya está en caché.
    if kid in _jwks_cache:
        return _jwks_cache[kid]

    # Primera carga o rotación de llaves: actualizar caché bajo lock.
    with _jwks_lock:
        if kid not in _jwks_cache:
            try:
                _jwks_cache = _fetch_jwks(supabase_url)
            except Exception as exc:
                raise unauthenticated(f"Error al obtener JWKS de Supabase: {exc}") from exc

    key = _jwks_cache.get(kid)
    if key is None:
        raise unauthenticated(
            f"kid '{kid}' no encontrado en JWKS — actualiza VISION_SUPABASE_URL o contacta Supabase"
        )
    return key


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

    if settings.auth_disabled:
        try:
            claims = jwt.decode(token, options={"verify_signature": False})
        except jwt.PyJWTError as exc:
            raise unauthenticated("Token no decodificable") from exc
    else:
        if not settings.supabase_url:
            raise unauthenticated("VISION_SUPABASE_URL no configurado en Railway")

        try:
            header = jwt.get_unverified_header(token)
        except jwt.PyJWTError as exc:
            raise unauthenticated("JWT malformado") from exc

        kid = header.get("kid")
        alg = header.get("alg", "")

        if not kid:
            raise unauthenticated("JWT sin 'kid' — no se puede seleccionar clave JWKS")

        supported = ("ES256", "ES384", "ES512", "RS256", "RS384", "RS512")
        if alg not in supported:
            raise unauthenticated(f"Algoritmo JWT no soportado: '{alg}'")

        public_key = _get_public_key(kid, settings.supabase_url)

        try:
            claims = jwt.decode(
                token,
                public_key,
                algorithms=[alg],
                audience="authenticated",
            )
        except jwt.ExpiredSignatureError as exc:
            raise unauthenticated("JWT expirado — cierra sesión y vuelve a entrar") from exc
        except jwt.InvalidAudienceError as exc:
            raise unauthenticated("JWT audience incorrecto (esperado: authenticated)") from exc
        except jwt.PyJWTError as exc:
            raise unauthenticated(f"JWT inválido: {exc}") from exc

    user_id = claims.get("sub")
    if not user_id:
        raise unauthenticated("JWT sin 'sub'")
    return AuthenticatedUser(id=str(user_id))

"""Proveedores de dependencias (inyección para FastAPI y tests).

Los tests pueden sobrescribir `get_repository` y `require_user` vía
`app.dependency_overrides`.
"""

from __future__ import annotations

from functools import lru_cache

from fastapi import Depends, Request

from .auth import AuthenticatedUser, authenticate
from .config import Settings, get_settings
from .repository import FakeRepository, Repository, SupabaseRepository


@lru_cache
def _build_repository() -> Repository:
    settings = get_settings()
    if settings.repo == "supabase":
        return SupabaseRepository(
            settings.supabase_url,
            settings.supabase_service_role_key,
            bucket=settings.storage_bucket,
            candidate_limit=settings.candidate_limit,
            timeout_s=settings.supabase_http_timeout_s,
        )
    return FakeRepository()


def get_repository() -> Repository:
    return _build_repository()


def require_user(
    request: Request, settings: Settings = Depends(get_settings)
) -> AuthenticatedUser:
    return authenticate(request, settings)

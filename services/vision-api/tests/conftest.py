"""Fixtures compartidas: cliente de test con repo fake y auth deshabilitada.

El modelo DINOv2 se carga una vez (al entrar el TestClient) y se reutiliza.
"""

from __future__ import annotations

import io
from datetime import datetime, timezone

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.auth import AuthenticatedUser
from app.config import get_settings
from app.deps import get_repository, require_user
from app.main import app
from app.repository import FakeRepository, ReportRow

USER_ID = "11111111-1111-1111-1111-111111111111"


def _png_bytes_from_array(arr: np.ndarray) -> bytes:
    img = Image.fromarray(arr.astype("uint8"), mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _noise_image(seed: int, size: int = 224) -> bytes:
    rng = np.random.default_rng(seed)
    arr = rng.integers(0, 256, size=(size, size, 3))
    return _png_bytes_from_array(arr)


def _report(report_id: str, *, lat: float = 0.0, lng: float = 0.0, species: str = "perro") -> ReportRow:
    now = datetime(2026, 6, 20, tzinfo=timezone.utc)
    return ReportRow(
        id=report_id,
        author_id=USER_ID,
        type="lost",
        status="open",
        lat=lat,
        lng=lng,
        location_captured_at=now,
        created_at=now,
        species=species,
        attributes={"color": "negro"},
    )


@pytest.fixture(scope="session")
def seeded_repo() -> FakeRepository:
    repo = FakeRepository()

    # Imagen base; el "target" comparte la misma imagen (debe ser el más compatible).
    base = _noise_image(seed=42)
    repo.add_report(_report("source"), image_bytes=base)
    repo.add_report(_report("target"), image_bytes=base)

    # Distractores con imágenes distintas.
    for i in range(4):
        repo.add_report(_report(f"distractor-{i}"), image_bytes=_noise_image(seed=100 + i))

    return repo


@pytest.fixture(scope="session")
def client(seeded_repo: FakeRepository):
    settings = get_settings()
    settings.auth_disabled = True  # no verificamos firma en test

    app.dependency_overrides[get_repository] = lambda: seeded_repo
    app.dependency_overrides[require_user] = lambda: AuthenticatedUser(id=USER_ID)

    with TestClient(app) as c:  # entra al lifespan -> carga el modelo una vez
        yield c

    app.dependency_overrides.clear()

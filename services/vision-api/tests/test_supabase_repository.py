"""Pruebas de SupabaseRepository con httpx.MockTransport (sin servidor vivo).

Validan la construcción de requests (PostgREST + Storage) y el parseo de
respuestas, sin necesidad de un Supabase real ni del modelo.
"""

from __future__ import annotations

import json

import httpx
import pytest

from app.repository import MatchRow, SupabaseRepository

BASE = "http://sb.local"


def _make_repo(handler) -> SupabaseRepository:
    transport = httpx.MockTransport(handler)
    client = httpx.Client(transport=transport, headers={"apikey": "k"})
    return SupabaseRepository(BASE, "service-key", bucket="report-images", client=client)


def test_get_report_parses_row():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/rest/v1/reports"
        assert request.url.params["id"] == "eq.r1"
        return httpx.Response(
            200,
            json=[
                {
                    "id": "r1",
                    "author_id": "u1",
                    "type": "lost",
                    "status": "open",
                    "species": "perro",
                    "attributes": {"color": "negro"},
                    "lat": 19.4,
                    "lng": -99.1,
                    "location_captured_at": "2026-06-20T12:00:00+00:00",
                    "created_at": "2026-06-20T12:00:00Z",
                }
            ],
        )

    repo = _make_repo(handler)
    report = repo.get_report("r1")
    assert report is not None
    assert report.author_id == "u1"
    assert report.species == "perro"
    assert report.attributes == {"color": "negro"}


def test_get_report_missing_returns_none():
    repo = _make_repo(lambda req: httpx.Response(200, json=[]))
    assert repo.get_report("nope") is None


def test_primary_image_strips_bucket_prefix_and_downloads():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/rest/v1/report_images":
            return httpx.Response(200, json=[{"storage_path": "report-images/r1/photo.jpg"}])
        if request.url.path.startswith("/storage/v1/object/"):
            captured["object_path"] = request.url.path
            return httpx.Response(200, content=b"JPEGBYTES")
        raise AssertionError(f"ruta inesperada: {request.url.path}")

    repo = _make_repo(handler)
    data = repo.get_primary_image_bytes("r1")
    assert data == b"JPEGBYTES"
    # El prefijo del bucket se elimina; objeto final = report-images/r1/photo.jpg
    assert captured["object_path"] == "/storage/v1/object/report-images/r1/photo.jpg"


def test_upsert_matches_payload_and_conflict():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/rest/v1/matches"
        assert request.url.params["on_conflict"] == "source_report_id,candidate_report_id"
        assert request.headers["Prefer"] == "resolution=merge-duplicates"
        captured["body"] = json.loads(request.content)
        return httpx.Response(201, json=[])

    repo = _make_repo(handler)
    repo.upsert_matches(
        "r1",
        [
            MatchRow(
                candidate_report_id="c1",
                rank=1,
                compatibility=87.4,
                visual_score=90.1,
                geo_score=80.0,
                attribute_score=85.0,
                temporal_score=70.0,
            )
        ],
    )
    row = captured["body"][0]
    assert row["source_report_id"] == "r1"
    assert row["candidate_report_id"] == "c1"
    assert row["rank"] == 1
    # `status` se omite para no pisar el estado fijado por el autor.
    assert "status" not in row


def test_constructor_requires_credentials():
    with pytest.raises(ValueError):
        SupabaseRepository("", "")

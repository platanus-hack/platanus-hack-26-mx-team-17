"""Pruebas del endpoint POST /v1/reports/{id}/process contra el repo fake."""

from __future__ import annotations


def test_process_returns_top3_with_target_first(client, seeded_repo):
    resp = client.post("/v1/reports/source/process", json={"force": True})
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert body["report_id"] == "source"
    assert body["model"] == "facebook/dinov2-small"

    matches = body["matches"]
    # 5 candidatos elegibles -> top 3.
    assert len(matches) == 3
    assert [m["rank"] for m in matches] == [1, 2, 3]

    # El "target" comparte imagen con el source -> debe ser el más compatible.
    assert matches[0]["candidate_report_id"] == "target"
    ids = [m["candidate_report_id"] for m in matches]
    assert "target" in ids

    # Compatibilidad en rango 0–100 y ordenada desc.
    comps = [m["compatibility"] for m in matches]
    assert all(0.0 <= c <= 100.0 for c in comps)
    assert comps == sorted(comps, reverse=True)

    # Componentes presentes.
    assert set(matches[0]["components"]) == {"visual", "geo", "attributes", "temporal"}


def test_process_is_idempotent(client, seeded_repo):
    # Primer cómputo (force) deja matches persistidos.
    client.post("/v1/reports/source/process", json={"force": True})
    before = len(seeded_repo.get_recent_matches("source"))

    # force=false debe devolver lo existente sin duplicar.
    resp = client.post("/v1/reports/source/process", json={"force": False})
    assert resp.status_code == 200
    after = len(seeded_repo.get_recent_matches("source"))
    assert before == after == 3


def test_process_report_not_found(client):
    resp = client.post("/v1/reports/nope/process", json={"force": True})
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "report_not_found"


def test_process_no_primary_image(client, seeded_repo):
    from datetime import datetime, timezone

    from app.repository import ReportRow

    now = datetime(2026, 6, 20, tzinfo=timezone.utc)
    seeded_repo.add_report(
        ReportRow(
            id="no-image",
            author_id="11111111-1111-1111-1111-111111111111",
            type="lost",
            status="open",
            lat=0.0,
            lng=0.0,
            location_captured_at=now,
            created_at=now,
            species="perro",
            attributes={},
        ),
        image_bytes=None,
    )
    resp = client.post("/v1/reports/no-image/process", json={"force": True})
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "no_primary_image"

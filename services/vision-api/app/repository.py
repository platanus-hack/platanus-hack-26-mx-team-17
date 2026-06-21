"""Acceso a datos de la Vision API.

Define una interfaz (`Repository`) y una implementación en memoria
(`FakeRepository`) para desarrollo y pruebas **sin Supabase**.

La implementación real contra Supabase (descarga de Storage, lectura de
`reports`/`report_images`, upsert de `matches`, insert de `report_updates` vía
service role) se añade cuando Rol 2 provea credenciales y esquema. Ver
`SupabaseRepository` (stub) más abajo.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Protocol

import httpx

logger = logging.getLogger("vision-api.repository")

# Columnas de reports que la Vision API necesita leer.
_REPORT_SELECT = (
    "id,author_id,type,status,species,attributes,"
    "lat,lng,location_captured_at,created_at"
)


def _parse_ts(value: str | None) -> datetime:
    """Parsea un timestamptz de PostgREST a datetime aware (UTC si falta tz)."""
    if not value:
        return datetime.now(timezone.utc)
    text = value.replace("Z", "+00:00")
    dt = datetime.fromisoformat(text)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _row_to_report(row: dict) -> "ReportRow":
    return ReportRow(
        id=str(row["id"]),
        author_id=str(row["author_id"]),
        type=row["type"],
        status=row["status"],
        lat=float(row["lat"]),
        lng=float(row["lng"]),
        location_captured_at=_parse_ts(row.get("location_captured_at")),
        created_at=_parse_ts(row.get("created_at")),
        species=row.get("species"),
        attributes=row.get("attributes") or {},
    )


@dataclass
class ReportRow:
    """Subconjunto de columnas de `reports` que la Vision API necesita."""

    id: str
    author_id: str
    type: str
    status: str
    lat: float
    lng: float
    location_captured_at: datetime
    created_at: datetime
    species: str | None = None
    attributes: dict = field(default_factory=dict)


@dataclass
class MatchRow:
    """Fila a persistir/devolver en `matches`."""

    candidate_report_id: str
    rank: int
    compatibility: float
    visual_score: float
    geo_score: float
    attribute_score: float
    temporal_score: float


class Repository(Protocol):
    """Contrato de acceso a datos para el procesamiento de visión."""

    def get_report(self, report_id: str) -> ReportRow | None: ...

    def user_can_process(self, user_id: str, report: ReportRow) -> bool: ...

    def get_primary_image_bytes(self, report_id: str) -> bytes | None:
        """Bytes de la imagen primaria, o None si no hay imagen primaria."""
        ...

    def list_candidate_reports(self, source: ReportRow) -> list[ReportRow]:
        """Candidatos elegibles (con imagen primaria, distintos del source)."""
        ...

    def get_recent_matches(self, source_report_id: str) -> list[MatchRow]:
        """Matches ya calculados (para idempotencia con force=false)."""
        ...

    def upsert_matches(self, source_report_id: str, matches: list[MatchRow]) -> None:
        """Upsert idempotente por (source_report_id, candidate_report_id)."""
        ...

    def insert_report_update(self, report_id: str, kind: str, metadata: dict) -> None:
        ...


class FakeRepository:
    """Repositorio en memoria. Útil para desarrollo y pruebas deterministas."""

    def __init__(self) -> None:
        self._reports: dict[str, ReportRow] = {}
        self._images: dict[str, bytes] = {}
        self._matches: dict[str, list[MatchRow]] = {}
        self._updates: list[dict] = []

    # --- helpers de fixtures (no forman parte de la interfaz) ---
    def add_report(self, report: ReportRow, image_bytes: bytes | None = None) -> None:
        self._reports[report.id] = report
        if image_bytes is not None:
            self._images[report.id] = image_bytes

    @property
    def updates(self) -> list[dict]:
        return self._updates

    # --- interfaz ---
    def get_report(self, report_id: str) -> ReportRow | None:
        return self._reports.get(report_id)

    def user_can_process(self, user_id: str, report: ReportRow) -> bool:
        # MVP: el autor del reporte puede procesarlo.
        return report.author_id == user_id

    def get_primary_image_bytes(self, report_id: str) -> bytes | None:
        return self._images.get(report_id)

    def list_candidate_reports(self, source: ReportRow) -> list[ReportRow]:
        return [
            r
            for r in self._reports.values()
            if r.id != source.id and r.id in self._images
        ]

    def get_recent_matches(self, source_report_id: str) -> list[MatchRow]:
        return list(self._matches.get(source_report_id, []))

    def upsert_matches(self, source_report_id: str, matches: list[MatchRow]) -> None:
        self._matches[source_report_id] = list(matches)  # reemplazo idempotente

    def insert_report_update(self, report_id: str, kind: str, metadata: dict) -> None:
        self._updates.append({"report_id": report_id, "kind": kind, "metadata": metadata})


class SupabaseRepository:
    """Repositorio real contra Supabase (PostgREST + Storage) usando service role.

    El service role bypassa RLS (confirmado en las migraciones de Rol 2), por lo
    que puede leer reportes/imágenes e insertar `matches`/`report_updates`.

    Convenciones:
    - Imagen primaria en el bucket `report-images` con objeto `{report_id}/{file}`.
    - `report_images.storage_path` guarda el nombre del objeto dentro del bucket
      (se tolera un prefijo con el nombre del bucket si viniera incluido).
    """

    def __init__(
        self,
        url: str,
        service_role_key: str,
        *,
        bucket: str = "report-images",
        candidate_limit: int = 50,
        timeout_s: float = 20.0,
        client: httpx.Client | None = None,
    ) -> None:
        if not url or not service_role_key:
            raise ValueError("SupabaseRepository requiere url y service_role_key.")
        self._base = url.rstrip("/")
        self._key = service_role_key
        self._bucket = bucket
        self._candidate_limit = candidate_limit
        headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
        }
        # `client` inyectable para tests (httpx.MockTransport).
        if client is not None:
            self._client = client
        else:
            self._client = httpx.Client(timeout=timeout_s, headers=headers)

    # --- helpers ---
    def _rest_url(self, table: str) -> str:
        return f"{self._base}/rest/v1/{table}"

    def _object_name(self, storage_path: str) -> str:
        prefix = f"{self._bucket}/"
        return storage_path[len(prefix):] if storage_path.startswith(prefix) else storage_path

    # --- interfaz ---
    def get_report(self, report_id: str) -> ReportRow | None:
        resp = self._client.get(
            self._rest_url("reports"),
            params={"id": f"eq.{report_id}", "select": _REPORT_SELECT, "limit": 1},
        )
        resp.raise_for_status()
        rows = resp.json()
        return _row_to_report(rows[0]) if rows else None

    def user_can_process(self, user_id: str, report: ReportRow) -> bool:
        if report.author_id == user_id:
            return True
        # ¿Es miembro del caso?
        resp = self._client.get(
            self._rest_url("case_members"),
            params={
                "report_id": f"eq.{report.id}",
                "user_id": f"eq.{user_id}",
                "select": "id",
                "limit": 1,
            },
        )
        resp.raise_for_status()
        return bool(resp.json())

    def get_primary_image_bytes(self, report_id: str) -> bytes | None:
        resp = self._client.get(
            self._rest_url("report_images"),
            params={
                "report_id": f"eq.{report_id}",
                "is_primary": "eq.true",
                "select": "storage_path",
                "limit": 1,
            },
        )
        resp.raise_for_status()
        rows = resp.json()
        if not rows:
            return None
        name = self._object_name(rows[0]["storage_path"])
        obj = self._client.get(f"{self._base}/storage/v1/object/{self._bucket}/{name}")
        obj.raise_for_status()
        return obj.content

    def list_candidate_reports(self, source: ReportRow) -> list[ReportRow]:
        # Reportes con imagen primaria (embebemos el reporte vía PostgREST).
        resp = self._client.get(
            self._rest_url("report_images"),
            params={
                "is_primary": "eq.true",
                "select": f"report_id,reports({_REPORT_SELECT})",
                "limit": self._candidate_limit,
            },
        )
        resp.raise_for_status()
        out: list[ReportRow] = []
        for row in resp.json():
            rep = row.get("reports")
            if not rep or str(rep["id"]) == source.id:
                continue
            out.append(_row_to_report(rep))
        return out

    def get_recent_matches(self, source_report_id: str) -> list[MatchRow]:
        resp = self._client.get(
            self._rest_url("matches"),
            params={
                "source_report_id": f"eq.{source_report_id}",
                "select": "candidate_report_id,rank,compatibility,visual_score,geo_score,attribute_score,temporal_score",
                "order": "rank.asc",
            },
        )
        resp.raise_for_status()
        return [
            MatchRow(
                candidate_report_id=str(r["candidate_report_id"]),
                rank=int(r["rank"]) if r.get("rank") is not None else 0,
                compatibility=float(r["compatibility"]),
                visual_score=float(r["visual_score"]) if r.get("visual_score") is not None else 0.0,
                geo_score=float(r["geo_score"]) if r.get("geo_score") is not None else 0.0,
                attribute_score=float(r["attribute_score"]) if r.get("attribute_score") is not None else 0.0,
                temporal_score=float(r["temporal_score"]) if r.get("temporal_score") is not None else 0.0,
            )
            for r in resp.json()
        ]

    def upsert_matches(self, source_report_id: str, matches: list[MatchRow]) -> None:
        if not matches:
            return
        # Omitimos `status`: en INSERT toma el default ('suggested') y en conflicto
        # NO se sobrescribe el status que el autor del reporte haya fijado.
        payload = [
            {
                "source_report_id": source_report_id,
                "candidate_report_id": m.candidate_report_id,
                "compatibility": m.compatibility,
                "visual_score": m.visual_score,
                "geo_score": m.geo_score,
                "attribute_score": m.attribute_score,
                "temporal_score": m.temporal_score,
                "rank": m.rank,
            }
            for m in matches
        ]
        resp = self._client.post(
            self._rest_url("matches"),
            params={"on_conflict": "source_report_id,candidate_report_id"},
            headers={"Prefer": "resolution=merge-duplicates"},
            json=payload,
        )
        resp.raise_for_status()

    def insert_report_update(self, report_id: str, kind: str, metadata: dict) -> None:
        resp = self._client.post(
            self._rest_url("report_updates"),
            json={"report_id": report_id, "kind": kind, "metadata": metadata},
        )
        resp.raise_for_status()

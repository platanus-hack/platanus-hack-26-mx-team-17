"""Acceso a datos de la Vision API.

Define una interfaz (`Repository`) y una implementación en memoria
(`FakeRepository`) para desarrollo y pruebas **sin Supabase**.

La implementación real contra Supabase (descarga de Storage, lectura de
`reports`/`report_images`, upsert de `matches`, insert de `report_updates` vía
service role) se añade cuando Rol 2 provea credenciales y esquema. Ver
`SupabaseRepository` (stub) más abajo.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Protocol


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
    """Stub del repositorio real. Se completa cuando Rol 2 entregue:

    - SUPABASE_URL + service role key (lado servidor).
    - Esquema migrado (reports, report_images, matches, report_updates).
    - Bucket de Storage y convención de storage_path.

    Hasta entonces, instanciarlo y usarlo lanza NotImplementedError explícito.
    """

    def __init__(self, url: str, service_role_key: str) -> None:
        self._url = url
        self._key = service_role_key

    def _todo(self) -> "NotImplementedError":
        return NotImplementedError(
            "SupabaseRepository pendiente: requiere credenciales y esquema de Rol 2."
        )

    def get_report(self, report_id: str) -> ReportRow | None:
        raise self._todo()

    def user_can_process(self, user_id: str, report: ReportRow) -> bool:
        raise self._todo()

    def get_primary_image_bytes(self, report_id: str) -> bytes | None:
        raise self._todo()

    def list_candidate_reports(self, source: ReportRow) -> list[ReportRow]:
        raise self._todo()

    def get_recent_matches(self, source_report_id: str) -> list[MatchRow]:
        raise self._todo()

    def upsert_matches(self, source_report_id: str, matches: list[MatchRow]) -> None:
        raise self._todo()

    def insert_report_update(self, report_id: str, kind: str, metadata: dict) -> None:
        raise self._todo()

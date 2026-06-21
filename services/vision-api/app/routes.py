"""Endpoint POST /v1/reports/{report_id}/process."""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Depends

from .auth import AuthenticatedUser
from .config import Settings, get_settings
from .deps import get_repository, require_user
from .embeddings import cosine_similarity, image_from_bytes
from .errors import (
    forbidden,
    model_not_ready,
    no_primary_image,
    report_not_found,
    timeout,
)
from .model import get_model
from .repository import MatchRow, Repository, ReportRow
from .schemas import MatchComponents, MatchOut, ProcessRequest, ProcessResponse
from . import scoring

logger = logging.getLogger("vision-api.process")

router = APIRouter()


def _to_match_out(m: MatchRow) -> MatchOut:
    return MatchOut(
        candidate_report_id=m.candidate_report_id,
        rank=m.rank,
        compatibility=m.compatibility,
        components=MatchComponents(
            visual=m.visual_score,
            geo=m.geo_score,
            attributes=m.attribute_score,
            temporal=m.temporal_score,
        ),
    )


def _compute_matches(
    report: ReportRow,
    source_bytes: bytes,
    repo: Repository,
    settings: Settings,
) -> list[MatchRow]:
    """Núcleo síncrono: embeddings, scores, top 3. Sin I/O de red salvo repo."""
    model = get_model()
    assert model is not None  # garantizado por el caller

    source_emb = model.embed_image(image_from_bytes(source_bytes))

    scored: list[MatchRow] = []
    for cand in repo.list_candidate_reports(report):
        cand_bytes = repo.get_primary_image_bytes(cand.id)
        if cand_bytes is None:
            continue
        cand_emb = model.embed_image(image_from_bytes(cand_bytes))

        visual = scoring.visual_score(cosine_similarity(source_emb, cand_emb))
        geo = scoring.geo_score(
            report.lat, report.lng, cand.lat, cand.lng, decay_km=settings.geo_decay_km
        )
        attrs = scoring.attribute_score(
            report.attributes,
            cand.attributes,
            species1=report.species,
            species2=cand.species,
        )
        temporal = scoring.temporal_score(
            report.location_captured_at,
            cand.location_captured_at,
            decay_days=settings.temporal_decay_days,
        )
        compatibility = scoring.composite(
            visual=visual, geo=geo, attributes=attrs, temporal=temporal, settings=settings
        )
        scored.append(
            MatchRow(
                candidate_report_id=cand.id,
                rank=0,
                compatibility=compatibility,
                visual_score=round(visual, 2),
                geo_score=round(geo, 2),
                attribute_score=round(attrs, 2),
                temporal_score=round(temporal, 2),
            )
        )

    scored.sort(key=lambda m: m.compatibility, reverse=True)
    top = scored[:3]
    for i, m in enumerate(top, start=1):
        m.rank = i
    return top


@router.post("/v1/reports/{report_id}/process", response_model=ProcessResponse)
async def process_report(
    report_id: str,
    body: ProcessRequest | None = None,
    user: AuthenticatedUser = Depends(require_user),
    repo: Repository = Depends(get_repository),
    settings: Settings = Depends(get_settings),
) -> ProcessResponse:
    body = body or ProcessRequest()

    model = get_model()
    if model is None or not model.is_loaded:
        raise model_not_ready()

    report = repo.get_report(report_id)
    if report is None:
        raise report_not_found()

    if not repo.user_can_process(user.id, report):
        raise forbidden()

    source_bytes = repo.get_primary_image_bytes(report_id)
    if source_bytes is None:
        raise no_primary_image()

    # Idempotencia: con force=false devolvemos matches existentes sin recomputar.
    if not body.force:
        existing = repo.get_recent_matches(report_id)
        if existing:
            existing.sort(key=lambda m: m.rank)
            return _build_response(report_id, settings, existing)

    # Procesamiento pesado en threadpool con límite de tiempo (504).
    try:
        matches = await asyncio.wait_for(
            asyncio.to_thread(_compute_matches, report, source_bytes, repo, settings),
            timeout=settings.process_timeout_s,
        )
    except asyncio.TimeoutError as exc:
        raise timeout() from exc

    repo.upsert_matches(report_id, matches)
    repo.insert_report_update(
        report_id,
        kind="vision_processed",
        metadata={
            "model": settings.model_name,
            "match_count": len(matches),
            "candidate_ids": [m.candidate_report_id for m in matches],
        },
    )
    return _build_response(report_id, settings, matches)


def _build_response(
    report_id: str, settings: Settings, matches: list[MatchRow]
) -> ProcessResponse:
    return ProcessResponse(
        report_id=report_id,
        processed_at=_now_iso(),
        model=settings.model_name,
        matches=[_to_match_out(m) for m in matches],
    )


def _now_iso() -> str:
    # Import local: en algunos entornos sandbox `datetime.now` está restringido
    # a nivel global del worker; aquí es una llamada real en runtime.
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

"""Modelos Pydantic de entrada/salida de la Vision API.

Reflejan exactamente el contrato `docs/contracts/vision-api.md`.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class ProcessRequest(BaseModel):
    """Body opcional de POST /v1/reports/{report_id}/process."""

    force: bool = False


class MatchComponents(BaseModel):
    visual: float
    geo: float
    attributes: float
    temporal: float


class MatchOut(BaseModel):
    candidate_report_id: str
    rank: int
    compatibility: float
    components: MatchComponents


class ProcessResponse(BaseModel):
    report_id: str
    processed_at: str
    model: str
    matches: list[MatchOut] = Field(default_factory=list)


class ErrorBody(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorBody

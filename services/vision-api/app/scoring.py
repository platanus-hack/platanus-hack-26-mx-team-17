"""Score compuesto de compatibilidad (0–100).

Implementa la fórmula del contrato:

    compatibility = 0.65*visual + 0.15*geo + 0.15*attributes + 0.05*temporal

Cada componente se normaliza a 0–100. **No** es probabilidad de identidad.
"""

from __future__ import annotations

import math
from datetime import datetime

from .config import Settings


def visual_score(cosine: float) -> float:
    """Reescala la similitud coseno [-1, 1] a [0, 100].

    Embeddings DINOv2 normalizados rara vez son negativos, pero acotamos por
    seguridad.
    """
    scaled = (cosine + 1.0) / 2.0 * 100.0
    return _clamp(scaled)


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0  # radio terrestre en km
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def geo_score(
    lat1: float, lng1: float, lat2: float, lng2: float, *, decay_km: float
) -> float:
    """Decae exponencialmente con la distancia: 100 a 0 km, → 0 al alejarse."""
    dist = _haversine_km(lat1, lng1, lat2, lng2)
    return _clamp(100.0 * math.exp(-dist / max(decay_km, 1e-6)))


def temporal_score(t1: datetime, t2: datetime, *, decay_days: float) -> float:
    """Decae exponencialmente con la diferencia temporal entre reportes."""
    days = abs((t1 - t2).total_seconds()) / 86400.0
    return _clamp(100.0 * math.exp(-days / max(decay_days, 1e-6)))


def attribute_score(attrs1: dict | None, attrs2: dict | None, *, species1: str | None, species2: str | None) -> float:
    """Coincidencia de atributos declarados (especie, color, tamaño, raza...).

    Heurística simple y explicable para el MVP:
    - La especie es la señal más fuerte: si ambas existen y difieren → 0.
    - Si coinciden (o falta info), se promedia la coincidencia del resto de
      atributos comunes.
    """
    s1 = (species1 or "").strip().lower()
    s2 = (species2 or "").strip().lower()
    if s1 and s2 and s1 != s2:
        return 0.0

    a1 = {k: str(v).strip().lower() for k, v in (attrs1 or {}).items()}
    a2 = {k: str(v).strip().lower() for k, v in (attrs2 or {}).items()}
    common = set(a1) & set(a2)
    if not common:
        # Sin atributos comparables: neutral si la especie coincide, si no, bajo.
        return 60.0 if (s1 and s1 == s2) else 50.0

    matches = sum(1 for k in common if a1[k] == a2[k])
    return _clamp(100.0 * matches / len(common))


def composite(
    *, visual: float, geo: float, attributes: float, temporal: float, settings: Settings
) -> float:
    """Suma ponderada de los cuatro componentes (cada uno ya en 0–100)."""
    total = (
        settings.weight_visual * visual
        + settings.weight_geo * geo
        + settings.weight_attributes * attributes
        + settings.weight_temporal * temporal
    )
    return round(_clamp(total), 2)


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))

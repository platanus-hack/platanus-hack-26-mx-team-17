"""Pruebas de las funciones de scoring (puras, sin modelo)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.config import Settings
from app import scoring


def test_visual_score_bounds():
    assert scoring.visual_score(1.0) == 100.0
    assert scoring.visual_score(-1.0) == 0.0
    assert scoring.visual_score(0.0) == 50.0


def test_geo_score_decays_with_distance():
    # Mismo punto -> 100.
    assert scoring.geo_score(0.0, 0.0, 0.0, 0.0, decay_km=10.0) == 100.0
    near = scoring.geo_score(0.0, 0.0, 0.01, 0.0, decay_km=10.0)
    far = scoring.geo_score(0.0, 0.0, 1.0, 0.0, decay_km=10.0)
    assert near > far
    assert 0.0 <= far <= near <= 100.0


def test_temporal_score_decays_with_time():
    t = datetime(2026, 6, 20, tzinfo=timezone.utc)
    same = scoring.temporal_score(t, t, decay_days=7.0)
    later = scoring.temporal_score(t, t + timedelta(days=14), decay_days=7.0)
    assert same == 100.0
    assert later < same


def test_attribute_score_species_mismatch_is_zero():
    score = scoring.attribute_score({}, {}, species1="perro", species2="gato")
    assert score == 0.0


def test_attribute_score_matching_attrs():
    a = {"color": "negro", "tamano": "grande"}
    b = {"color": "negro", "tamano": "grande"}
    score = scoring.attribute_score(a, b, species1="perro", species2="perro")
    assert score == 100.0


def test_composite_uses_contract_weights():
    s = Settings()
    # Sólo visual=100, resto 0 -> 65.0 (peso visual 0.65).
    comp = scoring.composite(visual=100, geo=0, attributes=0, temporal=0, settings=s)
    assert comp == 65.0
    # Todos 100 -> 100.
    comp_all = scoring.composite(visual=100, geo=100, attributes=100, temporal=100, settings=s)
    assert comp_all == 100.0

"""Punto de entrada de la Vision API (FastAPI).

Etapa actual: servicio mínimo con GET /health y carga de DINOv2-small en el
arranque. Sin Supabase, matching ni persistencia todavía.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .config import get_settings
from .model import get_model, init_model

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vision-api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Carga el modelo una sola vez al arrancar el proceso."""
    settings = get_settings()
    try:
        init_model(settings)
    except Exception:  # noqa: BLE001 — registramos pero dejamos que /health refleje el estado.
        logger.exception("Fallo al cargar el modelo en el arranque.")
    yield


app = FastAPI(title="Huella SOS — Vision API", version="0.1.0", lifespan=lifespan)


@app.get("/health")
async def health() -> dict:
    """Readiness y warm-up. Sin autenticación (según contrato)."""
    settings = get_settings()
    model = get_model()
    model_loaded = model is not None and model.is_loaded
    return {
        "status": "ok" if model_loaded else "loading",
        "model_loaded": model_loaded,
        "model": settings.model_name,
    }

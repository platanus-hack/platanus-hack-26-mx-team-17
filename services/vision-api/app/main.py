"""Punto de entrada de la Vision API (FastAPI).

Etapa actual: servicio mínimo con GET /health y carga de DINOv2-small en el
arranque. Sin Supabase, matching ni persistencia todavía.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .config import get_settings
from .errors import VisionError
from .model import get_model, init_model
from .routes import router

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


@app.exception_handler(VisionError)
async def vision_error_handler(request: Request, exc: VisionError) -> JSONResponse:
    """Serializa errores de dominio como {"error": {"code", "message"}}."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


app.include_router(router)


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

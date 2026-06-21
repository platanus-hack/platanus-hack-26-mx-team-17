"""Configuración del servicio Vision API.

Todo se lee de variables de entorno (sin hardcodear). En esta primera etapa
sólo necesitamos parámetros del modelo y del dispositivo; las credenciales de
Supabase se añadirán en una tarea posterior.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

DevicePreference = Literal["auto", "cpu", "cuda"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="VISION_",
        extra="ignore",
    )

    # Modelo de visión (congelado por contrato: facebook/dinov2-small).
    model_name: str = "facebook/dinov2-small"

    # Dispositivo de inferencia.
    #   "auto" -> usa CUDA si está disponible, si no CPU (Railway).
    #   "cpu"  -> fuerza CPU.
    #   "cuda" -> fuerza GPU (falla si no hay CUDA).
    device: DevicePreference = "auto"

    # Si es True, ejecuta un forward pass dummy al arrancar para "calentar"
    # el modelo y mitigar el cold start de la primera petición real.
    warmup_on_startup: bool = True

    # Límite de procesamiento por request (segundos). Al excederlo: 504 timeout.
    process_timeout_s: float = 30.0

    # --- Pesos del score compuesto (deben sumar 1.0; ver contrato) ---
    weight_visual: float = 0.65
    weight_geo: float = 0.15
    weight_attributes: float = 0.15
    weight_temporal: float = 0.05

    # Escalas de decaimiento de los componentes.
    geo_decay_km: float = 10.0  # geo_score = 100 * exp(-dist_km / geo_decay_km)
    temporal_decay_days: float = 7.0  # temporal_score = 100 * exp(-dias / decay)

    # --- Acceso a datos ---
    # "fake": repositorio en memoria (desarrollo/test, sin Supabase).
    # "supabase": repositorio real (requiere credenciales del lado servidor).
    repo: str = "fake"

    # Credenciales de servidor (NUNCA en el cliente). Vacías hasta que Rol 2 las provea.
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # Storage (bucket de imágenes de reportes). Convención de objeto:
    # {report_id}/{filename} dentro del bucket.
    storage_bucket: str = "report-images"

    # Máximo de candidatos a considerar por procesamiento (cota de costo).
    candidate_limit: int = 50

    # Timeout de las llamadas HTTP a Supabase (REST/Storage).
    supabase_http_timeout_s: float = 20.0

    # Si es True, omite la verificación de firma del JWT (SOLO desarrollo/test).
    # En producción debe ser False y exigir supabase_jwt_secret.
    auth_disabled: bool = False


@lru_cache
def get_settings() -> Settings:
    """Devuelve una única instancia de Settings (cacheada)."""
    return Settings()

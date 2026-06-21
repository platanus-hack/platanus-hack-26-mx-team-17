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


@lru_cache
def get_settings() -> Settings:
    """Devuelve una única instancia de Settings (cacheada)."""
    return Settings()

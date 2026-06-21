"""Carga y gestión del modelo DINOv2-small.

El modelo se carga **una sola vez** (al arrancar el proceso, vía el lifespan de
FastAPI) y se mantiene en memoria. Las peticiones nunca recargan el modelo:
sólo consultan la instancia ya cargada.

En esta etapa exponemos la carga, el estado (`model_loaded`) y un warm-up.
La generación de embeddings de imágenes reales llegará en una tarea posterior.
"""

from __future__ import annotations

import logging

import numpy as np
import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModel

from .config import Settings

logger = logging.getLogger(__name__)


def _resolve_device(preference: str) -> str:
    """Resuelve el dispositivo efectivo a partir de la preferencia.

    - "auto": CUDA si está disponible, si no CPU.
    - "cpu":  siempre CPU.
    - "cuda": CUDA; si no hay GPU, cae a CPU con advertencia (no rompe el arranque).
    """
    if preference == "cpu":
        return "cpu"

    cuda_available = torch.cuda.is_available()
    if preference == "cuda":
        if not cuda_available:
            logger.warning("VISION_DEVICE=cuda pero no hay CUDA disponible; usando CPU.")
            return "cpu"
        return "cuda"

    # "auto"
    return "cuda" if cuda_available else "cpu"


class VisionModel:
    """Envuelve el procesador + modelo DINOv2-small y su estado de carga."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._device: str | None = None
        self._processor: AutoImageProcessor | None = None
        self._model: AutoModel | None = None
        self._loaded: bool = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def model_name(self) -> str:
        return self._settings.model_name

    @property
    def device(self) -> str | None:
        return self._device

    def load(self) -> None:
        """Carga el procesador y el modelo en el dispositivo resuelto.

        Idempotente: si ya está cargado, no hace nada.
        """
        if self._loaded:
            return

        device = _resolve_device(self._settings.device)
        logger.info("Cargando modelo %s en dispositivo %s...", self._settings.model_name, device)

        processor = AutoImageProcessor.from_pretrained(self._settings.model_name)
        model = AutoModel.from_pretrained(self._settings.model_name)
        model.to(device)
        model.eval()

        self._device = device
        self._processor = processor
        self._model = model
        self._loaded = True
        logger.info("Modelo cargado (%s) en %s.", self._settings.model_name, device)

        if self._settings.warmup_on_startup:
            self._warmup()

    def embed_image(self, image: Image.Image) -> np.ndarray:
        """Genera el embedding DINOv2 **normalizado** (L2) de una imagen PIL.

        Devuelve un vector float32 1-D. El modelo debe estar cargado.
        """
        if not self._loaded or self._model is None or self._processor is None:
            raise RuntimeError("El modelo no esta cargado.")

        inputs = self._processor(images=image, return_tensors="pt").to(self._device)
        with torch.inference_mode():
            outputs = self._model(**inputs)
        # pooler_output: representación del token CLS tras layernorm (B, hidden).
        embedding = outputs.pooler_output[0]
        vector = embedding.detach().to("cpu", dtype=torch.float32).numpy()

        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        return vector.astype(np.float32)

    def _warmup(self) -> None:
        """Forward pass con una entrada dummy para pagar el cold start ahora."""
        if self._model is None:
            return
        try:
            dummy = torch.zeros(1, 3, 224, 224, device=self._device)
            with torch.inference_mode():
                self._model(pixel_values=dummy)
            logger.info("Warm-up del modelo completado.")
        except Exception:  # noqa: BLE001 — el warm-up no debe tumbar el arranque.
            logger.warning("Warm-up del modelo falló (no crítico).", exc_info=True)


# Singleton a nivel de módulo. Se inicializa en el lifespan de la app.
_vision_model: VisionModel | None = None


def init_model(settings: Settings) -> VisionModel:
    """Crea (si hace falta) y carga el singleton del modelo."""
    global _vision_model
    if _vision_model is None:
        _vision_model = VisionModel(settings)
    _vision_model.load()
    return _vision_model


def get_model() -> VisionModel | None:
    """Devuelve el singleton del modelo, o None si aún no se inicializó."""
    return _vision_model

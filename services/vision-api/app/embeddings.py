"""Decodificación de imágenes y utilidades de similitud.

La generación del embedding vive en `VisionModel.embed_image`; aquí están la
decodificación robusta (corrige rotación EXIF) y la similitud coseno.
"""

from __future__ import annotations

import io

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from .errors import image_unprocessable


def image_from_bytes(data: bytes) -> Image.Image:
    """Decodifica bytes a una imagen RGB, corrigiendo orientación EXIF.

    Lanza `VisionError(422)` si la imagen es corrupta o no decodificable.
    """
    try:
        image = Image.open(io.BytesIO(data))
        image = ImageOps.exif_transpose(image)  # respeta rotación de cámara
        return image.convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise image_unprocessable() from exc


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Similitud coseno entre dos vectores. Asume entradas finitas.

    Si alguno tiene norma 0 devuelve 0.0.
    """
    na = float(np.linalg.norm(a))
    nb = float(np.linalg.norm(b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))

"""Errores de dominio de la Vision API.

Cada error mapea a un (HTTP status, code) del contrato. El handler en `main.py`
los serializa como `{"error": {"code": "...", "message": "..."}}`.
"""

from __future__ import annotations


class VisionError(Exception):
    """Error con código y status HTTP del contrato."""

    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


# Fábricas por caso del contrato (evita strings mágicos dispersos).
def unauthenticated(msg: str = "JWT ausente o invalido") -> VisionError:
    return VisionError(401, "unauthenticated", msg)


def forbidden(msg: str = "El usuario no puede procesar este reporte") -> VisionError:
    return VisionError(403, "forbidden", msg)


def report_not_found(msg: str = "No existe el reporte") -> VisionError:
    return VisionError(404, "report_not_found", msg)


def no_primary_image(msg: str = "El reporte no tiene imagen primaria") -> VisionError:
    return VisionError(409, "no_primary_image", msg)


def image_unprocessable(msg: str = "Imagen corrupta o no decodificable") -> VisionError:
    return VisionError(422, "image_unprocessable", msg)


def model_not_ready(msg: str = "El modelo aun no esta cargado") -> VisionError:
    return VisionError(503, "model_not_ready", msg)


def timeout(msg: str = "Se excedio el tiempo de procesamiento") -> VisionError:
    return VisionError(504, "timeout", msg)

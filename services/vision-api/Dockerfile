# Vision API — imagen para Railway (CPU-only).
# torch se instala desde el índice CPU (evita wheels CUDA gigantes).
# El modelo se pre-descarga en build para eliminar el cold start de red en runtime.

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/models/hf \
    VISION_DEVICE=cpu

WORKDIR /app

# Dependencias. torch CPU primero; luego el resto (torch ya queda satisfecho).
COPY requirements.txt ./
RUN pip install --upgrade pip \
 && pip install torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu \
 && pip install -r requirements.txt

# Código de la app.
COPY app ./app

# Pre-descarga de pesos DINOv2-small al HF_HOME de la imagen (sin red en runtime).
RUN python -c "from transformers import AutoImageProcessor, AutoModel; AutoImageProcessor.from_pretrained('facebook/dinov2-small'); AutoModel.from_pretrained('facebook/dinov2-small')"

EXPOSE 8000

# Railway inyecta $PORT; fallback 8000 en local. `exec` reenvía SIGTERM a uvicorn
# (apagado limpio); forma JSON para expandir $PORT vía sh -c.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

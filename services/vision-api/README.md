# Vision API — Huella SOS

Servicio FastAPI que carga **DINOv2-small** y (en etapas posteriores) genera
embeddings, busca candidatos y persiste `matches`. Propiedad: Rol 3.

> Etapa actual: servicio mínimo — `GET /health` + carga del modelo en el
> arranque. Sin Supabase, matching ni persistencia todavía.

## Requisitos

- Python 3.10+
- (Opcional) GPU NVIDIA con CUDA para inferencia local acelerada.

## Setup local

```bash
cd services/vision-api
python -m venv .venv
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
```

### GPU local (Windows + NVIDIA)

`pip install torch` en Windows instala la build **CPU**. Para usar la GPU:

```bash
pip install torch==2.5.1 --index-url https://download.pytorch.org/whl/cu121
```

El servicio auto-detecta el dispositivo (`VISION_DEVICE=auto`): usa CUDA si está
disponible, si no CPU. En Railway (CPU-only) corre en CPU sin cambios.

## Configuración

Copia `.env.example` a `.env` y ajusta si hace falta. Variables (prefijo `VISION_`):

| Variable                    | Default                 | Descripción                        |
| --------------------------- | ----------------------- | ---------------------------------- |
| `VISION_MODEL_NAME`         | `facebook/dinov2-small` | Modelo (congelado por contrato).   |
| `VISION_DEVICE`             | `auto`                  | `auto` \| `cpu` \| `cuda`.         |
| `VISION_WARMUP_ON_STARTUP`  | `true`                  | Warm-up al arrancar (cold start).  |

## Ejecutar

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

La primera vez descarga los pesos de DINOv2-small desde Hugging Face (cold start).

## Probar `/health`

```bash
curl http://localhost:8000/health
```

Respuesta esperada (según contrato) una vez cargado el modelo:

```json
{ "status": "ok", "model_loaded": true, "model": "facebook/dinov2-small" }
```

Mientras el modelo carga, `status` será `loading` y `model_loaded` será `false`.

## Notas

- El modelo se carga **una sola vez** (lifespan de FastAPI); las peticiones no lo recargan.
- Ver contratos: `docs/contracts/vision-api.md` y `docs/contracts/database-schema.md`.

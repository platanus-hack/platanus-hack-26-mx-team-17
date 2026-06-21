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

## Endpoint de procesamiento

`POST /v1/reports/{report_id}/process` — ver contrato `docs/contracts/vision-api.md`.

- Auth: `Authorization: Bearer <supabase_jwt>` (todos menos `/health`).
- Body opcional: `{ "force": false }`.
- Devuelve hasta 3 candidatos (`compatibility` 0–100) ordenados por `rank`.

Acceso a datos detrás de `Repository`:

- `VISION_REPO=fake` (default): repositorio en memoria, para desarrollo/test.
- `VISION_REPO=supabase`: repositorio real (pendiente; requiere credenciales y
  esquema del Rol 2). Variables de servidor: `VISION_SUPABASE_URL`,
  `VISION_SUPABASE_SERVICE_ROLE_KEY`, `VISION_SUPABASE_JWT_SECRET`.

## Tests

```bash
pip install -r requirements-dev.txt
pytest
```

## Docker (Railway)

La imagen instala **torch CPU** y **pre-descarga** los pesos de DINOv2-small en
build (sin red en runtime → sin cold start de descarga).

```bash
# Build local (requiere Docker Desktop corriendo):
docker build -t huellasos-vision .

# Run local:
docker run --rm -p 8000:8000 huellasos-vision
curl http://localhost:8000/health
```

### Despliegue en Railway

1. En Railway, crear un servicio apuntando a este repo.
2. **Root Directory** del servicio: `services/vision-api` (monorepo).
3. Railway detecta `railway.json` → builder Dockerfile + healthcheck en `/health`.
4. Variables de entorno (lado servidor, **nunca** en el cliente):
   `VISION_REPO=supabase`, `VISION_SUPABASE_URL`,
   `VISION_SUPABASE_SERVICE_ROLE_KEY`, `VISION_SUPABASE_JWT_SECRET`.
5. El cliente sólo recibe la URL pública en `EXPO_PUBLIC_VISION_API_URL`.
6. Calentar con `GET /health` antes de la demo.

> `$PORT` lo inyecta Railway; el contenedor escucha ahí automáticamente.

## Notas

- El modelo se carga **una sola vez** (lifespan de FastAPI); las peticiones no lo recargan.
- Ver contratos: `docs/contracts/vision-api.md` y `docs/contracts/database-schema.md`.

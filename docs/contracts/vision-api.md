STATUS: FROZEN FOR MVP

# Contrato — Vision API (FastAPI / DINOv2)

Servicio público en Railway. Sólo procesa visión: valida JWT, descarga la imagen del reporte, genera embeddings (DINOv2-small, normalizados), busca candidatos, calcula score compuesto, guarda matches (idempotente) y registra el evento. **No** maneja auth, chat ni tracking. Propiedad: Persona 3. Cambios vía `/contract-change`.

Base URL: variable pública `EXPO_PUBLIC_VISION_API_URL`. Nunca usar `localhost` en el APK.

## Autenticación

- Todos los endpoints (excepto `/health`) requieren el **JWT de Supabase** del usuario en `Authorization: Bearer <jwt>`.
- El servicio valida el JWT contra Supabase. El cliente **nunca** envía la service role key.
- El servicio usa internamente su propia service role key (sólo del lado servidor) para escribir `matches` y `report_updates`.

---

## GET /health

Sin autenticación. Para readiness y warm-up (mitiga cold start).

**Response 200:**

```json
{
  "status": "ok",
  "model_loaded": true,
  "model": "facebook/dinov2-small"
}
```

`model_loaded` debe ser `true` antes de aceptar procesamiento.

---

## POST /v1/reports/{report_id}/process

Procesa el reporte `report_id` (debe tener imagen primaria) y devuelve hasta 3 candidatos compatibles.

**Headers:** `Authorization: Bearer <supabase_jwt>`

**Request body (opcional):**

```json
{
  "force": false
}
```

- `force=false` (default): si ya hay matches recientes, los devuelve sin recomputar (idempotencia).
- `force=true`: recomputa; los matches existentes se actualizan, no se duplican.

**Response 200:**

```json
{
  "report_id": "uuid",
  "processed_at": "2026-06-20T12:00:00Z",
  "model": "facebook/dinov2-small",
  "matches": [
    {
      "candidate_report_id": "uuid",
      "rank": 1,
      "compatibility": 87.4,
      "components": {
        "visual": 90.1,
        "geo": 80.0,
        "attributes": 85.0,
        "temporal": 70.0
      }
    }
  ]
}
```

- `matches` ordenado por `rank` (1..3). Lista vacía si no hay candidatos.
- `compatibility` es **0–100** (compatibilidad visual, **no** probabilidad de identidad).

**Errores:**
| HTTP | code | Causa |
|---|---|---|
| 401 | `unauthenticated` | JWT ausente o inválido |
| 403 | `forbidden` | el usuario no puede procesar este reporte |
| 404 | `report_not_found` | no existe el reporte |
| 409 | `no_primary_image` | el reporte no tiene imagen primaria |
| 422 | `image_unprocessable` | imagen corrupta/no decodificable |
| 503 | `model_not_ready` | `model_loaded=false` (cold start) |
| 504 | `timeout` | excedió el tiempo de procesamiento |

Formato de error:

```json
{ "error": { "code": "report_not_found", "message": "..." } }
```

## Timeout

- Límite de procesamiento recomendado: **30 s** por request (incluye descarga + inferencia). Al excederlo: `504 timeout`.
- El cliente debe usar timeout de cliente ≥ al del servidor y manejar reintento manual.
- Calentar con `GET /health` antes de la demo para evitar cold start.

## Idempotencia

- `matches` tiene `UNIQUE(source_report_id, candidate_report_id)`.
- Procesar dos veces el mismo reporte **no** duplica filas: se hace upsert por ese par.
- Con `force=false`, si ya hay resultado reciente, se devuelve tal cual sin recomputar.

## Fórmula de score compuesto

`compatibility` (0–100) es la suma ponderada de cuatro componentes, cada uno normalizado a 0–100:

```text
compatibility = 0.65 * visual
              + 0.15 * geo
              + 0.15 * attributes
              + 0.05 * temporal
```

- **visual (65%)** — similitud coseno entre embeddings DINOv2-small normalizados, reescalada a 0–100.
- **geo (15%)** — cercanía geográfica entre las ubicaciones de los reportes (decae con la distancia).
- **attributes (15%)** — coincidencia de atributos declarados (especie, color, tamaño, etc.).
- **temporal (5%)** — cercanía temporal entre los reportes.

Se persiste el `compatibility` final y cada componente en `matches`. Se devuelve el **top 3** por `compatibility`.

## Persistencia y eventos

- Escribe/actualiza filas en `matches` (vía service role).
- Registra un `report_updates` con `kind = "vision_processed"` y `metadata` del procesamiento.
- No escribe en tablas de auth, chat ni tracking.

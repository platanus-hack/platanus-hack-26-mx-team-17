# Handoff Vision API → Rol 4 (integración móvil)

Servicio de IA visual (DINOv2-small) que sugiere candidatos visualmente
compatibles. **Compatibilidad 0–100, no identidad.** Propiedad: Rol 3.

## Servicio desplegado (público)

```
EXPO_PUBLIC_VISION_API_URL=https://huellasos-vision-production.up.railway.app
```

- Inferencia en CPU (Railway). Calentar con `GET /health` antes de la demo.
- Auth: JWT de Supabase del usuario en `Authorization: Bearer <jwt>`.
  El cliente **nunca** envía la service role key.

---

## GET /health

Sin autenticación. Para readiness y warm-up.

```bash
curl https://huellasos-vision-production.up.railway.app/health
```

**200:**
```json
{ "status": "ok", "model_loaded": true, "model": "facebook/dinov2-small" }
```

`model_loaded:true` antes de procesar. Si está cargando: `status:"loading"`,
`model_loaded:false`.

---

## POST /v1/reports/{report_id}/process

Procesa un reporte (debe tener imagen primaria) y devuelve hasta 3 candidatos.

**Headers:** `Authorization: Bearer <supabase_jwt>`
**Body (opcional):** `{ "force": false }`
- `force=false` (default): si ya hay matches, los devuelve sin recomputar (idempotente).
- `force=true`: recomputa (upsert por par, no duplica).

```bash
curl -X POST \
  https://huellasos-vision-production.up.railway.app/v1/reports/<REPORT_ID>/process \
  -H "Authorization: Bearer <SUPABASE_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"force": false}'
```

**200:**
```json
{
  "report_id": "uuid",
  "processed_at": "2026-06-21T03:00:00Z",
  "model": "facebook/dinov2-small",
  "matches": [
    {
      "candidate_report_id": "uuid",
      "rank": 1,
      "compatibility": 87.4,
      "components": { "visual": 90.1, "geo": 80.0, "attributes": 85.0, "temporal": 70.0 }
    }
  ]
}
```

- `matches` ordenado por `rank` (1..3). Lista vacía si no hay candidatos.
- `compatibility` 0–100 = `0.65·visual + 0.15·geo + 0.15·attributes + 0.05·temporal`.
- Los matches se persisten en la tabla `matches` (vía service role) y se registra
  un `report_updates` con `kind = "vision_processed"`. El cliente puede leerlos
  por Supabase con RLS (miembros del caso / autor).

### Errores (formato `{ "error": { "code", "message" } }`)

| HTTP | code | Cuándo |
|---|---|---|
| 401 | `unauthenticated` | JWT ausente/ inválido/ expirado |
| 403 | `forbidden` | el usuario no es autor ni miembro del caso |
| 404 | `report_not_found` | no existe el reporte |
| 409 | `no_primary_image` | el reporte no tiene imagen primaria |
| 422 | `image_unprocessable` | imagen corrupta/no decodificable |
| 503 | `model_not_ready` | modelo aún cargando (cold start) |
| 504 | `timeout` | excedió el tiempo de procesamiento (30 s) |

Ejemplo de error:
```json
{ "error": { "code": "report_not_found", "message": "No existe el reporte" } }
```

---

## Recomendaciones de integración (cliente)

1. **Precondición:** el reporte debe tener una imagen primaria (`report_images.is_primary=true`)
   subida a Storage (`report-images/{report_id}/{archivo}`) **antes** de llamar a `/process`.
2. **Cold start:** llama `GET /health` al abrir la pantalla / antes de la demo; reintenta
   `/process` ante `503 model_not_ready`.
3. **Timeout de cliente** ≥ 30 s; ante `504`/error de red, reintento manual.
4. **Idempotencia:** repetir `/process` (force=false) es seguro y barato.
5. Muestra el resultado como **compatibilidad 0–100**, nunca como "es el mismo animal".

## Estado de verificación

- `/health` y `/process` verificados end-to-end contra el Supabase hosted (200,
  persistencia de `matches`/`report_updates`, idempotencia).
- Calidad de match validada con dataset de imágenes reales: top-1 y top-3 = 100%
  (`scripts/eval_dataset.py`).

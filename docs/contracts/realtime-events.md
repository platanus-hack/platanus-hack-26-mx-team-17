STATUS: DRAFT — debe congelarse antes de comenzar implementación dependiente.

# Contrato — Eventos Realtime (Supabase Realtime)

Suscripciones en vivo que la app móvil consume vía los servicios de `mobile-data-access.md`. Propiedad: Persona 2 (infra Realtime + reports/messages), Persona 1 (tracking). Cambios vía `/contract-change`.

Regla clave: **`tracking_points` NO se usa como fuente continua de actualización visual.** La posición en vivo del rescatista se sigue por `tracking_sessions` (`last_lat`, `last_lng`, `last_point_at`). `tracking_points` es historial, no stream de UI.

Convenciones:
- Canal por entidad/caso; las suscripciones respetan RLS (sólo llega lo que el usuario puede ver).
- `op` ∈ `INSERT` · `UPDATE` · `DELETE`.

---

## reports

**Propósito:** descubrir reportes públicos nuevos/actualizados en el mapa.

- **Tabla:** `reports`
- **Eventos:** `INSERT` (reporte nuevo), `UPDATE` (cambio de `status` u otros campos).
- **Filtro típico:** públicos (`is_public = true`), opcionalmente por bounding box.
- **Payload:** fila de `reports` (id, type, status, lat, lng, title, updated_at).
- **Consumidor:** mapa (Persona 1), lista de reportes (Persona 4).

## report_updates

**Propósito:** línea de tiempo del caso en vivo (cambios de estado, match, tracking, `vision_processed`).

- **Tabla:** `report_updates`
- **Eventos:** `INSERT`.
- **Filtro:** `report_id = <caso>`.
- **Payload:** fila de `report_updates` (id, report_id, kind, body, metadata, created_at).
- **Consumidor:** detalle/timeline del caso (Persona 4); sólo miembros/acceso al reporte.

## matches

**Propósito:** presentar candidatos compatibles cuando la Vision API termina.

- **Tabla:** `matches`
- **Eventos:** `INSERT` (nuevo candidato), `UPDATE` (cambio de `status` o `compatibility`).
- **Filtro:** `source_report_id = <caso>`.
- **Payload:** fila de `matches` (id, source_report_id, candidate_report_id, status, compatibility, rank).
- **Consumidor:** pantalla de matches (Persona 4).

## messages

**Propósito:** chat de texto privado por caso en vivo.

- **Tabla:** `messages`
- **Eventos:** `INSERT`.
- **Filtro:** `report_id = <caso>`.
- **Payload:** fila de `messages` (id, report_id, sender_id, body, created_at).
- **Consumidor:** chat (Persona 2); sólo miembros del caso (RLS).

## tracking_sessions

**Propósito:** última posición del rescatista y estado del rescate en vivo.

- **Tabla:** `tracking_sessions`
- **Eventos:** `INSERT` (sesión iniciada), `UPDATE` (cambia `status` o `last_lat`/`last_lng`/`last_point_at`).
- **Filtro:** `report_id = <caso>`.
- **Payload:** fila de `tracking_sessions` (id, report_id, rescuer_id, status, last_lat, last_lng, last_point_at).
- **Consumidor:** mapa/tracking (Persona 1); sólo miembros del caso.
- **Nota:** la app actualiza `last_*` periódicamente; los puntos crudos se acumulan en `tracking_points` sin suscripción de UI.

---

## Tabla resumen

| Entidad | Tabla | Eventos | Filtro | UI continua |
|---|---|---|---|---|
| reports | reports | INSERT/UPDATE | público / bbox | sí |
| report_updates | report_updates | INSERT | report_id | sí |
| matches | matches | INSERT/UPDATE | source_report_id | sí |
| messages | messages | INSERT | report_id | sí |
| tracking_sessions | tracking_sessions | INSERT/UPDATE | report_id | sí |
| tracking_points | tracking_points | — | — | **NO** (sólo historial) |

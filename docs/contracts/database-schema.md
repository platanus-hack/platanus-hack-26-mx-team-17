STATUS: DRAFT — debe congelarse antes de comenzar implementación dependiente.

# Contrato — Esquema de base de datos (Supabase / PostgreSQL)

Definición **conceptual**. No escribir migraciones SQL todavía. Propiedad: Persona 2. Todo cambio pasa por `/contract-change`.

Convenciones:
- Toda tabla tiene `id uuid` (PK), `created_at timestamptz`, y `updated_at timestamptz` donde aplique.
- `user_id` referencia a `auth.users(id)` de Supabase.
- Toda escritura está protegida por RLS. La lectura pública sólo aplica a datos explícitamente marcados como públicos.

## Enums

**report_type**: `lost` · `sighting` · `injured` · `abandoned`
**report_status**: `open` · `possible_match` · `tracking` · `rescue_in_progress` · `resolved` · `cancelled`
**match_status**: `suggested` · `source_accepted` · `source_rejected` · `confirmed` · `dismissed`
**tracking_status**: `active` · `paused` · `finished` · `cancelled`

---

## profiles

**Propósito:** datos de usuario asociados a una cuenta de `auth.users`.

| Columna | Tipo conceptual | Req. | Notas |
|---|---|---|---|
| id | uuid (PK = auth.users.id) | sí | FK → auth.users(id) ON DELETE CASCADE |
| display_name | text | sí | nombre visible |
| phone | text | no | si auth por OTP |
| avatar_url | text | no | en Storage |
| organization_id | uuid | no | FK → organizations(id) |
| created_at | timestamptz | sí | |

- **FK:** `id → auth.users.id`, `organization_id → organizations.id`.
- **Índices:** PK; índice en `organization_id`.
- **Visibilidad:** `display_name` y `avatar_url` legibles públicamente; `phone` privado.
- **RLS:** select público de campos no sensibles; update/insert sólo `auth.uid() = id`.

## reports

**Propósito:** reporte de un animal (perdido, avistado, herido, abandonado). Núcleo del flujo.

| Columna | Tipo conceptual | Req. | Notas |
|---|---|---|---|
| id | uuid (PK) | sí | |
| author_id | uuid | sí | FK → profiles(id) |
| type | report_type | sí | enum |
| status | report_status | sí | default `open` |
| title | text | sí | |
| description | text | no | |
| species | text | no | p. ej. perro, gato |
| attributes | jsonb | no | color, tamaño, raza estimada (para score de atributos) |
| lat | double precision | sí | sólo GPS actual |
| lng | double precision | sí | sólo GPS actual |
| location_accuracy_m | double precision | sí | precisión de la lectura |
| location_captured_at | timestamptz | sí | timestamp del fix GPS |
| organization_id | uuid | no | FK → organizations(id) |
| is_public | boolean | sí | default true |
| created_at | timestamptz | sí | |
| updated_at | timestamptz | sí | |

- **FK:** `author_id → profiles.id`, `organization_id → organizations.id`.
- **Constraints:** `lat` ∈ [-90,90], `lng` ∈ [-180,180]; `location_accuracy_m > 0`. La ubicación **nunca** se elige manualmente (regla de aplicación, no DB).
- **Índices:** `status`, `type`, `author_id`, índice geográfico sobre `(lat,lng)`, `created_at desc`.
- **Visibilidad:** pública cuando `is_public = true`.
- **RLS:** select público si `is_public`; insert sólo autenticado con `author_id = auth.uid()`; update sólo autor o miembro del caso con rol adecuado.

## report_images

**Propósito:** imágenes de un reporte (en Storage). Una imagen primaria alimenta la Vision API.

| Columna | Tipo conceptual | Req. | Notas |
|---|---|---|---|
| id | uuid (PK) | sí | |
| report_id | uuid | sí | FK → reports(id) ON DELETE CASCADE |
| storage_path | text | sí | ruta en bucket de Storage |
| is_primary | boolean | sí | default false |
| width | int | no | |
| height | int | no | |
| created_at | timestamptz | sí | |

- **FK:** `report_id → reports.id`.
- **Constraints:** máximo una `is_primary = true` por reporte.
- **Índices:** `report_id`.
- **Visibilidad:** pública si el reporte es público.
- **RLS:** select según visibilidad del reporte; insert sólo autor del reporte.

## matches

**Propósito:** candidato de compatibilidad visual entre un reporte fuente y otro candidato, generado por la Vision API.

| Columna | Tipo conceptual | Req. | Notas |
|---|---|---|---|
| id | uuid (PK) | sí | |
| source_report_id | uuid | sí | FK → reports(id) — reporte que disparó el proceso |
| candidate_report_id | uuid | sí | FK → reports(id) — candidato sugerido |
| status | match_status | sí | default `suggested` |
| compatibility | numeric(5,2) | sí | 0–100 (no es probabilidad de identidad) |
| visual_score | numeric(5,2) | no | componente visual |
| geo_score | numeric(5,2) | no | componente geográfico |
| attribute_score | numeric(5,2) | no | componente de atributos |
| temporal_score | numeric(5,2) | no | componente temporal |
| rank | int | no | 1..3 (top 3) |
| created_at | timestamptz | sí | |

- **FK:** `source_report_id`, `candidate_report_id → reports.id`.
- **Constraints:** `UNIQUE(source_report_id, candidate_report_id)` (idempotencia); `compatibility` ∈ [0,100]; `source_report_id <> candidate_report_id`.
- **Índices:** `source_report_id`, `candidate_report_id`, `(source_report_id, rank)`.
- **Visibilidad:** legible por miembros del caso y autores involucrados.
- **RLS:** insert/update sólo por el service role de la Vision API (no por el cliente); update de `status` por el autor del reporte fuente.

## report_updates

**Propósito:** línea de tiempo de eventos del caso (cambios de estado, match aceptado, inicio de tracking, resolución, eventos de procesamiento de IA).

| Columna | Tipo conceptual | Req. | Notas |
|---|---|---|---|
| id | uuid (PK) | sí | |
| report_id | uuid | sí | FK → reports(id) ON DELETE CASCADE |
| author_id | uuid | no | FK → profiles(id); null si es del sistema/IA |
| kind | text | sí | p. ej. `status_change`, `match`, `tracking`, `vision_processed` |
| body | text | no | descripción legible |
| metadata | jsonb | no | datos estructurados del evento |
| created_at | timestamptz | sí | |

- **FK:** `report_id → reports.id`, `author_id → profiles.id`.
- **Índices:** `report_id`, `created_at`.
- **Visibilidad:** según visibilidad del reporte / miembros del caso.
- **RLS:** insert por miembros del caso o service role; select según acceso al reporte.

## case_members

**Propósito:** miembros de un caso (un reporte). Habilita chat privado y visibilidad de tracking.

| Columna | Tipo conceptual | Req. | Notas |
|---|---|---|---|
| id | uuid (PK) | sí | |
| report_id | uuid | sí | FK → reports(id) ON DELETE CASCADE |
| user_id | uuid | sí | FK → profiles(id) |
| role | text | sí | `owner` · `rescuer` · `member` |
| created_at | timestamptz | sí | |

- **FK:** `report_id → reports.id`, `user_id → profiles.id`.
- **Constraints:** `UNIQUE(report_id, user_id)`.
- **Índices:** `report_id`, `user_id`.
- **Visibilidad:** privada (sólo miembros del caso).
- **RLS:** select sólo si `auth.uid()` es miembro del mismo caso; insert al unirse (`joinCase`); el autor del reporte es `owner`.

## messages

**Propósito:** chat de texto privado por caso.

| Columna | Tipo conceptual | Req. | Notas |
|---|---|---|---|
| id | uuid (PK) | sí | |
| report_id | uuid | sí | FK → reports(id) ON DELETE CASCADE |
| sender_id | uuid | sí | FK → profiles(id) |
| body | text | sí | sólo texto, sin multimedia |
| created_at | timestamptz | sí | |

- **FK:** `report_id → reports.id`, `sender_id → profiles.id`.
- **Índices:** `(report_id, created_at)`.
- **Visibilidad:** privada (miembros del caso).
- **RLS:** select/insert sólo si `auth.uid()` es miembro del caso; insert exige `sender_id = auth.uid()` (no se puede suplantar a otro).

## tracking_sessions

**Propósito:** sesión de rescate GPS. Vive sólo mientras hay rescate activo. Fuente de la última posición para la UI en tiempo real.

| Columna | Tipo conceptual | Req. | Notas |
|---|---|---|---|
| id | uuid (PK) | sí | |
| report_id | uuid | sí | FK → reports(id) ON DELETE CASCADE |
| rescuer_id | uuid | sí | FK → profiles(id) |
| status | tracking_status | sí | default `active` |
| last_lat | double precision | no | última posición conocida |
| last_lng | double precision | no | última posición conocida |
| last_point_at | timestamptz | no | timestamp de la última posición |
| started_at | timestamptz | sí | |
| ended_at | timestamptz | no | |

- **FK:** `report_id → reports.id`, `rescuer_id → profiles.id`.
- **Constraints:** a lo sumo una sesión `active` por `report_id`.
- **Índices:** `report_id`, `status`.
- **Visibilidad:** miembros del caso.
- **RLS:** select por miembros del caso; insert/update sólo por el rescatista de la sesión. **Realtime se suscribe a esta tabla** para la posición en vivo.

## tracking_points

**Propósito:** historial de puntos GPS de una sesión. **No** se usa como fuente continua de actualización visual (eso lo da `tracking_sessions.last_*`).

| Columna | Tipo conceptual | Req. | Notas |
|---|---|---|---|
| id | uuid (PK) | sí | |
| session_id | uuid | sí | FK → tracking_sessions(id) ON DELETE CASCADE |
| lat | double precision | sí | |
| lng | double precision | sí | |
| accuracy_m | double precision | no | |
| recorded_at | timestamptz | sí | |

- **FK:** `session_id → tracking_sessions.id`.
- **Índices:** `(session_id, recorded_at)`.
- **Visibilidad:** miembros del caso.
- **RLS:** insert sólo por el rescatista de la sesión; select por miembros del caso. No suscribir Realtime de UI continua aquí.

## organizations

**Propósito:** refugios u organizaciones de rescate (agrupación opcional).

| Columna | Tipo conceptual | Req. | Notas |
|---|---|---|---|
| id | uuid (PK) | sí | |
| name | text | sí | |
| contact_email | text | no | |
| created_at | timestamptz | sí | |

- **Índices:** PK; índice en `name`.
- **Visibilidad:** `name` público; contacto según política.
- **RLS:** select público de campos no sensibles; escritura restringida a miembros de la organización.

---

## Relaciones (resumen)

```text
auth.users 1—1 profiles
organizations 1—N profiles
profiles 1—N reports
reports 1—N report_images
reports 1—N report_updates
reports 1—N case_members N—1 profiles
reports 1—N messages N—1 profiles
reports 1—N matches (source) / 1—N matches (candidate)
reports 1—N tracking_sessions 1—N tracking_points
```

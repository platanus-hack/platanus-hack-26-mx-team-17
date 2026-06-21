# Estado del proyecto — Huella SOS

## Última actualización

2026-06-21 — Rol 1: Mapbox + geolocalización + tracking GPS implementados en `feat/mapbox-gps` (mapa con marcadores, `getCurrentReportLocation()`, sesiones de rescate con foreground service y Realtime). Pendiente: nuevo development build para verificar en dispositivo. Previo: app móvil con navegación + formulario (Rol 4), Vision API en Railway (Rol 3), migraciones Supabase (Rol 2), pipeline EAS.

## Build estable

Ninguno aún. Pipeline EAS configurado (`apps/mobile/eas.json`, perfiles development/preview/production en APK); primer development build en proceso. No existe APK final.

## Funcionando

- `CLAUDE.md` global creado (incluye jerarquía de instrucciones y lista de skills).
- Documentos de roles creados (`docs/roles/01..04`).
- Skills creadas: `/start-task`, `/handoff`, `/contract-change`, `/release-check`.
- `docs/architecture.md`, `docs/decisions.md`, `docs/qa-checklist.md` y `docs/demo-script.md` creados.
- Los cinco contratos en `docs/contracts/` existen y están `FROZEN FOR MVP`.
- **App móvil inicializada** (`apps/mobile`): Expo SDK 56 + Expo Router + TypeScript estricto. `tsc --noEmit` pasa; `expo export` (bundle Android) compila; `expo-doctor` 21/21.
- **Navegación base** (Rol 4): Stack raíz, home placeholder (lista de reportes), `report/new` (formulario), `report/[id]` (stub de detalle), `map-demo` (ruta TEMPORAL para verificación de Mapbox del Rol 1).
- **Formulario de reporte (UI mock)**: tipo/título/descripción/especie/atributos, ubicación de solo lectura (sin elegir/editar/arrastrar), placeholder de imagen. Estados vacío/validación/enviando/éxito/error.
- **Desacople por contrato**: tipos en `src/types/` y `reportService` (mock) calcados de `mobile-data-access.md`; la UI no toca Supabase directamente.
- **Pipeline de build (Rol 4)**: `eas.json` con perfiles APK, `app.config.ts` con scheme `huellasos`, `android.package = mx.huellasos.app`, `extra.eas.projectId` fijo y variables públicas declaradas. `expo-dev-client` agregado (QR + fast refresh sin Expo Go).
- `.npmrc` con `legacy-peer-deps=true` (React 19 vs peers de expo-router web).
- **`supabase/migrations/` creado** (Rol 2) — tres migraciones reproducibles:
  - `000001_initial_schema.sql` — 10 tablas, 4 enums, índices, constraints.
  - `000002_rls_policies.sql` — RLS habilitado en todas las tablas + políticas Storage.
  - `000003_triggers.sql` — trigger de perfil automático + trigger de owner en case_members.
- `supabase/seed.sql` — bucket `report-images` + org de demo.
- `supabase/config.toml` — config CLI de Supabase (deep link `huellasos://auth/callback`).
- **Mapbox + geolocalización + tracking (Rol 1)** en `feat/mapbox-gps` (`tsc --noEmit` pasa, `expo config` valida plugins):
  - `@rnmapbox/maps` + plugin nativo (token de descarga vía `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`, secreto, sólo en build).
  - `src/features/map/`: `MapView` (punto del usuario, marcadores, centrado de cámara), `getCurrentReportLocation()` con validación de precisión/antigüedad y códigos de error del contrato.
  - Home (`app/index.tsx`) muestra reportes como marcadores; tap → detalle. Formulario (`app/report/new.tsx`) usa GPS real (reemplaza el mock).
  - `src/features/tracking/`: `startTracking/pauseTracking/resumeTracking/stopTracking/subscribeToTracking` sobre `tracking_sessions` + Realtime; tarea de fondo (`expo-task-manager`) con foreground service que persiste `tracking_points` y `last_*`. Pantalla `app/report/[id]/tracking.tsx`.
  - **Coordinación:** `src/lib/supabase.ts` (cliente compartido) lo creó Rol 1 por necesidad del tracking; **Rol 2 debe adoptarlo** (no duplicar cliente). Permisos background/foreground service agregados a `app.config.ts`.

## En desarrollo

- Conexión de servicios reales detrás de `reportService` (Supabase — Rol 2), captura GPS real y mapa (Rol 1) y carga de imagen (Rol 4).
- `feat/auth-chat-supabase`: cliente Supabase JS + tipos TypeScript + servicio auth.
- Mapbox: integración del `<MapView>` real (Rol 1) requiere instalar `@rnmapbox/maps`, config plugin en `app.config.ts` (token secreto vía EAS secret) y un nuevo development build.

## Bloqueos

- Credenciales externas pendientes (Supabase project URL + anon key, Mapbox tokens, Google OAuth, proveedor SMS).
- **Node ≥20.19.4 requerido por SDK 56**: el equipo usa **Node 22.22.2** (`nvm use 22.22.2`); con esa versión `expo-doctor` pasa y EAS build corre sin avisos.

## Servicios desplegados

- **Vision API (Rol 3): desplegada y pública** en Railway →
  `https://huellasos-vision-production.up.railway.app` (`EXPO_PUBLIC_VISION_API_URL`).
  - `GET /health` y `POST /v1/reports/{id}/process` operativos (DINOv2-small, CPU).
  - Validación de JWT de Supabase; escribe `matches`/`report_updates` vía service role.
  - Verificado end-to-end contra Supabase hosted; calidad de match top-1/top-3 = 100%.
  - Handoff a Rol 4: `services/vision-api/docs/handoff.md`.
- Supabase: esquema/RLS/triggers listos en migraciones; proyecto en la nube pendiente de crear y aplicar (`supabase db push`).
- App móvil: inicializada; APK pendiente del primer build EAS.

## Integraciones pendientes

- Conectar `reportService` mock a Supabase real (Rol 2) detrás de la interfaz existente.
- Conectar captura GPS real (`getCurrentReportLocation()`) y mapa en la home (Rol 1).
- Conectar el cliente móvil a la Vision API (`EXPO_PUBLIC_VISION_API_URL`).
- Conectar captura de imagen (`expo-image-picker`) en el formulario (Rol 4).
- Generar el APK final tras `/release-check`.

## Próximo checkpoint

- Crear proyecto Supabase en la nube y aplicar las tres migraciones (`supabase db push`).
- Rol 2: implementar `supabase.ts`, `database.ts`, `auth.service.ts` e implementación real de `reportService` detrás de la interfaz.
- Rol 1: verificar `map-demo` en el dev build, luego integrar Mapbox + `getCurrentReportLocation()` (requiere rebuild con el nativo).
- Rol 4: distribuir el dev client APK al equipo, conectar `expo-image-picker` y preparar el APK de demo tras `/release-check`.

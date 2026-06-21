# Estado del proyecto — Huella SOS

## Última actualización

2026-06-21 — Vision API (Rol 3) implementada, desplegada en Railway y verificada (rama `feature/vision-api`).

## Build estable

Ninguno. No existe APK todavía.

## Funcionando

- `CLAUDE.md` global creado (incluye jerarquía de instrucciones y lista de skills).
- Documentos de roles creados (`docs/roles/01..04`).
- Skills creadas: `/start-task`, `/handoff`, `/contract-change`, `/release-check`.
- `docs/architecture.md`, `docs/decisions.md`, `docs/qa-checklist.md` y `docs/demo-script.md` creados.
- Los cinco contratos en `docs/contracts/` existen.

## En desarrollo

- Los cinco contratos permanecen en estado `DRAFT` (pendientes de revisión y congelación).

## Bloqueos

- Contratos sin congelar; no iniciar implementación dependiente hasta entonces.
- Credenciales externas pendientes (Supabase, Mapbox, Google OAuth, proveedor SMS, Railway).

## Servicios desplegados

- **Vision API (Rol 3): desplegada y pública** en Railway →
  `https://huellasos-vision-production.up.railway.app` (`EXPO_PUBLIC_VISION_API_URL`).
  - `GET /health` y `POST /v1/reports/{id}/process` operativos (DINOv2-small, CPU).
  - Validación de JWT de Supabase; escribe `matches`/`report_updates` vía service role.
  - Verificado end-to-end contra Supabase hosted; calidad de match top-1/top-3 = 100%.
  - Handoff a Rol 4: `services/vision-api/docs/handoff.md`.
- Supabase: esquema/RLS/triggers en rama `feat/auth-chat-supabase` (Rol 2).
- App móvil: aún no inicializada.

## Integraciones pendientes

- Aplicación móvil no inicializada (Expo).
- Conectar el cliente móvil a la Vision API (`EXPO_PUBLIC_VISION_API_URL`).
- Mergear `feat/auth-chat-supabase` y `feature/vision-api` a `main`.
- APK inexistente.

## Próximo checkpoint

- **Revisar y congelar los cinco contratos** en `docs/contracts/` (vía `/contract-change`).
- Tras congelar: inicializar la app Expo y el servicio FastAPI en sus ramas, y configurar el proyecto Supabase con la migración inicial.

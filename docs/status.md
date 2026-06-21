# Estado del proyecto — Huella SOS

## Última actualización

2026-06-20 — Scaffolding y contexto compartido completados (rama `chore/project-scaffold`).

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

- Ninguno. Supabase no configurado. Vision API no inicializada. Sin despliegues públicos.

## Integraciones pendientes

- Aplicación móvil no inicializada (Expo).
- Vision API no inicializada (FastAPI).
- Supabase no configurado (esquema, RLS, Auth, Storage, Realtime).
- APK inexistente.

## Próximo checkpoint

- **Revisar y congelar los cinco contratos** en `docs/contracts/` (vía `/contract-change`).
- Tras congelar: inicializar la app Expo y el servicio FastAPI en sus ramas, y configurar el proyecto Supabase con la migración inicial.

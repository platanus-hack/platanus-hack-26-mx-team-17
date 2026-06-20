# Estado del proyecto — Huella SOS

## Última actualización

2026-06-20 — Scaffolding inicial del repositorio (rama `chore/project-scaffold`).

## Build estable

Ninguno. No existe APK todavía.

## Funcionando

- `CLAUDE.md` global creado.
- Documentos de roles creados (`docs/roles/01..04`).
- Estructura de contexto compartido sembrada (skills, docs y contratos en borrador).

## En desarrollo

- Contratos compartidos en estado `DRAFT` (pendientes de congelar).

## Bloqueos

- Contratos pendientes de congelar; no iniciar implementación dependiente hasta entonces.
- Credenciales externas pendientes (Supabase, Mapbox, Google OAuth, proveedor SMS, Railway).

## Servicios desplegados

- Ninguno. Supabase no configurado. Vision API no inicializada. Sin despliegues públicos.

## Integraciones pendientes

- Aplicación móvil no inicializada (Expo).
- Vision API no inicializada (FastAPI).
- Supabase no configurado (esquema, RLS, Auth, Storage, Realtime).
- APK inexistente.

## Próximo checkpoint

- Congelar los cinco contratos en `docs/contracts/`.
- Inicializar la app Expo y el servicio FastAPI en sus ramas.
- Configurar el proyecto Supabase y la migración inicial.

# Estado del proyecto — Huella SOS

## Última actualización

2026-06-20 — Migraciones iniciales y RLS creados (rama `feat/auth-chat-supabase`).

## Build estable

Ninguno. No existe APK todavía.

## Funcionando

- `CLAUDE.md` global creado (incluye jerarquía de instrucciones y lista de skills).
- Documentos de roles creados (`docs/roles/01..04`).
- Skills creadas: `/start-task`, `/handoff`, `/contract-change`, `/release-check`.
- `docs/architecture.md`, `docs/decisions.md`, `docs/qa-checklist.md` y `docs/demo-script.md` creados.
- Los cinco contratos en `docs/contracts/` existen (FROZEN FOR MVP).
- **`supabase/migrations/` creado** — tres migraciones reproducibles:
  - `000001_initial_schema.sql` — 10 tablas, 4 enums, índices, constraints.
  - `000002_rls_policies.sql` — RLS habilitado en todas las tablas + políticas Storage.
  - `000003_triggers.sql` — trigger de perfil automático + trigger de owner en case_members.
- `supabase/seed.sql` — bucket `report-images` + org de demo.
- `supabase/config.toml` — config CLI de Supabase (deep link `huellasos://auth/callback`).

## En desarrollo

- `feat/auth-chat-supabase`: cliente Supabase JS + tipos TypeScript + servicio auth (pendiente de Expo init).
- `feat/mapbox-gps`: mapa base (pendiente de Expo init).

## Bloqueos

- `apps/mobile/` no inicializado — ninguna rama ha corrido `create-expo-app` todavía.
- Credenciales externas pendientes (Supabase project URL + anon key, Mapbox tokens, Google OAuth, SMS).
- Supabase project en la nube sin crear (migraciones listas para aplicar con `supabase db push`).

## Servicios desplegados

- Ninguno. Supabase no desplegado. Vision API no inicializada. Sin despliegues públicos.

## Integraciones pendientes

- Aplicación móvil no inicializada (Expo) — coordinación entre Persona 1 y Persona 2.
- Vision API no inicializada (FastAPI / Railway).
- Supabase project en la nube pendiente de crear y aplicar migraciones.
- APK inexistente.

## Próximo checkpoint

- Crear proyecto Supabase en la nube y aplicar las tres migraciones.
- Inicializar `apps/mobile/` con Expo (cualquier rama que lo haga primero).
- Persona 2: implementar `supabase.ts`, `database.ts` y `auth.service.ts` tras el init.

# Estado del proyecto — Huella SOS

## Última actualización

2026-06-20 — App Expo inicializada con navegación base y formulario de reporte (UI mock, sin servicios) en rama `feat/reports-integration-release` (Rol 4).

## Build estable

Ninguno. No existe APK todavía.

## Funcionando

- `CLAUDE.md` global creado (incluye jerarquía de instrucciones y lista de skills).
- Documentos de roles creados (`docs/roles/01..04`).
- Skills creadas: `/start-task`, `/handoff`, `/contract-change`, `/release-check`.
- `docs/architecture.md`, `docs/decisions.md`, `docs/qa-checklist.md` y `docs/demo-script.md` creados.
- Los cinco contratos en `docs/contracts/` existen y están `FROZEN FOR MVP`.
- **App móvil inicializada** (`apps/mobile`): Expo SDK 56 + Expo Router + TypeScript estricto. `tsc --noEmit` pasa; el bundle Android (`expo export`) compila.
- **Navegación base** (Rol 4): Stack raíz, home placeholder (lista de reportes), `report/new` (formulario), `report/[id]` (stub de detalle).
- **Formulario de reporte (UI mock)**: tipo/título/descripción/especie/atributos, ubicación de solo lectura (sin elegir/editar/arrastrar), placeholder de imagen. Estados vacío/validación/enviando/éxito/error.
- **Desacople por contrato**: tipos en `src/types/` y `reportService` (mock) calcados de `mobile-data-access.md`; la UI no toca Supabase directamente.
- `app.config.ts` con scheme `huellasos`, `android.package = mx.huellasos.app` y variables públicas declaradas (vacías).
- `.npmrc` con `legacy-peer-deps=true` (React 19 vs peers de expo-router web).

## En desarrollo

- Conexión de servicios reales detrás de `reportService` (Supabase — Rol 2), captura GPS real (Rol 1) y carga de imagen (Rol 4).

## Bloqueos

- Credenciales externas pendientes (Supabase, Mapbox, Google OAuth, proveedor SMS, Railway).
- **Node local por debajo del mínimo de SDK 56**: se requiere Node ≥20.19.4 (o ≥22.13) para `expo start`/EAS. El equipo debe `nvm install 22.22.2`. El bundle compiló en 20.12.2 pero con aviso de versión no soportada.

## Servicios desplegados

- Ninguno. Supabase no configurado. Vision API no inicializada. Sin despliegues públicos.

## Integraciones pendientes

- Vision API no inicializada (FastAPI).
- Supabase no configurado (esquema, RLS, Auth, Storage, Realtime).
- APK inexistente.

## Próximo checkpoint

- Rol 2: configurar Supabase (esquema, RLS, Auth) e implementar `reportService` real detrás de la interfaz existente.
- Rol 1: integrar Mapbox en `app/index.tsx` y conectar `getCurrentReportLocation()` en el formulario.
- Rol 3: inicializar la Vision API (FastAPI) y desplegar en Railway.
- Rol 4: conectar captura de imagen (`expo-image-picker`), configurar `eas.json` y alinear Node ≥20.19.4 antes del primer development build.

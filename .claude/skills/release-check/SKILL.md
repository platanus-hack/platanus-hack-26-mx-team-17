---
name: release-check
description: Verificación previa al release. Lee estado, QA y demo; revisa APK, servicios públicos, secretos, URLs localhost, Mapbox, Supabase, FastAPI, chat, Realtime y tracking. Devuelve READY o NOT READY. No genera el release.
disable-model-invocation: true
---

# /release-check

Verificación manual de preparación para entregar el APK. **No generes el release automáticamente.** La autoridad de release es exclusiva de Persona 4.

## Pasos

1. **Lee el contexto de entrega:**
   - `docs/status.md`
   - `docs/qa-checklist.md`
   - `docs/demo-script.md`
2. **Verifica el APK:**
   - Es un APK instalable sin Expo Go (development client / build EAS).
   - Mapbox renderiza dentro del APK (no queda en blanco).
   - La sesión persiste tras reabrir.
3. **Verifica servicios públicos:**
   - Supabase accesible públicamente.
   - Vision API (FastAPI) desplegada en Railway: `GET /health` con `model_loaded: true`.
   - No existen URLs `localhost` ni `127.0.0.1` en el APK ni en la config.
4. **Verifica seguridad:**
   - Sólo variables `EXPO_PUBLIC_*` permitidas en el cliente.
   - Ninguna service role key, secret key, contraseña o token secreto en el cliente, logs o commits.
   - RLS activa en todas las escrituras de Supabase.
5. **Verifica flujos clave:**
   - Invitado puede leer; acción protegida pide autenticación.
   - Creación de reporte sólo con GPS actual.
   - Matches de DINOv2 se presentan como compatibilidad 0–100.
   - Chat privado por caso funciona en dos dispositivos.
   - Realtime de reportes/mensajes funciona.
   - Tracking inicia, se ve en otro teléfono y se detiene al resolver.
6. **Devuelve un veredicto explícito:** `READY` o `NOT READY`, con la lista de bloqueos pendientes si aplica.

## Restricciones

- No generes builds ni publiques el APK.
- No cambies `versionCode` ni credenciales EAS.
- No hagas commit ni push.

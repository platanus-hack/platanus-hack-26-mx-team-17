# Arquitectura — Huella SOS

## Objetivo del producto

APK Android para **reportar, localizar, comparar y coordinar rescates de animales**. Los invitados leen reportes públicos; toda escritura requiere cuenta. La IA sugiere candidatos visualmente compatibles (compatibilidad 0–100), nunca confirma identidad.

## Flujo esencial

```text
EXPLORAR → AUTENTICARSE → REPORTAR → LOCALIZAR → COMPARAR → VALIDAR → CONVERSAR → RASTREAR → RESOLVER
```

## Diagrama de componentes

```text
┌─────────────────────────────┐
│      App móvil (Expo / RN)   │
│  Expo Router · TypeScript    │
│  @rnmapbox/maps · location   │
└──────────┬──────────┬────────┘
           │          │
   (directo)│          │ (JWT)
           ▼          ▼
┌──────────────────┐  ┌──────────────────────┐
│     Supabase     │  │  Vision API (FastAPI) │
│  Auth · Postgres │◄─┤  Railway (público)    │
│  Storage · RLS   │  │  DINOv2-small · Torch │
│  Realtime        │  │  embeddings · cosine  │
└──────────────────┘  └──────────────────────┘
```

La app móvil habla **directamente** con Supabase para auth, reportes, Storage, chat, tracking y Realtime. FastAPI sólo procesa visión.

## Responsabilidad de cada componente

- **App móvil:** UI, navegación, captura GPS, render de mapa, suscripciones Realtime, llamada a Vision API.
- **Supabase:** identidad, datos, archivos, tiempo real y seguridad (RLS).
- **Vision API (FastAPI):** valida JWT, descarga la imagen del reporte, genera embeddings, busca candidatos, calcula scores, guarda matches y crea eventos de procesamiento. **No** maneja auth, chat ni tracking.

## Flujo de invitado

El invitado abre la app sin sesión, ve el mapa y los reportes públicos (sólo lectura). Cualquier acción de escritura intercepta el intento, guarda la acción pendiente y solicita autenticación.

## Flujo de autenticación

Tres métodos: correo y contraseña, Google OAuth y teléfono con OTP. Scheme `huellasos`, callback `huellasos://auth/callback`. Tras autenticarse, se reanuda la acción pendiente. Ver `contracts/auth-deeplinks.md`.

## Creación de reporte (sólo GPS actual)

El reporte se crea **únicamente** con la ubicación GPS actual del dispositivo. No se permite elegir, editar ni arrastrar la ubicación. Se valida precisión y antigüedad de la lectura; se guarda con timestamp.

## Flujo de DINOv2

Al crear/actualizar un reporte con imagen, la app llama `POST /v1/reports/{report_id}/process`. FastAPI genera el embedding (DINOv2-small, normalizado), filtra candidatos, calcula similitud coseno + score compuesto, guarda el top 3 en `matches` (idempotente) y registra el evento. Resultado: compatibilidad 0–100. Ver `contracts/vision-api.md`.

## Flujo de chat

Chat de **texto** privado por caso. Sólo `case_members` pueden leer y escribir. Mensajes persistidos en `messages` y entregados por Realtime. Sin multimedia. Ver `contracts/realtime-events.md`.

## Flujo de tracking

El tracking GPS existe **sólo durante una sesión activa de rescate**. Inicio, pausa, reanudación y fin actualizan `tracking_sessions`; los puntos van a `tracking_points`. La última posición del rescatista es visible para miembros del caso vía Realtime sobre `tracking_sessions` (no sobre `tracking_points`).

## Información pública vs. privada

- **Pública:** reportes públicos y sus imágenes, ubicación del reporte, estado.
- **Privada:** mensajes del caso, membresía, puntos de tracking, datos de perfil sensibles. Protegida por RLS.

## Despliegue público

Todos los servicios deben estar desplegados públicamente: Supabase gestionado, Vision API en Railway. El APK final **no** puede contener `localhost`. Cliente sólo usa variables `EXPO_PUBLIC_*`.

## Límites técnicos y de confianza

- Sólo Android; APK instalable sin Expo Go; sin Play Store.
- Sin iOS, pagos, push, panel admin, adopciones, clasificación médica ni chat multimedia.
- La IA sugiere compatibilidad, no identidad.
- El cliente nunca porta secretos; toda escritura pasa por RLS.
- FastAPI nunca asume lógica de auth, chat o tracking.

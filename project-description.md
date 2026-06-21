# Huella SOS

**Reporta, localiza y coordina el rescate de mascotas perdidas con IA visual y GPS en tiempo real.**

## El problema

Cada día miles de mascotas se pierden o son abandonadas. Las personas que las encuentran no tienen una forma rápida de conectarse con sus dueños, y los reportes en redes sociales se pierden entre el ruido. No existe una herramienta que centralice los casos, compare visualmente a los animales y coordine el rescate en tiempo real.

## La solución

Huella SOS es una app Android que digitaliza todo el flujo de rescate de animales:

1. **Reportar** — Cualquier persona reporta un animal perdido, avistado, herido o abandonado. La ubicación se captura automáticamente por GPS; no se puede editar manualmente.
2. **Localizar** — Los reportes públicos aparecen en un mapa interactivo con filtros por tipo y estado.
3. **Comparar con IA** — El modelo DINOv2 (Facebook) genera embeddings visuales y calcula un score de compatibilidad (0–100) entre el animal del reporte y candidatos cercanos. La IA sugiere coincidencias; no confirma identidades.
4. **Coordinar** — Los miembros del caso tienen un chat privado y seguimiento GPS en tiempo real durante el rescate activo.
5. **Resolver** — El autor del reporte marca el caso como resuelto cuando la mascota es localizada.

## Stack técnico

- **App móvil**: Expo + React Native + TypeScript · Expo Router · Mapbox · Supabase JS
- **Backend IA**: FastAPI en Railway · DINOv2-small (PyTorch) · similitud coseno · embeddings normalizados
- **Infraestructura**: Supabase (Auth · PostgreSQL · Storage · Realtime · RLS) · EAS Build (APK Android)

## Características principales

- Autenticación por correo, Google OAuth y teléfono (OTP)
- Ubicación exclusiva por GPS actual (sin edición manual)
- Score de compatibilidad visual 0–100 (no probabilidad de identidad)
- Chat privado por caso con Supabase Realtime
- Seguimiento GPS solo durante sesión de rescate activa
- APK instalable en Android sin Expo Go ni Play Store

Rol

Responsable de Mapbox, geolocalización y seguimiento GPS.

Rama
feat/mapbox-gps
Objetivos
Integrar Mapbox en el APK.
Mostrar ubicación actual.
Renderizar reportes como marcadores.
Garantizar que los reportes usen la ubicación actual.
Implementar sesiones de seguimiento GPS.
Mostrar la última posición del rescatista en tiempo real.
Rutas bajo responsabilidad
apps/mobile/src/features/map/
apps/mobile/src/features/tracking/
apps/mobile/app/index.tsx
apps/mobile/app/report/[id]/tracking.tsx
No modificar sin coordinación
supabase/migrations/
services/vision-api/
apps/mobile/src/features/auth/
apps/mobile/src/features/chat/
apps/mobile/src/features/matches/
Contratos que debe leer
docs/contracts/database-schema.md
docs/contracts/mobile-data-access.md
docs/contracts/realtime-events.md
Entregables
Mapbox visible dentro de un development APK.
Ubicación actual del dispositivo.
Marcadores de reportes.
Centrado de cámara.
Creación de reportes restringida a GPS actual.
Validación de antigüedad y precisión.
Inicio, pausa, reanudación y finalización del tracking.
Actualización de tracking_sessions.
Marcador del rescatista visible para miembros del caso.
Criterios de aceptación
Mapbox funciona fuera de Expo Go.
El mapa no queda en blanco.
Un usuario no puede elegir coordenadas manualmente.
La ubicación guardada tiene precisión y timestamp.
Otro teléfono ve la última posición del rescatista.
Detener el rescate detiene la tarea de ubicación.
Resolver el caso finaliza el tracking.
Riesgos
Configuración nativa de Mapbox.
Token de descarga.
Permisos Android.
Background location.
Foreground service.
Tareas que dejan de ejecutarse al cerrar la aplicación.
Handoff esperado

Entregar a Persona 4:

getCurrentReportLocation()
startTracking(reportId)
pauseTracking(sessionId)
resumeTracking(sessionId)
stopTracking(sessionId)
subscribeToTracking(reportId, callback)

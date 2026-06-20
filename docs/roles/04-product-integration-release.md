Rol

Responsable de reportes, matches, integración, experiencia completa y release.

Rama
feat/reports-integration-release
Objetivos
Implementar el flujo principal.
Integrar los servicios de las otras tres personas.
Preparar el APK.
Ejecutar QA.
Preparar demo y respaldo.
Rutas bajo responsabilidad
apps/mobile/app/report/
apps/mobile/src/features/reports/
apps/mobile/src/features/matches/
apps/mobile/src/components/
apps/mobile/app.config.ts
apps/mobile/eas.json
docs/status.md
docs/qa-checklist.md
docs/demo-script.md
No modificar sin coordinación
services/vision-api/
supabase/migrations/
apps/mobile/src/features/map/
apps/mobile/src/features/tracking/
apps/mobile/src/features/auth/
apps/mobile/src/features/chat/
Contratos que debe leer

Debe leer todos los documentos de:

docs/contracts/
Entregables
Formulario de reporte.
Captura o selección de imagen.
Detalle del caso.
Línea de tiempo.
Pantalla de matches.
Aceptar o rechazar coincidencia.
Tomar caso.
Abrir chat.
Iniciar tracking.
Resolver caso.
Manejo de invitados.
Intercepción y recuperación de acción pendiente.
APK de desarrollo.
APK final.
QR o URL de descarga.
Pruebas en dos teléfonos.
Video de respaldo.
Guion de demo.
Criterios de aceptación
El flujo completo funciona en dos dispositivos.
No existen URLs localhost.
Mapbox funciona dentro del APK.
La sesión persiste.
Invitado puede explorar.
Acción protegida solicita autenticación.
Reporte aparece en tiempo real.
Match se presenta correctamente.
Chat funciona.
Tracking funciona.
Caso se resuelve.
APK se instala sin Expo Go.
Riesgos
Integraciones tardías.
Contratos inconsistentes.
Variables faltantes en EAS.
Deep links.
Permisos Android.
Builds lentos.
API pública caída durante la demo.
Autoridad de release

Persona 4 es la única responsable de:

Cambiar versionCode.
Generar builds finales.
Gestionar credenciales EAS.
Publicar el APK de demostración.
Declarar el commit de release.

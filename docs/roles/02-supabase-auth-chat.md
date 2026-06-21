Rol

Responsable de Supabase, autenticación, seguridad, Storage, Realtime y chat.

Rama
feat/auth-chat-supabase
Objetivos
Implementar esquema y migraciones.
Configurar RLS.
Implementar los tres métodos de autenticación.
Implementar modo invitado de lectura pública.
Implementar Storage.
Implementar miembros y chat por caso.
Proveer servicios de datos al resto de la aplicación.
Rutas bajo responsabilidad
supabase/
apps/mobile/src/features/auth/
apps/mobile/src/features/chat/
apps/mobile/src/lib/supabase.ts
apps/mobile/src/services/
apps/mobile/src/types/database.ts
No modificar sin coordinación
services/vision-api/
apps/mobile/src/features/map/
apps/mobile/src/features/tracking/
apps/mobile/src/features/matches/
Contratos que debe leer
docs/contracts/database-schema.md
docs/contracts/mobile-data-access.md
docs/contracts/realtime-events.md
docs/contracts/auth-deeplinks.md
Entregables
Migración inicial.
Seed reproducible.
Lectura pública de reportes.
Escritura sólo para usuarios autenticados.
Correo y contraseña.
Google OAuth.
Teléfono con OTP.
Persistencia y cierre de sesión.
Carga de imágenes.
case_members.
Chat persistente.
Realtime de mensajes y reportes.
Criterios de aceptación
Invitado puede leer, pero no insertar.
Correo funciona.
Google regresa al APK.
OTP crea una sesión.
Ninguna llave secreta está en el cliente.
Sólo miembros del caso pueden leer mensajes.
Un usuario no puede enviar mensajes con otro sender_id.
Las migraciones recrean el esquema.
Riesgos
Redirect URL de Google.
Deep link Android.
Proveedor SMS.
RLS demasiado permisiva o restrictiva.
Storage público versus privado.
Tipos desactualizados.
Handoff esperado

Entregar al equipo:

getPublicReports()
getReportById(id)
createReport(input)
uploadReportImage(input)
updateReportStatus(input)
subscribeToReports(callback)

getCaseMessages(reportId)
sendCaseMessage(reportId, body)
subscribeToCaseMessages(reportId, callback)
joinCase(reportId)

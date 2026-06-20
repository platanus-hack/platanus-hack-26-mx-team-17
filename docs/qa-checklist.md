# QA Checklist — Huella SOS

Marca cada ítem antes de declarar el release. Probar siempre contra servicios públicos.

## APK

- [ ] El APK se instala en Android sin Expo Go.
- [ ] La app abre sin crash en frío.
- [ ] No contiene URLs `localhost` ni `127.0.0.1`.
- [ ] La sesión persiste tras cerrar y reabrir.

## Invitados

- [ ] El invitado abre el mapa y ve reportes públicos.
- [ ] El invitado puede leer el detalle de un reporte.
- [ ] El invitado no puede insertar ni escribir nada.
- [ ] Una acción protegida intercepta y solicita autenticación.

## Auth

- [ ] Correo y contraseña funciona.
- [ ] Google OAuth regresa al APK (`huellasos://auth/callback`).
- [ ] Teléfono con OTP crea una sesión.
- [ ] La acción pendiente se reanuda tras iniciar sesión.
- [ ] Cierre de sesión funciona.

## Mapbox

- [ ] El mapa renderiza dentro del APK (no queda en blanco).
- [ ] Se muestra la ubicación actual del dispositivo.
- [ ] Los reportes aparecen como marcadores.
- [ ] La cámara se centra correctamente.

## Reportes

- [ ] El reporte se crea sólo con GPS actual.
- [ ] No se puede elegir, editar ni arrastrar la ubicación.
- [ ] Se valida precisión y antigüedad de la lectura.
- [ ] La imagen se sube a Storage.
- [ ] El reporte guarda timestamp y coordenadas precisas.

## IA (Vision API)

- [ ] `GET /health` responde con `model_loaded: true`.
- [ ] `POST /v1/reports/{id}/process` devuelve top 3 candidatos.
- [ ] Los resultados se muestran como compatibilidad 0–100, no identidad.
- [ ] Procesar dos veces no duplica matches (idempotencia).
- [ ] El animal objetivo aparece en el top 3 con el dataset de prueba.

## Chat

- [ ] Sólo miembros del caso leen los mensajes.
- [ ] Un usuario no puede enviar mensajes con otro `sender_id`.
- [ ] Los mensajes persisten.
- [ ] El chat funciona en dos dispositivos a la vez.

## Realtime

- [ ] Un reporte nuevo aparece en tiempo real en otro teléfono.
- [ ] Los mensajes del caso llegan en tiempo real.
- [ ] Las actualizaciones del caso (`report_updates`) se reflejan.

## Tracking

- [ ] El tracking inicia sólo durante un rescate activo.
- [ ] Pausa, reanudación y fin actualizan `tracking_sessions`.
- [ ] Otro teléfono ve la última posición del rescatista.
- [ ] Detener el rescate detiene la tarea de ubicación.
- [ ] Resolver el caso finaliza el tracking.

## RLS y seguridad

- [ ] RLS activa en todas las tablas con escritura.
- [ ] Ningún secreto en el cliente (sólo `EXPO_PUBLIC_*`).
- [ ] Ninguna service role key ni secret key en el APK, logs o commits.
- [ ] El cliente nunca envía service role key a la Vision API.

## Servicios públicos

- [ ] Supabase accesible públicamente.
- [ ] Vision API desplegada en Railway y accesible.
- [ ] Mapbox descarga estilos con token público.

## Demo en dos dispositivos

- [ ] El flujo completo corre en dos teléfonos.
- [ ] Reporte creado en un teléfono se ve en el otro.
- [ ] Match, chat y tracking funcionan entre ambos.
- [ ] Existe video de respaldo de la demo.

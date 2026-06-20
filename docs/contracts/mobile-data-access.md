STATUS: FROZEN FOR MVP

# Contrato — Acceso a datos desde la app móvil

Firmas **conceptuales** de los servicios/repositorios que la app usa. Los componentes visuales **no** llaman a Supabase directamente: todo pasa por estos servicios. Tipos en `apps/mobile/src/types/`. Propiedad de las firmas: Persona 2 (datos), Persona 1 (tracking), Persona 4 (vision matching). Cambios vía `/contract-change`.

Convenciones de error (todas las funciones pueden devolver):

- `UNAUTHENTICATED` — se requiere sesión.
- `FORBIDDEN` — RLS niega la operación.
- `NOT_FOUND` — recurso inexistente.
- `VALIDATION` — input inválido.
- `NETWORK` — fallo de red / servicio.
- `UNKNOWN` — error no clasificado.

Los servicios manejan explícitamente estados de carga, éxito, error y vacío.

---

## Auth

```text
signInWithEmail(email, password) -> Session
  errors: VALIDATION, UNAUTHENTICATED, NETWORK

signUpWithEmail(email, password, displayName) -> Session
  errors: VALIDATION, NETWORK

signInWithGoogle() -> Session            # OAuth, regresa vía huellasos://auth/callback
  errors: cancelled, NETWORK

requestPhoneOtp(phone) -> { sent: true }
  errors: VALIDATION, NETWORK

verifyPhoneOtp(phone, code) -> Session
  errors: VALIDATION, UNAUTHENTICATED, NETWORK

getSession() -> Session | null           # sesión persistida
signOut() -> void
```

## Reportes

```text
getPublicReports(filter?) -> Report[]          # lectura pública (invitado permitido)
  filter: { type?, status?, bbox?, since? }
  errors: NETWORK

getReportById(id) -> Report                    # lectura pública si is_public
  errors: NOT_FOUND, NETWORK

createReport(input) -> Report                  # requiere sesión
  input: { type, title, description?, species?, attributes?,
           location: { lat, lng, accuracy_m, captured_at } }  # SÓLO GPS actual
  errors: UNAUTHENTICATED, VALIDATION (ubicación ausente/imprecisa), NETWORK

updateReportStatus(input) -> Report
  input: { reportId, status }
  errors: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, NETWORK
```

## Storage

```text
uploadReportImage(input) -> ReportImage
  input: { reportId, fileUri, isPrimary? }     # imagen capturada/seleccionada
  output: { id, storagePath, isPrimary }
  errors: UNAUTHENTICATED, FORBIDDEN, VALIDATION (tamaño/formato), NETWORK

getReportImageUrl(storagePath) -> string       # URL pública/firmada según visibilidad
  errors: NOT_FOUND, NETWORK
```

## Membresía de casos

```text
joinCase(reportId) -> CaseMember               # requiere sesión
  errors: UNAUTHENTICATED, NOT_FOUND, NETWORK

getCaseMembers(reportId) -> CaseMember[]        # sólo miembros
  errors: UNAUTHENTICATED, FORBIDDEN, NETWORK

takeCase(reportId) -> CaseMember               # asigna rol rescuer
  errors: UNAUTHENTICATED, FORBIDDEN, NETWORK
```

## Chat

```text
getCaseMessages(reportId) -> Message[]          # sólo miembros del caso
  errors: UNAUTHENTICATED, FORBIDDEN, NETWORK

sendCaseMessage(reportId, body) -> Message      # sender_id = usuario actual (no suplantable)
  errors: UNAUTHENTICATED, FORBIDDEN, VALIDATION (body vacío), NETWORK

subscribeToCaseMessages(reportId, callback) -> Unsubscribe
  callback(message)                             # Realtime INSERT en messages
```

## Tracking

```text
startTracking(reportId) -> TrackingSession      # crea sesión active
  errors: UNAUTHENTICATED, FORBIDDEN, NETWORK

pauseTracking(sessionId) -> TrackingSession     # status -> paused
resumeTracking(sessionId) -> TrackingSession    # status -> active
stopTracking(sessionId) -> TrackingSession      # status -> finished, ended_at set
  errors: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, NETWORK

getCurrentReportLocation() -> { lat, lng, accuracy_m, captured_at }
  # ubicación actual del dispositivo (para crear reporte). SÓLO GPS actual.
  errors: PERMISSION_DENIED, LOCATION_UNAVAILABLE, TIMEOUT

subscribeToTracking(reportId, callback) -> Unsubscribe
  callback({ sessionId, status, lastLat, lastLng, lastPointAt })
  # Realtime sobre tracking_sessions (NO tracking_points)
```

## Vision matching

```text
requestReportProcessing(reportId) -> { accepted: true }
  # invoca POST /v1/reports/{reportId}/process con el JWT de Supabase
  errors: UNAUTHENTICATED, NOT_FOUND, TIMEOUT, NETWORK

getMatches(reportId) -> Match[]                 # top 3, compatibilidad 0–100
  errors: UNAUTHENTICATED, FORBIDDEN, NETWORK

setMatchStatus(matchId, status) -> Match        # source_accepted / source_rejected
  errors: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, NETWORK

subscribeToMatches(reportId, callback) -> Unsubscribe
  callback(match)                               # Realtime INSERT/UPDATE en matches
```

STATUS: FROZEN FOR MVP

# Contrato — Autenticación y deep links

Tres métodos de autenticación sobre Supabase Auth, con manejo de deep links para Android. Propiedad: Persona 2. Cambios vía `/contract-change`.

Reglas de producto:
- Invitados leen reportes públicos sin sesión.
- Toda escritura requiere cuenta permanente.

## Scheme y callback

- **Scheme:** `huellasos`
- **Callback OAuth/redirect:** `huellasos://auth/callback`
- Registrado en `app.config.ts` (Expo) y en la configuración de redirect de Supabase Auth y Google.

---

## Métodos

### Correo y contraseña

- **Registro:** email + password + display_name → crea usuario y `profiles`.
- **Login:** email + password → sesión.
- **Errores:** credenciales inválidas, email ya registrado, password débil, red.

### Google OAuth

- Inicia el flujo OAuth de Google vía Supabase.
- Tras autorizar, Google/Supabase redirige a `huellasos://auth/callback`; la app intercambia el código por sesión.
- **Requisitos:** redirect URL configurada en Google Cloud y en Supabase; deep link Android registrado.
- **Errores:** `cancelled` (el usuario cancela), redirect mal configurada, red.

### Teléfono OTP

- `requestPhoneOtp(phone)` envía un código por SMS (proveedor configurado en Supabase).
- `verifyPhoneOtp(phone, code)` valida el código y crea sesión.
- **Errores:** número inválido, código incorrecto/expirado, límite de envíos, fallo del proveedor SMS.

## Persistencia de sesión

- La sesión se persiste de forma segura en el dispositivo y se restaura al abrir la app (`getSession()`).
- Refresh automático del token mientras sea válido.
- `signOut()` limpia la sesión local.

## Acción pendiente después de login

- Cuando un invitado intenta una acción protegida (crear reporte, unirse al caso, enviar mensaje, iniciar tracking), la app:
  1. Guarda la **acción pendiente** (tipo + parámetros) antes de redirigir a auth.
  2. Lanza el flujo de autenticación.
  3. Al volver con sesión válida (incluido el regreso por deep link), **reanuda** la acción pendiente automáticamente.
- Si la autenticación se cancela o falla, la acción pendiente se descarta y se informa al usuario.

## Cancelaciones y errores

- **Cancelación de OAuth:** volver a la pantalla previa sin sesión; no romper el estado.
- **Deep link no recibido / app reabierta:** intentar recuperar la sesión; si no, pedir reintento.
- **Errores de red:** mensaje claro y opción de reintento; no exponer detalles del proveedor.
- Manejar estados de carga, éxito, error y vacío en toda pantalla de auth.

## Variables públicas (cliente)

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`
- `EXPO_PUBLIC_VISION_API_URL`

## Secretos (NUNCA en el cliente)

- Supabase service role / secret key
- Contraseña de PostgreSQL
- Token secreto de Mapbox
- Google Client Secret
- Credenciales del proveedor SMS
- Tokens de Railway

No leer, imprimir, registrar ni incluir secretos en commits.

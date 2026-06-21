# Guion de demo — Huella SOS (máx. 3 minutos)

Dos teléfonos: **Teléfono A** (dueña de Luna) y **Teléfono B** (rescatista que avista). Probar siempre contra servicios públicos.

## Preparación previa

- [ ] APK instalado en ambos teléfonos (sin Expo Go).
- [ ] Ambos teléfonos con datos/WiFi estable y permisos de ubicación y cámara concedidos.
- [ ] Supabase, Vision API (Railway) y Mapbox accesibles públicamente.
- [ ] **Calentar la Vision API** con `GET /health` (`model_loaded: true`) justo antes de empezar para evitar cold start.
- [ ] Cuentas de prueba listas (una por teléfono) o método de auth elegido funcionando.
- [ ] Video de respaldo de la demo grabado y a la mano.

## Datos de prueba

- Dataset de candidatos precargado que **garantice** que Luna aparezca en el top 3.
- Foto de Luna lista en el Teléfono A; foto del avistamiento (misma mascota) lista en el Teléfono B.
- Ubicaciones de prueba cercanas entre sí para que el componente geográfico aporte al score.

## Responsables durante la presentación

- **Persona 4 (narra y conduce):** maneja el Teléfono A y el discurso.
- **Persona 1:** maneja el Teléfono B (avistamiento + tracking) y vigila el mapa.
- **Persona 2:** monitorea Supabase/Realtime y auth; listo para diagnosticar.
- **Persona 3:** monitorea la Vision API (logs/health); listo para reprocesar.

## Guion (paso a paso)

| # | Paso | Quién | Resultado esperado |
|---|------|-------|--------------------|
| 1 | Abrir la app y explorar el mapa con reportes públicos | A (invitado) | Mapbox renderiza; marcadores visibles sin sesión |
| 2 | Intentar crear un reporte | A (invitado) | La app intercepta y solicita autenticación (acción pendiente guardada) |
| 3 | Autenticarse (correo / Google / OTP) | A | Vuelve al APK; la acción pendiente se reanuda |
| 4 | Reportar a **Luna** con foto y **GPS actual** | A | Reporte creado sólo con ubicación actual; imagen en Storage |
| 5 | Crear un **avistamiento** con foto desde el otro teléfono | B | El avistamiento aparece en tiempo real en el mapa de A |
| 6 | DINOv2 procesa y devuelve **candidatos** | — | Top 3 con compatibilidad 0–100; Luna aparece como candidata |
| 7 | Aceptar la coincidencia | A | Match validado por una persona (no por la IA) |
| 8 | Abrir el **chat** del caso | A y B | Chat de texto privado entre miembros, en tiempo real |
| 9 | Tomar el caso | B | B queda como rescatista del caso |
| 10 | Iniciar **tracking** GPS | B | A ve la última posición de B en tiempo real |
| 11 | **Resolver** el caso | A o B | El tracking finaliza; el caso se marca resuelto |

## Contingencias

- **Si falla la IA (sin candidatos / timeout / cold start):**
  - Reintentar `GET /health` y reprocesar con `force=true`.
  - Si persiste, mostrar matches ya persistidos de una corrida previa o cambiar al video de respaldo en el paso 6.
- **Si falla Realtime (no aparece el avistamiento / chat no llega):**
  - Refrescar manualmente la pantalla (los datos siguen en Supabase).
  - Continuar narrando con recarga manual; recurrir al video si no se recupera.
- **Si falla el tracking (no se ve la posición):**
  - Verificar permisos de ubicación y que la sesión esté `active`.
  - Mostrar la última posición persistida en `tracking_sessions`; si no, usar el video para los pasos 10–11.
- **Regla general:** nunca improvisar contra `localhost`; si un servicio público cae, pasar al video de respaldo y seguir el discurso.

## Notas

- Mantener la demo por debajo de 3 minutos: un solo recorrido limpio del flujo esencial.
- No mostrar credenciales ni secretos en pantalla durante la presentación.

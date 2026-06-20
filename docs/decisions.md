# Registro de decisiones — Huella SOS

Decisiones de arquitectura y producto. No revertir sin acuerdo del equipo.

| ID | Fecha | Decisión | Razón | Responsable | Estado |
|------|------------|----------|-------|-------------|--------|
| D-001 | 2026-06-20 | Usar **Mapbox** (`@rnmapbox/maps`) como motor de mapas | Render nativo confiable fuera de Expo Go; marcadores y cámara | Persona 1 | Aceptada |
| D-002 | 2026-06-20 | Usar **Supabase** (Auth, Postgres, Storage, Realtime, RLS) como backend principal | Backend integrado y desplegado; la app habla directo sin servidor intermedio | Persona 2 | Aceptada |
| D-003 | 2026-06-20 | **Invitados sin sesión, sólo lectura**; escritura requiere cuenta | Permitir exploración pública protegiendo integridad de datos vía RLS | Persona 2 | Aceptada |
| D-004 | 2026-06-20 | **DINOv2-small preentrenado** para embeddings visuales (sin fine-tuning) | Suficiente para compatibilidad visual en MVP; corre sin GPU | Persona 3 | Aceptada |
| D-005 | 2026-06-20 | **FastAPI público** en Railway para la Vision API | Aislar inferencia pesada; endpoint público con validación de JWT | Persona 3 | Aceptada |
| D-006 | 2026-06-20 | **Chat de texto por caso** entre miembros (`case_members`) | Coordinación privada del rescate; sin multimedia en alcance P0 | Persona 2 | Aceptada |
| D-007 | 2026-06-20 | **Tracking GPS sólo durante una sesión activa de rescate** | Privacidad y batería; la posición sólo vive mientras hay rescate | Persona 1 | Aceptada |
| D-008 | 2026-06-20 | **Android APK con EAS Build**, instalable sin Expo Go | Entregable exigido; sin Play Store ni iOS | Persona 4 | Aceptada |

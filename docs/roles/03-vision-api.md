Rol

Responsable del servicio de IA visual y su despliegue público.

Rama
feat/vision-api
Objetivos
Construir FastAPI.
Cargar DINOv2 Small preentrenado.
Generar embeddings.
Calcular candidatos.
Guardar matches.
Desplegar en Railway.
Preparar datos y pruebas de demostración.
Rutas bajo responsabilidad
services/vision-api/
No modificar sin coordinación
apps/mobile/
supabase/migrations/

Si necesita un cambio de esquema, debe solicitarlo a Persona 2.

Contratos que debe leer
docs/contracts/database-schema.md
docs/contracts/vision-api.md
Entregables
GET /health.
POST /v1/reports/{id}/process.
Validación de JWT.
Descarga de imagen.
Preprocesamiento.
Embedding DINOv2.
Normalización.
Filtro de candidatos.
Score compuesto.
Top 3.
Persistencia idempotente.
Dockerfile.
Railway público.
Dataset de prueba.
Criterios de aceptación
El servicio arranca sin GPU.
model_loaded es verdadero.
Procesar dos veces no duplica matches.
El animal objetivo aparece en top 3.
El servicio no expone secretos.
El cliente nunca envía una service role key.
La respuesta respeta el contrato documentado.
Riesgos
Memoria insuficiente.
Cold start.
Tiempo de descarga del modelo.
Imágenes rotadas.
Imágenes demasiado grandes.
Falsos positivos.
Secretos en logs.
Handoff esperado

Entregar a Persona 4:

GET /health
POST /v1/reports/{report_id}/process

También debe entregar ejemplos de request, response y errores.

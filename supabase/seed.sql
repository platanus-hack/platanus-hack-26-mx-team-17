-- =============================================================================
-- Seed — Solo para desarrollo local (supabase start)
-- NO ejecutar en producción.
-- =============================================================================

-- Bucket de imágenes de reportes
-- Las imágenes se guardan con ruta: report-images/{report_id}/{filename}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-images',
  'report-images',
  false,           -- privado; se usan signed URLs o policies de storage
  52428800,        -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Organización de ejemplo para pruebas locales
INSERT INTO organizations (id, name, contact_email)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Refugio Demo CDMX',
  'demo@huellasos.dev'
)
ON CONFLICT (id) DO NOTHING;

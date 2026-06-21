-- =============================================================================
-- Migration 002: Row Level Security — Huella SOS
--
-- Convenciones:
--   - service_role tiene BYPASSRLS: no necesita políticas explícitas para
--     operaciones reservadas a la Vision API (INSERT en matches, etc.).
--   - anon puede SELECT en datos públicos; toda escritura requiere sesión.
--   - case_members usa `user_id = auth.uid()` (no subquery recursiva).
--   - Las demás tablas usan EXISTS sobre case_members para verificar membresía.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Habilitar RLS en todas las tablas
-- ---------------------------------------------------------------------------

ALTER TABLE organizations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports           ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_images     ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_updates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_points   ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- organizations
-- Lectura pública del nombre; sin escritura de cliente en MVP.
-- ---------------------------------------------------------------------------

CREATE POLICY "organizations_select_public"
  ON organizations FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- profiles
-- Lectura pública (display_name, avatar_url — phone queda expuesto; riesgo
-- conocido de MVP, resolver post-hackathon con una vista).
-- Escritura solo del propio perfil.
-- ---------------------------------------------------------------------------

CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- reports
-- SELECT: público si is_public, o si el usuario es autor o miembro del caso.
-- INSERT: solo autenticado; author_id debe ser el usuario actual.
-- UPDATE: solo el autor del reporte.
-- DELETE: no permitido en MVP.
-- ---------------------------------------------------------------------------

CREATE POLICY "reports_select"
  ON reports FOR SELECT
  USING (
    is_public = true
    OR auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM case_members cm
      WHERE cm.report_id = reports.id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "reports_insert_authenticated"
  ON reports FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = author_id
  );

CREATE POLICY "reports_update_author"
  ON reports FOR UPDATE
  USING (auth.uid() = author_id);

-- ---------------------------------------------------------------------------
-- report_images
-- SELECT: heredado de la visibilidad del reporte padre.
-- INSERT: solo el autor del reporte.
-- ---------------------------------------------------------------------------

CREATE POLICY "report_images_select"
  ON report_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reports r
      WHERE r.id = report_images.report_id
        AND (
          r.is_public = true
          OR r.author_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM case_members cm
            WHERE cm.report_id = r.id
              AND cm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "report_images_insert_author"
  ON report_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reports r
      WHERE r.id = report_images.report_id
        AND r.author_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- report_updates
-- SELECT: público si el reporte es público; privado si es miembro del caso.
-- INSERT: miembros del caso (service_role inserta vía BYPASSRLS).
-- ---------------------------------------------------------------------------

CREATE POLICY "report_updates_select"
  ON report_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reports r
      WHERE r.id = report_updates.report_id
        AND (
          r.is_public = true
          OR r.author_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM case_members cm
            WHERE cm.report_id = r.id
              AND cm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "report_updates_insert_members"
  ON report_updates FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM case_members cm
      WHERE cm.report_id = report_updates.report_id
        AND cm.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- case_members
-- SELECT: cada usuario solo ve sus propias membresías (evita recursión).
-- INSERT: autenticado, solo puede añadirse a sí mismo.
-- UPDATE/DELETE: no permitido en MVP.
-- ---------------------------------------------------------------------------

CREATE POLICY "case_members_select_own"
  ON case_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "case_members_insert_self"
  ON case_members FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- messages
-- SELECT: solo miembros del caso.
-- INSERT: miembro del caso; sender_id debe ser el usuario actual.
-- ---------------------------------------------------------------------------

CREATE POLICY "messages_select_members"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM case_members cm
      WHERE cm.report_id = messages.report_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert_members"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM case_members cm
      WHERE cm.report_id = messages.report_id
        AND cm.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- matches
-- SELECT: autor del reporte fuente o miembro del caso.
-- INSERT: ningún cliente (service_role de Vision API usa BYPASSRLS).
-- UPDATE: autor del reporte fuente puede cambiar status a accepted/rejected.
-- ---------------------------------------------------------------------------

CREATE POLICY "matches_select"
  ON matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reports r
      WHERE r.id = matches.source_report_id
        AND (
          r.is_public = true
          OR r.author_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM case_members cm
            WHERE cm.report_id = r.id
              AND cm.user_id = auth.uid()
          )
        )
    )
  );

-- Sin política INSERT: ningún cliente puede insertar (service_role bypassa RLS).

CREATE POLICY "matches_update_author"
  ON matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM reports r
      WHERE r.id = matches.source_report_id
        AND r.author_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- tracking_sessions
-- SELECT: miembros del caso.
-- INSERT: rescatista autenticado que ya es miembro del caso.
-- UPDATE: solo el rescatista de la sesión.
-- ---------------------------------------------------------------------------

CREATE POLICY "tracking_sessions_select_members"
  ON tracking_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM case_members cm
      WHERE cm.report_id = tracking_sessions.report_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "tracking_sessions_insert_rescuer"
  ON tracking_sessions FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND rescuer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM case_members cm
      WHERE cm.report_id = tracking_sessions.report_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "tracking_sessions_update_rescuer"
  ON tracking_sessions FOR UPDATE
  USING (rescuer_id = auth.uid());

-- ---------------------------------------------------------------------------
-- tracking_points
-- SELECT: miembros del caso (via tracking_session → report).
-- INSERT: rescatista de la sesión.
-- ---------------------------------------------------------------------------

CREATE POLICY "tracking_points_select_members"
  ON tracking_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM tracking_sessions ts
      JOIN case_members cm ON cm.report_id = ts.report_id
      WHERE ts.id = tracking_points.session_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "tracking_points_insert_rescuer"
  ON tracking_points FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM tracking_sessions ts
      WHERE ts.id = tracking_points.session_id
        AND ts.rescuer_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: bucket report-images
-- Políticas sobre storage.objects para el bucket 'report-images'.
-- La ruta esperada es: report-images/{report_id}/{filename}
-- (storage.foldername extrae segmentos del path)
-- ---------------------------------------------------------------------------

CREATE POLICY "storage_report_images_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'report-images'
    AND EXISTS (
      SELECT 1 FROM reports r
      WHERE r.id = (storage.foldername(name))[1]::uuid
        AND (
          r.is_public = true
          OR r.author_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM case_members cm
            WHERE cm.report_id = r.id
              AND cm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "storage_report_images_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'report-images'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM reports r
      WHERE r.id = (storage.foldername(name))[1]::uuid
        AND r.author_id = auth.uid()
    )
  );

CREATE POLICY "storage_report_images_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'report-images'
    AND EXISTS (
      SELECT 1 FROM reports r
      WHERE r.id = (storage.foldername(name))[1]::uuid
        AND r.author_id = auth.uid()
    )
  );

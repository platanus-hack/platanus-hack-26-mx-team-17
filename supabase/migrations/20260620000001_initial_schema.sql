-- =============================================================================
-- Migration 001: Schema inicial — Huella SOS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE report_type AS ENUM (
  'lost',
  'sighting',
  'injured',
  'abandoned'
);

CREATE TYPE report_status AS ENUM (
  'open',
  'possible_match',
  'tracking',
  'rescue_in_progress',
  'resolved',
  'cancelled'
);

CREATE TYPE match_status AS ENUM (
  'suggested',
  'source_accepted',
  'source_rejected',
  'confirmed',
  'dismissed'
);

CREATE TYPE tracking_status AS ENUM (
  'active',
  'paused',
  'finished',
  'cancelled'
);

-- ---------------------------------------------------------------------------
-- Tabla: organizations
-- ---------------------------------------------------------------------------

CREATE TABLE organizations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  contact_email text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_organizations_name ON organizations (name);

-- ---------------------------------------------------------------------------
-- Tabla: profiles
-- FK → auth.users (gestionada por Supabase Auth)
-- ---------------------------------------------------------------------------

CREATE TABLE profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name    text        NOT NULL,
  phone           text,
  avatar_url      text,
  organization_id uuid        REFERENCES organizations (id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_organization_id ON profiles (organization_id);

-- ---------------------------------------------------------------------------
-- Tabla: reports
-- ---------------------------------------------------------------------------

CREATE TABLE reports (
  id                   uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id            uuid             NOT NULL REFERENCES profiles (id),
  type                 report_type      NOT NULL,
  status               report_status    NOT NULL DEFAULT 'open',
  title                text             NOT NULL,
  description          text,
  species              text,
  attributes           jsonb,
  lat                  double precision NOT NULL,
  lng                  double precision NOT NULL,
  location_accuracy_m  double precision NOT NULL,
  location_captured_at timestamptz      NOT NULL,
  organization_id      uuid             REFERENCES organizations (id),
  is_public            boolean          NOT NULL DEFAULT true,
  created_at           timestamptz      NOT NULL DEFAULT now(),
  updated_at           timestamptz      NOT NULL DEFAULT now(),

  CONSTRAINT reports_lat_range      CHECK (lat BETWEEN -90 AND 90),
  CONSTRAINT reports_lng_range      CHECK (lng BETWEEN -180 AND 180),
  CONSTRAINT reports_accuracy_pos   CHECK (location_accuracy_m > 0)
);

CREATE INDEX idx_reports_status     ON reports (status);
CREATE INDEX idx_reports_type       ON reports (type);
CREATE INDEX idx_reports_author_id  ON reports (author_id);
CREATE INDEX idx_reports_created_at ON reports (created_at DESC);
CREATE INDEX idx_reports_location   ON reports (lat, lng);

-- Actualiza updated_at automáticamente en cada UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER reports_set_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Tabla: report_images
-- ---------------------------------------------------------------------------

CREATE TABLE report_images (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    uuid        NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
  storage_path text        NOT NULL,
  is_primary   boolean     NOT NULL DEFAULT false,
  width        int,
  height       int,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_images_report_id ON report_images (report_id);
-- Solo puede haber una imagen primaria por reporte
CREATE UNIQUE INDEX idx_report_images_primary
  ON report_images (report_id)
  WHERE is_primary = true;

-- ---------------------------------------------------------------------------
-- Tabla: report_updates
-- ---------------------------------------------------------------------------

CREATE TABLE report_updates (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  uuid        NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
  author_id  uuid        REFERENCES profiles (id),   -- null si es del sistema/IA
  kind       text        NOT NULL,
  body       text,
  metadata   jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_updates_report_id  ON report_updates (report_id);
CREATE INDEX idx_report_updates_created_at ON report_updates (created_at);

-- ---------------------------------------------------------------------------
-- Tabla: case_members
-- ---------------------------------------------------------------------------

CREATE TABLE case_members (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  uuid        NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles (id),
  role       text        NOT NULL CHECK (role IN ('owner', 'rescuer', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT case_members_unique UNIQUE (report_id, user_id)
);

CREATE INDEX idx_case_members_report_id ON case_members (report_id);
CREATE INDEX idx_case_members_user_id   ON case_members (user_id);

-- ---------------------------------------------------------------------------
-- Tabla: messages
-- ---------------------------------------------------------------------------

CREATE TABLE messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  uuid        NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
  sender_id  uuid        NOT NULL REFERENCES profiles (id),
  body       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_report_created ON messages (report_id, created_at);

-- ---------------------------------------------------------------------------
-- Tabla: matches
-- ---------------------------------------------------------------------------

CREATE TABLE matches (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  source_report_id     uuid          NOT NULL REFERENCES reports (id),
  candidate_report_id  uuid          NOT NULL REFERENCES reports (id),
  status               match_status  NOT NULL DEFAULT 'suggested',
  compatibility        numeric(5,2)  NOT NULL,
  visual_score         numeric(5,2),
  geo_score            numeric(5,2),
  attribute_score      numeric(5,2),
  temporal_score       numeric(5,2),
  rank                 int,
  created_at           timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT matches_unique            UNIQUE (source_report_id, candidate_report_id),
  CONSTRAINT matches_compatibility     CHECK (compatibility BETWEEN 0 AND 100),
  CONSTRAINT matches_different_reports CHECK (source_report_id <> candidate_report_id)
);

CREATE INDEX idx_matches_source_report_id    ON matches (source_report_id);
CREATE INDEX idx_matches_candidate_report_id ON matches (candidate_report_id);
CREATE INDEX idx_matches_source_rank         ON matches (source_report_id, rank);

-- ---------------------------------------------------------------------------
-- Tabla: tracking_sessions
-- ---------------------------------------------------------------------------

CREATE TABLE tracking_sessions (
  id            uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     uuid             NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
  rescuer_id    uuid             NOT NULL REFERENCES profiles (id),
  status        tracking_status  NOT NULL DEFAULT 'active',
  last_lat      double precision,
  last_lng      double precision,
  last_point_at timestamptz,
  started_at    timestamptz      NOT NULL DEFAULT now(),
  ended_at      timestamptz
);

CREATE INDEX idx_tracking_sessions_report_id ON tracking_sessions (report_id);
CREATE INDEX idx_tracking_sessions_status    ON tracking_sessions (status);
-- A lo sumo una sesión activa por reporte
CREATE UNIQUE INDEX idx_tracking_sessions_active
  ON tracking_sessions (report_id)
  WHERE status = 'active';

-- ---------------------------------------------------------------------------
-- Tabla: tracking_points
-- ---------------------------------------------------------------------------

CREATE TABLE tracking_points (
  id          uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid             NOT NULL REFERENCES tracking_sessions (id) ON DELETE CASCADE,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  accuracy_m  double precision,
  recorded_at timestamptz      NOT NULL DEFAULT now()
);

CREATE INDEX idx_tracking_points_session_recorded ON tracking_points (session_id, recorded_at);

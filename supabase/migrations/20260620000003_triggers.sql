-- =============================================================================
-- Migration 003: Triggers de negocio — Huella SOS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Trigger: crear perfil automáticamente al registrarse
--
-- Al insertar en auth.users (registro por email, Google o OTP), esta función
-- crea la fila correspondiente en profiles.
-- display_name se lee de raw_user_meta_data (enviado por el cliente en signUp).
-- Si no hay display_name en metadata, se usa la parte local del email.
-- phone viene de auth.users.phone (caso OTP); puede ser null.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name, phone, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'full_name',  -- Google OAuth provee full_name
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    NEW.phone,
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------------------------
-- Trigger: añadir autor del reporte como owner en case_members
--
-- Al crear un reporte, el autor se convierte automáticamente en miembro
-- con rol 'owner'. Esto garantiza que el autor siempre tenga acceso al
-- chat y al tracking del caso, sin depender del cliente.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO case_members (report_id, user_id, role)
  VALUES (NEW.id, NEW.author_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_report_created
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_report();

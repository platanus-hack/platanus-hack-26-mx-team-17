/**
 * Tipos de dominio para tracking (Rol 1).
 *
 * Calcados de los contratos congelados:
 *   - docs/contracts/database-schema.md  (tabla `tracking_sessions`, enum `tracking_status`)
 *   - docs/contracts/mobile-data-access.md (firmas `startTracking`, `subscribeToTracking`, ...)
 *   - docs/contracts/realtime-events.md  (suscripción a `tracking_sessions`)
 *
 * Convención camelCase en el dominio móvil; el mapeo desde columnas snake_case
 * de Postgres ocurre en la capa de servicio.
 */

/** tracking_status — database-schema.md */
export type TrackingStatus = 'active' | 'paused' | 'finished' | 'cancelled';

/**
 * Sesión de rescate GPS. Fuente de la última posición para la UI en vivo
 * (los puntos crudos viven en `tracking_points`, sin suscripción de UI).
 */
export interface TrackingSession {
  id: string;
  reportId: string;
  rescuerId: string;
  status: TrackingStatus;
  lastLat: number | null;
  lastLng: number | null;
  lastPointAt: string | null; // ISO 8601
  startedAt: string; // ISO 8601
  endedAt: string | null; // ISO 8601
}

/**
 * Payload mínimo que entrega `subscribeToTracking` (realtime-events.md →
 * sólo lo necesario para pintar la última posición del rescatista).
 */
export interface TrackingUpdate {
  sessionId: string;
  status: TrackingStatus;
  lastLat: number | null;
  lastLng: number | null;
  lastPointAt: string | null;
}

/** Función para cancelar una suscripción Realtime. */
export type Unsubscribe = () => void;

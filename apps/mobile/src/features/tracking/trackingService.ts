import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { supabase } from '../../lib/supabase';
import type {
  TrackingSession,
  TrackingStatus,
  TrackingUpdate,
  Unsubscribe,
} from '../../types/tracking';
import { ensureForegroundPermission } from '../map/location';
import {
  clearActiveSessionId,
  setActiveSessionId,
  startBackgroundUpdates,
  stopBackgroundUpdates,
} from './locationTask';

/**
 * Servicio de tracking (Rol 1) — espejo de las firmas congeladas en
 * docs/contracts/mobile-data-access.md (sección "Tracking"). La UI nunca llama
 * a Supabase directamente: pasa por aquí.
 *
 * El módulo `locationTask` se importa para registrar la tarea de fondo y para
 * arrancar/detener la captura de GPS junto al ciclo de la sesión.
 */

export type TrackingErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'NETWORK'
  | 'UNKNOWN';

export class TrackingError extends Error {
  constructor(
    public code: TrackingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'TrackingError';
  }
}

/** Fila de `tracking_sessions` (snake_case de Postgres). */
interface TrackingSessionRow {
  id: string;
  report_id: string;
  rescuer_id: string;
  status: TrackingStatus;
  last_lat: number | null;
  last_lng: number | null;
  last_point_at: string | null;
  started_at: string;
  ended_at: string | null;
}

function mapRow(row: TrackingSessionRow): TrackingSession {
  return {
    id: row.id,
    reportId: row.report_id,
    rescuerId: row.rescuer_id,
    status: row.status,
    lastLat: row.last_lat,
    lastLng: row.last_lng,
    lastPointAt: row.last_point_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new TrackingError('UNAUTHENTICATED', 'Inicia sesión para coordinar el rescate.');
  }
  return data.user.id;
}

/** Traduce un error de PostgREST a un código del contrato. */
function toTrackingError(error: { code?: string; message: string }): TrackingError {
  // 42501 = insufficient_privilege (RLS); PGRST116 = no rows.
  if (error.code === '42501') return new TrackingError('FORBIDDEN', error.message);
  if (error.code === 'PGRST116') return new TrackingError('NOT_FOUND', error.message);
  return new TrackingError('NETWORK', error.message);
}

/** Crea una sesión `active` y arranca la captura de GPS. */
export async function startTracking(reportId: string): Promise<TrackingSession> {
  const rescuerId = await requireUserId();

  const { data, error } = await supabase
    .from('tracking_sessions')
    .insert({ report_id: reportId, rescuer_id: rescuerId, status: 'active' })
    .select()
    .single();

  if (error || !data) throw toTrackingError(error ?? { message: 'No se pudo iniciar el rescate.' });

  const session = mapRow(data as TrackingSessionRow);
  await ensureForegroundPermission();
  await setActiveSessionId(session.id);
  await startBackgroundUpdates();
  return session;
}

async function setStatus(
  sessionId: string,
  status: TrackingStatus,
  extra: Partial<Pick<TrackingSessionRow, 'ended_at'>> = {},
): Promise<TrackingSession> {
  const { data, error } = await supabase
    .from('tracking_sessions')
    .update({ status, ...extra })
    .eq('id', sessionId)
    .select()
    .single();

  if (error || !data) throw toTrackingError(error ?? { message: 'Sesión no encontrada.' });
  return mapRow(data as TrackingSessionRow);
}

/** Pausa: detiene la captura pero conserva la sesión. */
export async function pauseTracking(sessionId: string): Promise<TrackingSession> {
  const session = await setStatus(sessionId, 'paused');
  await stopBackgroundUpdates();
  return session;
}

/** Reanuda: reactiva la captura sobre la misma sesión. */
export async function resumeTracking(sessionId: string): Promise<TrackingSession> {
  const session = await setStatus(sessionId, 'active');
  await setActiveSessionId(sessionId);
  await startBackgroundUpdates();
  return session;
}

/** Finaliza: cierra la sesión y DETIENE la tarea de ubicación. */
export async function stopTracking(sessionId: string): Promise<TrackingSession> {
  const session = await setStatus(sessionId, 'finished', {
    ended_at: new Date().toISOString(),
  });
  await stopBackgroundUpdates();
  await clearActiveSessionId();
  return session;
}

/** Devuelve la sesión `active` o `paused` del reporte, si existe. */
export async function getActiveSession(reportId: string): Promise<TrackingSession | null> {
  const { data, error } = await supabase
    .from('tracking_sessions')
    .select()
    .eq('report_id', reportId)
    .in('status', ['active', 'paused'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw toTrackingError(error);
  return data ? mapRow(data as TrackingSessionRow) : null;
}

/**
 * Suscripción en vivo a la última posición del rescatista
 * (Realtime sobre `tracking_sessions`, NO `tracking_points`).
 */
export function subscribeToTracking(
  reportId: string,
  callback: (update: TrackingUpdate) => void,
): Unsubscribe {
  const channel = supabase
    .channel(`tracking:${reportId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tracking_sessions',
        filter: `report_id=eq.${reportId}`,
      },
      (payload: RealtimePostgresChangesPayload<TrackingSessionRow>) => {
        const row = payload.new as TrackingSessionRow;
        if (!row?.id) return;
        callback({
          sessionId: row.id,
          status: row.status,
          lastLat: row.last_lat,
          lastLng: row.last_lng,
          lastPointAt: row.last_point_at,
        });
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

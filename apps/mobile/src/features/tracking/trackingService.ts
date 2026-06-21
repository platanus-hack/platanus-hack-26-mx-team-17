import { supabase } from '../../lib/supabase';
import type { TrackingSession, TrackingStatus, TrackingUpdate } from '../../types/tracking';

export type TrackingErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'NETWORK';

export class TrackingError extends Error {
  constructor(
    public code: TrackingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'TrackingError';
  }
}

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

function mapSession(row: TrackingSessionRow): TrackingSession {
  return {
    id: row.id,
    reportId: row.report_id,
    rescuerId: row.rescuer_id,
    status: row.status,
    lastLat: row.last_lat ?? undefined,
    lastLng: row.last_lng ?? undefined,
    lastPointAt: row.last_point_at ?? undefined,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
  };
}

function mapError(error: { code?: string; message: string }): TrackingError {
  const msg = error.message;
  if (error.code === 'PGRST116') return new TrackingError('NOT_FOUND', 'Sesión no encontrada');
  if (error.code === '42501' || msg.includes('RLS')) return new TrackingError('FORBIDDEN', 'Sin permiso');
  if (msg.includes('JWT') || msg.includes('not authenticated')) {
    return new TrackingError('UNAUTHENTICATED', 'Debes iniciar sesión');
  }
  return new TrackingError('NETWORK', msg);
}

async function requireUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new TrackingError('UNAUTHENTICATED', 'Debes iniciar sesión');
  return user;
}

export const trackingService = {
  async startTracking(reportId: string): Promise<TrackingSession> {
    const user = await requireUser();

    const { data, error } = await supabase
      .from('tracking_sessions')
      .insert({ report_id: reportId, rescuer_id: user.id, status: 'active' })
      .select()
      .single();

    if (error) throw mapError(error);
    return mapSession(data as TrackingSessionRow);
  },

  async pauseTracking(sessionId: string): Promise<TrackingSession> {
    await requireUser();

    const { data, error } = await supabase
      .from('tracking_sessions')
      .update({ status: 'paused' })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw mapError(error);
    return mapSession(data as TrackingSessionRow);
  },

  async resumeTracking(sessionId: string): Promise<TrackingSession> {
    await requireUser();

    const { data, error } = await supabase
      .from('tracking_sessions')
      .update({ status: 'active' })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw mapError(error);
    return mapSession(data as TrackingSessionRow);
  },

  async stopTracking(sessionId: string): Promise<TrackingSession> {
    await requireUser();

    const { data, error } = await supabase
      .from('tracking_sessions')
      .update({ status: 'finished', ended_at: new Date().toISOString() })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw mapError(error);
    return mapSession(data as TrackingSessionRow);
  },

  async getActiveSession(reportId: string): Promise<TrackingSession | null> {
    const { data, error } = await supabase
      .from('tracking_sessions')
      .select('*')
      .eq('report_id', reportId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw mapError(error);
    return data ? mapSession(data as TrackingSessionRow) : null;
  },

  subscribeToTracking(
    reportId: string,
    callback: (update: TrackingUpdate) => void,
  ): () => void {
    const channel = supabase
      .channel(`tracking-${reportId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tracking_sessions',
          filter: `report_id=eq.${reportId}`,
        },
        (payload) => {
          const row = payload.new as TrackingSessionRow;
          callback({
            sessionId: row.id,
            status: row.status,
            lastLat: row.last_lat ?? undefined,
            lastLng: row.last_lng ?? undefined,
            lastPointAt: row.last_point_at ?? undefined,
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },
};

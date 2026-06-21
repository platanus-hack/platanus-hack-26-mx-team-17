import { useCallback, useEffect, useRef, useState } from 'react';

import type { TrackingSession, TrackingUpdate } from '../../types/tracking';
import {
  getActiveSession,
  pauseTracking,
  resumeTracking,
  startTracking,
  stopTracking,
  subscribeToTracking,
  TrackingError,
} from './trackingService';

type LoadState = 'loading' | 'ready' | 'error';

interface UseTrackingSessionResult {
  session: TrackingSession | null;
  /** Última posición en vivo del rescatista (Realtime). */
  live: TrackingUpdate | null;
  loadState: LoadState;
  actionPending: boolean;
  error: string | null;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
}

function messageFor(error: unknown): string {
  if (error instanceof TrackingError) return error.message;
  return 'Ocurrió un error con el rastreo. Intenta de nuevo.';
}

/**
 * Estado de la sesión de rescate de un caso (Rol 1).
 *
 * Carga la sesión activa, se suscribe a la posición en vivo y expone las
 * acciones de tracking. Cualquier miembro del caso ve la posición; sólo el
 * rescatista controla la sesión (RLS lo refuerza en el backend).
 */
export function useTrackingSession(reportId: string): UseTrackingSessionResult {
  const [session, setSession] = useState<TrackingSession | null>(null);
  const [live, setLive] = useState<TrackingUpdate | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [actionPending, setActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Evita actualizar estado tras desmontar.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadState('loading');
    getActiveSession(reportId)
      .then((s) => {
        if (!active) return;
        setSession(s);
        setLoadState('ready');
      })
      .catch(() => {
        if (active) setLoadState('error');
      });

    const unsubscribe = subscribeToTracking(reportId, (update) => {
      if (!active) return;
      setLive(update);
      setSession((prev) =>
        prev && prev.id === update.sessionId
          ? {
              ...prev,
              status: update.status,
              lastLat: update.lastLat,
              lastLng: update.lastLng,
              lastPointAt: update.lastPointAt,
            }
          : prev,
      );
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [reportId]);

  const run = useCallback(
    async (action: () => Promise<TrackingSession>) => {
      setActionPending(true);
      setError(null);
      try {
        const next = await action();
        if (mounted.current) setSession(next);
      } catch (e) {
        if (mounted.current) setError(messageFor(e));
      } finally {
        if (mounted.current) setActionPending(false);
      }
    },
    [],
  );

  const start = useCallback(() => run(() => startTracking(reportId)), [run, reportId]);
  const pause = useCallback(() => {
    if (!session) return Promise.resolve();
    return run(() => pauseTracking(session.id));
  }, [run, session]);
  const resume = useCallback(() => {
    if (!session) return Promise.resolve();
    return run(() => resumeTracking(session.id));
  }, [run, session]);
  const stop = useCallback(() => {
    if (!session) return Promise.resolve();
    return run(() => stopTracking(session.id));
  }, [run, session]);

  return { session, live, loadState, actionPending, error, start, pause, resume, stop };
}

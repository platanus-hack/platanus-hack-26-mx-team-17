import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { supabase } from '../../lib/supabase';

/**
 * Tarea de ubicación en segundo plano (Rol 1).
 *
 * Mientras hay una sesión de rescate activa, recibe lecturas de GPS (incluso
 * con la app en segundo plano vía foreground service) y:
 *   1. Inserta cada lectura en `tracking_points` (historial).
 *   2. Actualiza `tracking_sessions.last_lat/last_lng/last_point_at`
 *      (fuente de la posición en vivo para la UI — ver realtime-events.md).
 *
 * El id de sesión activa se guarda en AsyncStorage porque la tarea corre en un
 * contexto JS separado y no comparte el estado de React.
 */

export const LOCATION_TASK = 'huellasos-tracking-location';
const ACTIVE_SESSION_KEY = 'huellasos.tracking.activeSessionId';

export async function setActiveSessionId(sessionId: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
}

export async function getActiveSessionId(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_SESSION_KEY);
}

export async function clearActiveSessionId(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
}

interface LocationTaskData {
  locations: Location.LocationObject[];
}

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const { locations } = data as LocationTaskData;
  if (!locations?.length) return;

  const sessionId = await getActiveSessionId();
  if (!sessionId) return; // sin sesión activa: nada que escribir.

  // Sólo la lectura más reciente alimenta `last_*`; todas van al historial.
  const points = locations.map((loc) => ({
    session_id: sessionId,
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    accuracy_m: loc.coords.accuracy ?? null,
    recorded_at: new Date(loc.timestamp).toISOString(),
  }));

  const latest = locations[locations.length - 1];

  try {
    await supabase.from('tracking_points').insert(points);
    await supabase
      .from('tracking_sessions')
      .update({
        last_lat: latest.coords.latitude,
        last_lng: latest.coords.longitude,
        last_point_at: new Date(latest.timestamp).toISOString(),
      })
      .eq('id', sessionId);
  } catch {
    // Reintento implícito en la siguiente lectura; no romper la tarea.
  }
});

/** Inicia las actualizaciones en segundo plano (requiere permiso background). */
export async function startBackgroundUpdates(): Promise<void> {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  // Si no hay permiso de fondo, seguimos con foreground (la pantalla activa
  // mantiene la captura); no bloqueamos el rescate por ello.
  if (status !== Location.PermissionStatus.GRANTED) return;

  const already = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  if (already) return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 10_000,
    distanceInterval: 15,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'Rescate en curso',
      notificationBody: 'Compartiendo tu ubicación con los miembros del caso.',
      notificationColor: '#0F766E',
    },
  });
}

/** Detiene las actualizaciones en segundo plano si están activas. */
export async function stopBackgroundUpdates(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  if (started) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}

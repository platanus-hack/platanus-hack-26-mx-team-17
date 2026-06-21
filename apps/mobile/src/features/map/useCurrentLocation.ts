import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

/** Estado de la captura de ubicación para la UI del mapa. */
export type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'error';

export interface CurrentLocation {
  /** `[lng, lat]` — orden de Mapbox GL. */
  center: [number, number];
  accuracyM: number;
}

interface UseCurrentLocationResult {
  status: LocationStatus;
  location: CurrentLocation | null;
  refresh: () => Promise<void>;
}

/**
 * Obtiene una vez la ubicación actual del dispositivo para centrar la cámara
 * del mapa (Rol 1). No elige coordenadas manualmente: sólo lee el GPS.
 * El punto vivo del usuario lo pinta `<LocationPuck />` de Mapbox.
 */
export function useCurrentLocation(): UseCurrentLocationResult {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [location, setLocation] = useState<CurrentLocation | null>(null);

  const refresh = useCallback(async () => {
    setStatus('loading');
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== Location.PermissionStatus.GRANTED) {
        setStatus('denied');
        return;
      }
      const fix = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        center: [fix.coords.longitude, fix.coords.latitude],
        accuracyM: fix.coords.accuracy ?? 0,
      });
      setStatus('granted');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, location, refresh };
}

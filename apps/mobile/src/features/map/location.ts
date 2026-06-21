import * as Location from 'expo-location';

import type { ReportLocation } from '../../types/report';

/**
 * Servicio de ubicación (Rol 1).
 *
 * Implementa `getCurrentReportLocation()` del contrato mobile-data-access.md.
 * Regla de producto: SÓLO GPS actual — la ubicación nunca se elige, edita ni
 * arrastra. Devuelve `ReportLocation` (camelCase, tipo de dominio que consume
 * el formulario de Rol 4); el contrato la describe con `accuracy_m`/`captured_at`
 * pero el dominio móvil ya usa `accuracyM`/`capturedAt`.
 */

/** Códigos de error del contrato para ubicación. */
export type LocationErrorCode =
  | 'PERMISSION_DENIED'
  | 'LOCATION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'INACCURATE';

export class LocationError extends Error {
  constructor(
    public code: LocationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'LocationError';
  }
}

/** Precisión máxima aceptable (m). Peor que esto = lectura no confiable. */
export const MAX_ACCURACY_M = 100;
/** Antigüedad máxima de un fix para considerarlo "actual" (ms). */
export const MAX_AGE_MS = 60_000;
/** Timeout para obtener un fix (ms). */
const FIX_TIMEOUT_MS = 15_000;

/** Solicita permiso de ubicación en primer plano; lanza si se niega. */
export async function ensureForegroundPermission(): Promise<void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) {
    throw new LocationError(
      'PERMISSION_DENIED',
      'Se requiere permiso de ubicación para usar el GPS actual.',
    );
  }
}

function toReportLocation(fix: Location.LocationObject): ReportLocation {
  return {
    lat: fix.coords.latitude,
    lng: fix.coords.longitude,
    // accuracy puede venir null en algunos dispositivos; se valida abajo.
    accuracyM: fix.coords.accuracy ?? Number.POSITIVE_INFINITY,
    capturedAt: new Date(fix.timestamp).toISOString(),
  };
}

/**
 * Obtiene la ubicación actual del dispositivo para crear un reporte.
 * Valida precisión y antigüedad: garantiza que lo guardado tenga precisión y
 * timestamp confiables (criterio de aceptación del rol).
 */
export async function getCurrentReportLocation(): Promise<ReportLocation> {
  await ensureForegroundPermission();

  const enabled = await Location.hasServicesEnabledAsync();
  if (!enabled) {
    throw new LocationError(
      'LOCATION_UNAVAILABLE',
      'El GPS está desactivado. Actívalo para continuar.',
    );
  }

  let fix: Location.LocationObject;
  try {
    fix = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }),
      FIX_TIMEOUT_MS,
    );
  } catch (error) {
    if (error instanceof LocationError) throw error;
    throw new LocationError(
      'LOCATION_UNAVAILABLE',
      'No se pudo obtener la ubicación actual.',
    );
  }

  const location = toReportLocation(fix);

  if (!Number.isFinite(location.accuracyM) || location.accuracyM > MAX_ACCURACY_M) {
    throw new LocationError(
      'INACCURATE',
      `Precisión insuficiente (±${Math.round(location.accuracyM)} m). Intenta a cielo abierto.`,
    );
  }

  const ageMs = Date.now() - new Date(location.capturedAt).getTime();
  if (ageMs > MAX_AGE_MS) {
    throw new LocationError(
      'LOCATION_UNAVAILABLE',
      'La lectura de ubicación es demasiado antigua. Intenta de nuevo.',
    );
  }

  return location;
}

/** Rechaza con TIMEOUT si la promesa no resuelve a tiempo. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new LocationError('TIMEOUT', 'Tiempo de espera agotado para el GPS.'));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

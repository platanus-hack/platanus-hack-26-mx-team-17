import type { ReportLocation } from '../../types/report';

/**
 * Ubicación mock para la fase de UI.
 *
 * PLACEHOLDER de `getCurrentReportLocation()` (Rol 1 / tracking, ver
 * mobile-data-access.md). Regla de producto: SÓLO GPS actual; la ubicación
 * NUNCA se elige, edita ni arrastra. Cuando Rol 1 conecte la captura real,
 * se sustituye esta función sin cambiar la UI del formulario.
 */
export function getMockCurrentLocation(): ReportLocation {
  return {
    lat: 19.4326,
    lng: -99.1332,
    accuracyM: 14,
    capturedAt: new Date().toISOString(),
  };
}

import Constants from 'expo-constants';

/**
 * Configuración del módulo de mapa (Rol 1).
 *
 * El token PÚBLICO de Mapbox (`pk....`) es el único permitido en el cliente
 * (ver CLAUDE.md → Seguridad: `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`). Se lee desde
 * `app.config.ts` → `extra.mapboxAccessToken`. El token SECRETO de descarga
 * NUNCA llega al cliente: sólo se usa en build (RNMAPBOX_MAPS_DOWNLOAD_TOKEN).
 */
const extra = Constants.expoConfig?.extra ?? {};

export const mapboxAccessToken: string =
  typeof extra.mapboxAccessToken === 'string' ? extra.mapboxAccessToken : '';

/** ¿Hay token público disponible para renderizar tiles? */
export const hasMapboxToken = mapboxAccessToken.length > 0;

/**
 * Centro inicial de la cámara (Ciudad de México) hasta que Rol 1 conecte el
 * GPS actual. `[lng, lat]` — orden de Mapbox GL.
 */
export const DEFAULT_CENTER: [number, number] = [-99.1332, 19.4326];
export const DEFAULT_ZOOM = 11;

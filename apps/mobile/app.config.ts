import type { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Configuración de la app — Huella SOS (Android, APK vía EAS).
 *
 * Propiedad: Rol 4 (producto / integración / release).
 *
 * - Scheme `huellasos` y deep link de auth `huellasos://auth/callback`
 *   (ver docs/contracts/auth-deeplinks.md). NO cambiar sin /contract-change.
 * - Sólo se exponen variables públicas `EXPO_PUBLIC_*` al cliente.
 *   NUNCA colocar service role keys ni secretos aquí.
 * - Los valores reales se inyectan por entorno (.env / EAS), no se hardcodean.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Huella SOS',
  slug: 'huella-sos',
  scheme: 'huellasos',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  // Sólo Android en alcance P0 (sin iOS).
  android: {
    package: 'mx.huellasos.app',
    // versionCode lo gestiona Rol 4 en el release; arranca en 1.
    versionCode: 1,
    permissions: [
      // Declaradas aquí para futuras integraciones (GPS, cámara).
      // Rol 1 (ubicación) y captura de imagen las consumirán.
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'CAMERA',
    ],
  },
  plugins: ['expo-router', '@maplibre/maplibre-react-native', 'expo-image-picker'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // ID del proyecto en EAS (cuenta Expo del equipo). Necesario para `eas build`.
    // No es secreto: identifica el proyecto, no da acceso. Puede vivir en el repo.
    eas: {
      projectId: '5fc9592e-3966-4c4e-a502-94f54e8d5605',
    },
    // Espejo de las variables públicas permitidas en el cliente.
    // Se leen de process.env.EXPO_PUBLIC_* en build (vacías hasta configurar EAS/.env).
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
    mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '',
    visionApiUrl: process.env.EXPO_PUBLIC_VISION_API_URL ?? '',
  },
});

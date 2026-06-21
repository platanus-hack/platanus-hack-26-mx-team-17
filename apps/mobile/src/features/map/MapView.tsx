import { type ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Mapbox, {
  Camera,
  LocationPuck,
  MapView as RNMapView,
  MarkerView,
} from '@rnmapbox/maps';

import { colors, fontSize, fontWeight, radius, spacing } from '../../theme/tokens';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  hasMapboxToken,
  mapboxAccessToken,
} from './config';
import { useCurrentLocation } from './useCurrentLocation';

/**
 * Mapa base de Mapbox (Rol 1).
 *
 * - Punto vivo del usuario (`LocationPuck`) cuando `followUser`.
 * - Marcadores arbitrarios (reportes, rescatista) vía `markers`.
 * - Centrado de cámara: `centerOverride` > ubicación del usuario > CDMX.
 *
 * Requiere development build (Mapbox es nativo): NO funciona en Expo Go.
 */

export interface MapMarker {
  id: string;
  /** `[lng, lat]` — orden de Mapbox GL. */
  coordinate: [number, number];
  color: string;
  label?: string;
  onPress?: () => void;
}

interface MapViewProps {
  markers?: MapMarker[];
  /** Muestra el punto del usuario y centra la cámara en él al cargar. */
  followUser?: boolean;
  /** Fuerza el centro (p. ej. seguir al rescatista en tracking). */
  centerOverride?: [number, number] | null;
  zoom?: number;
  children?: ReactNode;
}

// El token público se fija una sola vez al cargar el módulo.
if (hasMapboxToken) {
  void Mapbox.setAccessToken(mapboxAccessToken);
}

export function MapView({
  markers = [],
  followUser = false,
  centerOverride = null,
  zoom = DEFAULT_ZOOM,
  children,
}: MapViewProps) {
  const { location } = useCurrentLocation();

  const center = useMemo<[number, number]>(() => {
    if (centerOverride) return centerOverride;
    if (followUser && location) return location.center;
    return DEFAULT_CENTER;
  }, [centerOverride, followUser, location]);

  if (!hasMapboxToken) {
    return (
      <View style={[styles.container, styles.fallback]}>
        <Text style={styles.fallbackTitle}>Mapa no disponible</Text>
        <Text style={styles.fallbackBody}>
          Falta el token público de Mapbox. Define
          {' '}EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN y reconstruye el development build.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RNMapView style={styles.map} compassEnabled scaleBarEnabled={false}>
        <Camera centerCoordinate={center} zoomLevel={zoom} animationDuration={600} />

        {followUser ? <LocationPuck puckBearingEnabled visible /> : null}

        {markers.map((marker) => (
          <MarkerView
            key={marker.id}
            coordinate={marker.coordinate}
            allowOverlap
            anchor={{ x: 0.5, y: 1 }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={marker.label ?? 'Marcador'}
              onPress={marker.onPress}
              hitSlop={8}
            >
              <View style={[styles.pin, { backgroundColor: marker.color }]} />
            </Pressable>
          </MarkerView>
        ))}

        {children}
      </RNMapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  pin: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  fallbackTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  fallbackBody: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

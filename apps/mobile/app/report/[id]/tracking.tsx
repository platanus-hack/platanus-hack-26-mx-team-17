import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../../src/components/ui/Button';
import { StatusBanner } from '../../../src/components/ui/StatusBanner';
import { MapView, type MapMarker } from '../../../src/features/map/MapView';
import { useTrackingSession } from '../../../src/features/tracking/useTrackingSession';
import { colors, fontSize, fontWeight, radius, spacing } from '../../../src/theme/tokens';
import type { TrackingStatus } from '../../../src/types/tracking';

const STATUS_LABEL: Record<TrackingStatus, string> = {
  active: 'Rescate en curso',
  paused: 'Rescate en pausa',
  finished: 'Rescate finalizado',
  cancelled: 'Rescate cancelado',
};

/**
 * Pantalla de seguimiento de un caso (Rol 1).
 *
 * Muestra la última posición del rescatista en vivo sobre el mapa y, para el
 * rescatista, los controles de la sesión (iniciar, pausar, reanudar, finalizar).
 * La posición viene de `tracking_sessions.last_*` vía Realtime; otro teléfono
 * (miembro del caso) la ve sin ser el rescatista.
 *
 * Requiere development build (Mapbox + ubicación nativos): NO funciona en Expo Go.
 */
export default function TrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, live, loadState, actionPending, error, start, pause, resume, stop } =
    useTrackingSession(id);

  const lat = live?.lastLat ?? session?.lastLat ?? null;
  const lng = live?.lastLng ?? session?.lastLng ?? null;
  const hasPosition = lat !== null && lng !== null;

  const center = useMemo<[number, number] | null>(
    () => (hasPosition ? [lng as number, lat as number] : null),
    [hasPosition, lat, lng],
  );

  const markers = useMemo<MapMarker[]>(
    () =>
      hasPosition
        ? [
            {
              id: 'rescuer',
              coordinate: [lng as number, lat as number],
              color: colors.primary,
              label: 'Rescatista',
            },
          ]
        : [],
    [hasPosition, lat, lng],
  );

  const insets = useSafeAreaInsets();
  const status = session?.status ?? null;

  return (
    <View style={styles.container}>
      <MapView markers={markers} centerOverride={center} followUser zoom={15} />

      <View style={[styles.panel, { paddingBottom: insets.bottom + spacing.lg }]}>
        {loadState === 'loading' ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}

        {loadState === 'error' ? (
          <StatusBanner tone="error" message="No se pudo cargar la sesión de rescate." />
        ) : null}

        {loadState === 'ready' ? (
          <>
            <Text style={styles.status}>
              {status ? STATUS_LABEL[status] : 'Sin rescate activo'}
            </Text>
            {!hasPosition && status === 'active' ? (
              <Text style={styles.hint}>Esperando la primera lectura de GPS…</Text>
            ) : null}

            {error ? <StatusBanner tone="error" message={error} /> : null}

            {renderControls({
              status,
              actionPending,
              start,
              pause,
              resume,
              stop,
            })}
          </>
        ) : null}
      </View>
    </View>
  );
}

interface ControlsProps {
  status: TrackingStatus | null;
  actionPending: boolean;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
}

function renderControls({ status, actionPending, start, pause, resume, stop }: ControlsProps) {
  if (status === null || status === 'finished' || status === 'cancelled') {
    return (
      <Button
        label="Iniciar rescate"
        onPress={start}
        loading={actionPending}
        disabled={status === 'finished' || status === 'cancelled' ? false : actionPending}
      />
    );
  }

  return (
    <View style={styles.row}>
      {status === 'active' ? (
        <View style={styles.flex}>
          <Button label="Pausar" variant="secondary" onPress={pause} loading={actionPending} />
        </View>
      ) : (
        <View style={styles.flex}>
          <Button label="Reanudar" onPress={resume} loading={actionPending} />
        </View>
      )}
      <View style={styles.flex}>
        <Button label="Finalizar" variant="danger" onPress={stop} loading={actionPending} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  center: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  status: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
});

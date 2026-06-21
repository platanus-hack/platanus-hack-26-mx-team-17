import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../src/components/ui/Button';
import { StatusBanner } from '../src/components/ui/StatusBanner';
import { MapView, type MapMarker } from '../src/features/map/MapView';
import { reportService } from '../src/features/reports/reportService';
import { colors, reportTypeColors, spacing } from '../src/theme/tokens';
import type { Report } from '../src/types/report';

type LoadState = 'loading' | 'success' | 'error';

/**
 * Home (Rol 1): mapa de Mapbox con los reportes públicos como marcadores.
 *
 * Conserva el flujo de reportes de Rol 4: tocar un marcador abre el detalle y
 * el botón inferior lleva al formulario de creación. Datos vía `reportService`
 * (mock hoy, Supabase después) — la UI no cambia al conectar el backend.
 *
 * Requiere development build (Mapbox es nativo): NO funciona en Expo Go.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<Report[]>([]);
  const [state, setState] = useState<LoadState>('loading');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const data = await reportService.getPublicReports();
      setReports(data);
      setState('success');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markers = useMemo<MapMarker[]>(
    () =>
      reports.map((report) => ({
        id: report.id,
        coordinate: [report.location.lng, report.location.lat],
        color: reportTypeColors[report.type],
        label: report.title,
        onPress: () => router.push(`/report/${report.id}`),
      })),
    [reports, router],
  );

  return (
    <View style={styles.container}>
      <MapView markers={markers} followUser />

      <View style={[styles.topOverlay, { top: insets.top + spacing.md }]}>
        {state === 'loading' ? (
          <View style={styles.badge}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}
        {state === 'error' ? (
          <StatusBanner tone="error" message="No se pudieron cargar los reportes." />
        ) : null}
        {state === 'success' && reports.length === 0 ? (
          <StatusBanner tone="info" message="Aún no hay reportes públicos." />
        ) : null}
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button label="Reportar un animal" onPress={() => router.push('/report/new')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: spacing.sm,
    padding: spacing.sm,
  },
  actions: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
  },
});

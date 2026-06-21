import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { MapView } from '../src/features/map/MapView';
import { StatusBanner } from '../src/components/ui/StatusBanner';
import { ReportCard } from '../src/features/reports/components/ReportCard';
import { authService } from '../src/features/auth/authService';
import { realtimeService, reportService } from '../src/features/reports/reportService';
import { colors, fontSize, fontWeight, spacing } from '../src/theme/tokens';
import type { Report } from '../src/types/report';

type LoadState = 'loading' | 'success' | 'error';

const PANEL_HEIGHT = 340;

export default function HomeScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [panelOpen, setPanelOpen] = useState(true);
  const panelAnim = useRef(new Animated.Value(1)).current;

  const togglePanel = () => {
    const toValue = panelOpen ? 0 : 1;
    Animated.timing(panelAnim, {
      toValue,
      duration: 250,
      useNativeDriver: false,
    }).start();
    setPanelOpen(!panelOpen);
  };

  const load = useCallback(async () => {
    setState('loading');
    try {
      const data = await reportService.getPublicReports();
      // Deduplica por id y filtra resueltos/cancelados
      const unique = Array.from(new Map(
        data
          .filter((r) => r.status !== 'resolved' && r.status !== 'cancelled')
          .map((r) => [r.id, r])
      ).values());
      setReports(unique);
      setState('success');
    } catch {
      setState('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    return realtimeService.subscribeToReports((updated) => {
      setReports((prev) => {
        if (updated.status === 'resolved' || updated.status === 'cancelled') {
          return prev.filter((r) => r.id !== updated.id);
        }
        const idx = prev.findIndex((r) => r.id === updated.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        // Solo agrega si no existe ya
        if (prev.some((r) => r.id === updated.id)) return prev;
        return [updated, ...prev];
      });
    });
  }, []);

  const panelMaxHeight = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PANEL_HEIGHT],
  });

  return (
    <View style={styles.container}>
      <MapView
        reports={reports}
        onReportPress={(r) => router.push(`/report/${r.id}`)}
      />

      <View style={styles.overlay} pointerEvents="box-none">
        {/* Panel inferior colapsable */}
        <View style={styles.panelWrapper} pointerEvents="box-none">
          {/* Handle para abrir/cerrar */}
          <TouchableOpacity
            style={styles.handle}
            onPress={togglePanel}
            activeOpacity={0.8}
          >
            <View style={styles.handleBar} />
            <Text style={styles.handleLabel}>
              {panelOpen ? 'Reportes públicos ▾' : 'Reportes públicos ▴'}
            </Text>
          </TouchableOpacity>

          <Animated.View style={[styles.panelContent, { maxHeight: panelMaxHeight }]}>
            {state === 'loading' && (
              <ActivityIndicator color={colors.primary} style={styles.loader} />
            )}
            {state === 'error' && (
              <StatusBanner tone="error" message="No se pudieron cargar los reportes." />
            )}
            {state === 'success' && reports.length === 0 && (
              <StatusBanner tone="info" message="Aún no hay reportes públicos." />
            )}
            {state === 'success' && reports.length > 0 && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {reports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onPress={(r) => router.push(`/report/${r.id}`)}
                  />
                ))}
              </ScrollView>
            )}
          </Animated.View>
        </View>

        {/* Botón reportar — siempre encima del panel */}
        <TouchableOpacity
          style={[styles.reportButton, { bottom: panelOpen ? PANEL_HEIGHT + 60 : 80 }]}
          onPress={async () => {
            const user = await authService.getCurrentUser();
            router.push(user ? '/report/new' : '/auth/login');
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.reportButtonText}>+ Reportar animal</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end',
  },
  reportButton: {
    position: 'absolute',
    right: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 24,
    elevation: 20,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  reportButtonText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  panelWrapper: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  handle: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: 4,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  handleLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  panelContent: {
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  loader: {
    paddingVertical: spacing.sm,
  },
});

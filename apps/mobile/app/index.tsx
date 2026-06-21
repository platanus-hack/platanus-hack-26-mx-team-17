import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { MapView } from '../src/features/map/MapView';
import { focusStore } from '../src/features/map/focusStore';
import { StatusBanner } from '../src/components/ui/StatusBanner';
import { ReportCard } from '../src/features/reports/components/ReportCard';
import { authService } from '../src/features/auth/authService';
import { realtimeService, reportService } from '../src/features/reports/reportService';
import { reportTypeColor, reportTypeIcon, reportTypeLabels } from '../src/features/reports/labels';
import {
  colors,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  shadow,
  spacing,
  withAlpha,
} from '../src/theme/tokens';
import type { Report, ReportType } from '../src/types/report';

type LoadState = 'loading' | 'success' | 'error';
type Filter = ReportType | 'all';

const PANEL_HEIGHT = 340;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<Report[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [filter, setFilter] = useState<Filter>('all');
  const [panelOpen, setPanelOpen] = useState(true);
  const [routeTarget, setRouteTarget] = useState<Report | null>(null);
  const [focusCoords, setFocusCoords] = useState<{ lat: number; lng: number } | null>(null);
  const panelAnim = useRef(new Animated.Value(1)).current;
  const flyToUserRef = useRef<(() => void) | undefined>(undefined);

  const togglePanel = () => {
    const toValue = panelOpen ? 0 : 1;
    Animated.timing(panelAnim, { toValue, duration: 250, useNativeDriver: false }).start();
    setPanelOpen(!panelOpen);
  };

  const collapsePanel = () => {
    Animated.timing(panelAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start();
    setPanelOpen(false);
  };

  const handleRoutePress = (report: Report) => {
    setRouteTarget(report);
    collapsePanel();
  };

  const load = useCallback(async () => {
    setState('loading');
    try {
      const data = await reportService.getPublicReports();
      const unique = Array.from(
        new Map(
          data
            .filter((r) => r.status !== 'resolved' && r.status !== 'cancelled')
            .map((r) => [r.id, r]),
        ).values(),
      );
      setReports(unique);
      setState('success');
    } catch {
      setState('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      const pending = focusStore.consume();
      if (pending) {
        setFocusCoords(pending);
        Animated.timing(panelAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start();
        setPanelOpen(false);
      }
    }, [load, panelAnim]),
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
        if (prev.some((r) => r.id === updated.id)) return prev;
        return [updated, ...prev];
      });
    });
  }, []);

  const visibleReports = useMemo(
    () => (filter === 'all' ? reports : reports.filter((r) => r.type === filter)),
    [reports, filter],
  );

  const panelMaxHeight = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PANEL_HEIGHT],
  });

  const ALL_FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    ...(['lost', 'sighting', 'injured', 'abandoned'] as ReportType[]).map((t) => ({
      value: t as Filter,
      label: reportTypeLabels[t],
    })),
  ];

  return (
    <View style={styles.container}>
      <MapView
        reports={visibleReports}
        onReportPress={(r) => router.push(`/report/${r.id}`)}
        routeTarget={routeTarget}
        onRouteClear={() => setRouteTarget(null)}
        flyToUserRef={flyToUserRef}
        focusCoords={focusCoords}
      />

      {/* Filtros flotantes superiores */}
      <View style={[styles.filterBar, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {ALL_FILTERS.map((f) => {
            const active = filter === f.value;
            const accent =
              f.value === 'all' ? colors.text : reportTypeColor[f.value as ReportType];
            const iconName =
              f.value !== 'all' ? reportTypeIcon[f.value as ReportType] : undefined;
            return (
              <TouchableOpacity
                key={f.value}
                onPress={() => setFilter(f.value)}
                activeOpacity={0.85}
                style={[
                  styles.filterChip,
                  active
                    ? { backgroundColor: accent }
                    : { backgroundColor: colors.surface },
                ]}
              >
                {iconName ? (
                  <Ionicons
                    name={iconName}
                    size={13}
                    color={active ? '#fff' : accent}
                  />
                ) : null}
                <Text
                  style={[
                    styles.filterLabel,
                    active ? styles.filterLabelActive : { color: colors.text },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.overlay} pointerEvents="box-none">
        {/* FAB ubicación */}
        <TouchableOpacity
          style={[styles.locationButton, { bottom: panelOpen ? PANEL_HEIGHT + 16 : 92 }]}
          onPress={() => flyToUserRef.current?.()}
          activeOpacity={0.9}
        >
          <Ionicons name="locate" size={22} color="#1565C0" />
        </TouchableOpacity>

        {/* FAB coral */}
        <TouchableOpacity
          style={[styles.reportButton, { bottom: panelOpen ? PANEL_HEIGHT + 16 : 92 }]}
          onPress={async () => {
            const user = await authService.getCurrentUser();
            router.push(user ? '/report/new' : '/auth/login');
          }}
          activeOpacity={0.9}
        >
          <Ionicons name="paw" size={18} color="#fff" />
          <Text style={styles.reportButtonText}>Reportar</Text>
        </TouchableOpacity>

        {/* Panel inferior colapsable */}
        <View style={styles.panelWrapper} pointerEvents="box-none">
          <TouchableOpacity style={styles.handle} onPress={togglePanel} activeOpacity={0.8}>
            <View style={styles.handleBar} />
            <View style={styles.handleRow}>
              <Text style={styles.handleLabel}>Reportes cercanos</Text>
              <View style={styles.countPill}>
                <Text style={styles.countText}>{visibleReports.length}</Text>
              </View>
              <Ionicons
                name={panelOpen ? 'chevron-down' : 'chevron-up'}
                size={16}
                color={colors.textMuted}
              />
            </View>
          </TouchableOpacity>

          <Animated.View style={[styles.panelContent, { maxHeight: panelMaxHeight }]}>
            {state === 'loading' && (
              <ActivityIndicator color={colors.primary} style={styles.loader} />
            )}
            {state === 'error' && (
              <StatusBanner tone="error" message="No se pudieron cargar los reportes." />
            )}
            {state === 'success' && visibleReports.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="paw-outline" size={36} color={colors.border} />
                <Text style={styles.emptyText}>
                  {filter === 'all'
                    ? 'Aún no hay reportes en tu zona.'
                    : 'Sin reportes de este tipo por ahora.'}
                </Text>
              </View>
            )}
            {state === 'success' && visibleReports.length > 0 && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                contentContainerStyle={styles.list}
              >
                {visibleReports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onPress={(r) => router.push(`/report/${r.id}`)}
                    onRoutePress={handleRoutePress}
                  />
                ))}
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  filterBar: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  filterRow: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    ...shadow.sm,
  },
  filterLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  filterLabelActive: {
    color: '#fff',
  },
  locationButton: {
    position: 'absolute',
    left: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    ...shadow.lg,
  },
  reportButton: {
    position: 'absolute',
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    zIndex: 20,
    ...shadow.lg,
  },
  reportButtonText: {
    color: colors.textInverse,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.snug,
  },
  panelWrapper: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadow.lg,
  },
  handle: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  handleBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  handleLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: letterSpacing.snug,
  },
  countPill: {
    minWidth: 24,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: withAlpha(colors.primary, 0.14),
    alignItems: 'center',
  },
  countText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primaryStrong,
  },
  panelContent: {
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  list: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  loader: {
    paddingVertical: spacing.lg,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

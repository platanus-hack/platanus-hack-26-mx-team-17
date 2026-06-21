import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../src/components/ui/Button';
import { ScreenContainer } from '../src/components/ui/ScreenContainer';
import { StatusBanner } from '../src/components/ui/StatusBanner';
import { ReportCard } from '../src/features/reports/components/ReportCard';
import { reportService } from '../src/features/reports/reportService';
import { colors, fontSize, fontWeight, spacing } from '../src/theme/tokens';
import type { Report } from '../src/types/report';

type LoadState = 'loading' | 'success' | 'error';

/**
 * Home PLACEHOLDER (lista de reportes públicos mock).
 *
 * El mapa real es responsabilidad de Rol 1; esta lista es temporal para
 * navegar y probar el flujo de reportes sin backend. Datos vía `reportService`
 * (mock hoy, Supabase después).
 */
export default function HomeScreen() {
  const router = useRouter();
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

  return (
    <ScreenContainer>
      <View style={styles.intro}>
        <Text style={styles.heading}>Reportes públicos</Text>
        <Text style={styles.subheading}>
          Vista temporal de lista. El mapa lo integra Rol 1.
        </Text>
      </View>

      <Button label="Reportar un animal" onPress={() => router.push('/report/new')} />

      {state === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}

      {state === 'error' ? (
        <StatusBanner tone="error" message="No se pudieron cargar los reportes." />
      ) : null}

      {state === 'success' && reports.length === 0 ? (
        <StatusBanner tone="info" message="Aún no hay reportes públicos." />
      ) : null}

      {state === 'success'
        ? reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onPress={(r) => router.push(`/report/${r.id}`)}
            />
          ))
        : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: spacing.xs,
  },
  heading: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subheading: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  center: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
});

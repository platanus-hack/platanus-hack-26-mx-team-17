import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { StatusBanner } from '../../src/components/ui/StatusBanner';
import { LocationCard } from '../../src/features/reports/components/LocationCard';
import {
  reportStatusLabels,
  reportTypeColor,
  reportTypeLabels,
} from '../../src/features/reports/labels';
import { reportService } from '../../src/features/reports/reportService';
import { colors, fontSize, fontWeight, spacing } from '../../src/theme/tokens';
import type { Report } from '../../src/types/report';

type LoadState = 'loading' | 'success' | 'error';

/**
 * STUB de detalle del caso.
 *
 * Esqueleto inicial: muestra los datos del reporte. La línea de tiempo,
 * matches, chat y tracking se construyen en fases posteriores (Rol 4 integra;
 * Rol 1/2/3 aportan datos). Hoy lee del `reportService` mock.
 */
export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let active = true;
    setState('loading');
    reportService
      .getReportById(id)
      .then((data) => {
        if (!active) return;
        setReport(data);
        setState('success');
      })
      .catch(() => {
        if (active) setState('error');
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (state === 'loading') {
    return (
      <ScreenContainer scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (state === 'error' || !report) {
    return (
      <ScreenContainer>
        <StatusBanner tone="error" message="No se encontró el reporte." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Badge label={reportTypeLabels[report.type]} color={reportTypeColor[report.type]} />
        <Text style={styles.status}>{reportStatusLabels[report.status]}</Text>
      </View>

      <Text style={styles.title}>{report.title}</Text>
      {report.description ? (
        <Text style={styles.description}>{report.description}</Text>
      ) : null}

      {report.species || report.attributes ? (
        <Card>
          <Text style={styles.sectionTitle}>Características</Text>
          {report.species ? <Text style={styles.detail}>Especie: {report.species}</Text> : null}
          {report.attributes?.color ? (
            <Text style={styles.detail}>Color: {report.attributes.color}</Text>
          ) : null}
          {report.attributes?.size ? (
            <Text style={styles.detail}>Tamaño: {report.attributes.size}</Text>
          ) : null}
          {report.attributes?.breed ? (
            <Text style={styles.detail}>Raza: {report.attributes.breed}</Text>
          ) : null}
        </Card>
      ) : null}

      <LocationCard location={report.location} />

      <Button
        label="Coordinar rescate"
        onPress={() => router.push(`/report/${report.id}/tracking`)}
      />

      <StatusBanner
        tone="info"
        message="Línea de tiempo, coincidencias y chat se integran en fases posteriores."
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  status: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  detail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});

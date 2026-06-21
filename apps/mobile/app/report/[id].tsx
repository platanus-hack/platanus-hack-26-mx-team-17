import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
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
import { realtimeService, reportService, storageService } from '../../src/features/reports/reportService';
import { MatchError, matchService } from '../../src/features/matches/matchService';
import { authService } from '../../src/features/auth/authService';
import type { ReportUpdate } from '../../src/types/reportUpdate';
import { colors, fontSize, fontWeight, radius, spacing } from '../../src/theme/tokens';
import type { Report, ReportStatus } from '../../src/types/report';
import type { Match } from '../../src/types/match';

type LoadState = 'loading' | 'success' | 'error';

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [report, setReport] = useState<Report | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [updates, setUpdates] = useState<ReportUpdate[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [isAuthor, setIsAuthor] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isNearReport, setIsNearReport] = useState(false);
  const [distanceM, setDistanceM] = useState<number | null>(null);

  const checkProximity = useCallback((reportLat: number, reportLng: number) => {
    Location.requestForegroundPermissionsAsync().then(async ({ status }) => {
      if (status !== 'granted') return;

      const checkPos = (pos: Location.LocationObject) => {
        const dist = haversineM(
          pos.coords.latitude, pos.coords.longitude,
          reportLat, reportLng,
        );
        setDistanceM(Math.round(dist));
        setIsNearReport(dist <= 500);
      };

      // Posición cacheada primero (instantánea, sin esperar GPS fix)
      const last = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
      if (last) checkPos(last);

      // Luego refina con posición fresca en baja precisión
      const fresh = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      checkPos(fresh);
    }).catch(() => null);
  }, []);

  const loadReport = useCallback(async () => {
    setState('loading');
    try {
      const data = await reportService.getReportById(id);
      setReport(data);
      setState('success');

      // Corre en paralelo: autor + proximidad
      authService.getCurrentUser().then((user) => {
        setIsAuthor(user?.id === data.authorId);
      }).catch(() => null);

      checkProximity(data.location.lat, data.location.lng);

      // Carga imagen primaria (best-effort, no bloquea)
      storageService.getPrimaryImage(id).then(async (img) => {
        if (!img) return;
        const url = await storageService.getReportImageUrl(img.storagePath).catch(() => null);
        if (url) setImageUrl(url);
      }).catch(() => null);

      // Carga matches existentes (best-effort)
      matchService.getMatches(id).then(setMatches).catch(() => null);
      // Carga actualizaciones del caso (best-effort)
      realtimeService.getReportUpdates(id).then(setUpdates).catch(() => null);
    } catch {
      setState('error');
    }
  }, [id, checkProximity]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  // Suscripción a actualizaciones del caso (timeline)
  useEffect(() => {
    return realtimeService.subscribeToReportUpdates(id, (update) => {
      setUpdates((prev) => [...prev, update]);
    });
  }, [id]);

  // Suscripción a nuevos matches via Realtime
  useEffect(() => {
    return matchService.subscribeToMatches(id, (newMatch) => {
      setMatches((prev) => {
        const idx = prev.findIndex((m) => m.id === newMatch.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = newMatch;
          return next;
        }
        return [...prev, newMatch].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
      });
    });
  }, [id]);

  const handleStatusChange = (newStatus: ReportStatus, label: string) => {
    Alert.alert(
      'Cambiar estado',
      `¿Marcar este reporte como "${label}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: newStatus === 'cancelled' ? 'destructive' : 'default',
          onPress: async () => {
            setUpdatingStatus(true);
            try {
              const updated = await reportService.updateReportStatus({ reportId: id, status: newStatus });
              setReport(updated);
            } catch {
              Alert.alert('Error', 'No se pudo actualizar el estado. Intenta de nuevo.');
            } finally {
              setUpdatingStatus(false);
            }
          },
        },
      ],
    );
  };

  const handleProcess = async () => {
    setProcessing(true);
    setProcessError(null);
    try {
      await matchService.requestReportProcessing(id);
      // Los matches llegarán por Realtime; como fallback recargamos tras 5s
      setTimeout(() => {
        matchService.getMatches(id).then(setMatches).catch(() => null);
      }, 5000);
    } catch (err) {
      setProcessError(err instanceof MatchError ? err.message : 'Error al procesar');
    } finally {
      setProcessing(false);
    }
  };

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
      {/* Foto principal */}
      {imageUrl ? (
        <View style={styles.photoContainer}>
          <Image source={{ uri: imageUrl }} style={styles.photo} resizeMode="contain" />
        </View>
      ) : null}

      {/* Encabezado */}
      <View style={styles.header}>
        <Badge label={reportTypeLabels[report.type]} color={reportTypeColor[report.type]} />
        <Text style={styles.status}>{reportStatusLabels[report.status]}</Text>
      </View>

      <Text style={styles.title}>{report.title}</Text>
      {report.description ? (
        <Text style={styles.description}>{report.description}</Text>
      ) : null}

      {/* Características */}
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

      {/* Coincidencias IA */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coincidencias de IA</Text>
        {matches.length > 0 ? (
          matches.map((m) => (
            <Pressable
              key={m.id}
              style={styles.matchCard}
              onPress={() => router.push(`/report/${m.candidateReportId}`)}
            >
              <View style={styles.matchHeader}>
                <Text style={styles.matchLabel}>Candidato #{m.rank ?? '?'}</Text>
                <View style={[styles.scoreBadge, compatColor(m.compatibility)]}>
                  <Text style={styles.scoreText}>{Math.round(m.compatibility)}%</Text>
                </View>
              </View>
              <View style={styles.scoreBar}>
                <View style={[styles.scoreBarFill, { width: `${m.compatibility}%` }]} />
              </View>
              <Text style={styles.matchSub}>Compatibilidad visual</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.empty}>Aún no hay coincidencias para este reporte.</Text>
        )}

        {processError ? <StatusBanner tone="error" message={processError} /> : null}

        <Button
          label="Buscar coincidencias con IA"
          variant="secondary"
          onPress={handleProcess}
          loading={processing}
        />
      </View>

      {/* Línea de tiempo del caso */}
      {updates.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actividad del caso</Text>
          {updates.map((u) => (
            <View key={u.id} style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineKind}>{kindLabel(u.kind)}</Text>
                {u.body ? <Text style={styles.timelineBody}>{u.body}</Text> : null}
                <Text style={styles.timelineDate}>
                  {new Date(u.createdAt).toLocaleString('es-MX', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Acciones del autor — solo si está cerca */}
      {isAuthor && report.status !== 'resolved' && report.status !== 'cancelled' && (
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Actualizar estado</Text>
          {updatingStatus && <ActivityIndicator color={colors.primary} />}
          {!updatingStatus && isNearReport && (
            <View style={styles.actionButtons}>
              <Pressable
                style={[styles.actionBtn, styles.actionBtnSuccess]}
                onPress={() => handleStatusChange('resolved', 'Resuelto — mascota localizada')}
              >
                <Text style={styles.actionBtnText}>✓ Mascota localizada</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.actionBtnWarning]}
                onPress={() => handleStatusChange('rescue_in_progress', 'Rescate en progreso')}
              >
                <Text style={styles.actionBtnText}>Estoy en rescate</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => handleStatusChange('cancelled', 'Cancelado')}
              >
                <Text style={styles.actionBtnText}>Cancelar reporte</Text>
              </Pressable>
            </View>
          )}
          {!updatingStatus && !isNearReport && distanceM !== null && (
            <StatusBanner
              tone="info"
              message={`Debes estar a menos de 500 m del lugar para actualizar el estado. Distancia actual: ${distanceM > 999 ? `${(distanceM / 1000).toFixed(1)} km` : `${distanceM} m`}.`}
            />
          )}
          {!updatingStatus && distanceM === null && (
            <StatusBanner tone="info" message="Verificando tu ubicación..." />
          )}
        </View>
      )}

      {/* Botón chat */}
      <Button
        label="Ir al chat del caso"
        onPress={() => router.push(`/case/${id}`)}
      />
    </ScreenContainer>
  );
}

const KIND_LABELS: Record<string, string> = {
  vision_processed: 'IA procesó el reporte',
  status_changed: 'Estado actualizado',
  member_joined: 'Nuevo miembro en el caso',
  rescuer_assigned: 'Rescatista asignado',
};

function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind;
}

function compatColor(score: number) {
  if (score >= 70) return { backgroundColor: colors.successMuted };
  if (score >= 40) return { backgroundColor: colors.warningMuted };
  return { backgroundColor: colors.dangerMuted };
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  photo: {
    width: '100%',
    height: '100%',
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
    marginBottom: spacing.sm,
  },
  detail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  section: {
    gap: spacing.sm,
  },
  matchCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  scoreBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  scoreText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  scoreBar: {
    height: 4,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  matchSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  empty: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 5,
    flexShrink: 0,
  },
  timelineContent: {
    flex: 1,
    gap: 2,
  },
  timelineKind: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  timelineBody: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  timelineDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  actionsSection: {
    gap: spacing.sm,
  },
  actionButtons: {
    gap: spacing.sm,
  },
  actionBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  actionBtnSuccess: {
    backgroundColor: colors.success,
  },
  actionBtnWarning: {
    backgroundColor: colors.warning,
  },
  actionBtnDanger: {
    backgroundColor: colors.danger,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});

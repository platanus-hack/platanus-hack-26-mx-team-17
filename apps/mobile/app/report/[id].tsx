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
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { IconBadge } from '../../src/components/ui/IconBadge';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { StatusBanner } from '../../src/components/ui/StatusBanner';
import { LocationCard } from '../../src/features/reports/components/LocationCard';
import {
  reportStatusLabels,
  reportTypeColor,
  reportTypeIcon,
  reportTypeLabels,
} from '../../src/features/reports/labels';
import { realtimeService, reportService, storageService } from '../../src/features/reports/reportService';
import { MatchError, matchService } from '../../src/features/matches/matchService';
import { focusStore } from '../../src/features/map/focusStore';
import { authService } from '../../src/features/auth/authService';
import type { ReportUpdate } from '../../src/types/reportUpdate';
import {
  colors,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  shadow,
  spacing,
  withAlpha,
} from '../../src/theme/tokens';
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchImages, setMatchImages] = useState<Record<string, string>>({});
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
      const last = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
      if (last) checkPos(last);
      const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      checkPos(fresh);
    }).catch(() => null);
  }, []);

  const loadReport = useCallback(async () => {
    setState('loading');
    try {
      const data = await reportService.getReportById(id);
      setReport(data);
      setState('success');

      authService.getCurrentUser().then((user) => {
        setIsAuthor(user?.id === data.authorId);
      }).catch(() => null);

      checkProximity(data.location.lat, data.location.lng);

      storageService.getPrimaryImage(id).then(async (img) => {
        if (!img) return;
        const url = await storageService.getReportImageUrl(img.storagePath).catch(() => null);
        if (url) setImageUrl(url);
      }).catch(() => null);

      matchService.getMatches(id).then(setMatches).catch(() => null);
      realtimeService.getReportUpdates(id).then(setUpdates).catch(() => null);
    } catch {
      setState('error');
    }
  }, [id, checkProximity]);

  useEffect(() => { void loadReport(); }, [loadReport]);

  useEffect(() => {
    return realtimeService.subscribeToReportUpdates(id, (update) => {
      setUpdates((prev) => [...prev, update]);
    });
  }, [id]);

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

  useEffect(() => {
    matches.forEach((m) => {
      const cid = m.candidateReportId;
      if (matchImages[cid]) return;
      storageService.getPrimaryImage(cid).then(async (img) => {
        if (!img) return;
        const url = await storageService.getReportImageUrl(img.storagePath).catch(() => null);
        if (url) setMatchImages((prev) => ({ ...prev, [cid]: url }));
      }).catch(() => null);
    });
  }, [matches]);

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
          <ActivityIndicator color={colors.primary} size="large" />
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

  const accent = reportTypeColor[report.type];

  return (
    <ScreenContainer>
      {/* Hero image — cover mode, 16:9, con placeholder de color */}
      <View style={styles.photoContainer}>
        {imageUrl ? (
          <>
            {!imageLoaded && (
              <View style={styles.photoPlaceholder}>
                <IconBadge icon={reportTypeIcon[report.type]} color={accent} size={56} />
              </View>
            )}
            <Image
              source={{ uri: imageUrl }}
              style={[styles.photo, !imageLoaded && styles.photoHidden]}
              resizeMode="cover"
              onLoad={() => setImageLoaded(true)}
            />
          </>
        ) : (
          <View style={styles.photoPlaceholder}>
            <IconBadge icon={reportTypeIcon[report.type]} color={accent} size={56} />
            <Text style={styles.photoPlaceholderText}>Sin foto adjunta</Text>
          </View>
        )}
        {/* Pill de tipo flotante sobre la imagen */}
        <View style={[styles.typePillOverlay, { backgroundColor: withAlpha(accent, 0.92) }]}>
          <Ionicons name={reportTypeIcon[report.type]} size={12} color="#fff" />
          <Text style={styles.typePillText}>{reportTypeLabels[report.type].toUpperCase()}</Text>
        </View>
      </View>

      {/* Encabezado */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{report.title}</Text>
        </View>
        <View style={[styles.statusPill, { borderColor: withAlpha(accent, 0.3) }]}>
          <View style={[styles.statusDot, { backgroundColor: accent }]} />
          <Text style={[styles.status, { color: accent }]}>
            {reportStatusLabels[report.status]}
          </Text>
        </View>
      </View>

      {report.description ? (
        <Text style={styles.description}>{report.description}</Text>
      ) : null}

      {/* Características */}
      {report.species || report.attributes ? (
        <Card>
          <Text style={styles.sectionTitle}>Características</Text>
          {report.species ? (
            <View style={styles.detailRow}>
              <Ionicons name="paw-outline" size={14} color={colors.textMuted} />
              <Text style={styles.detail}>Especie: {report.species}</Text>
            </View>
          ) : null}
          {report.attributes?.color ? (
            <View style={styles.detailRow}>
              <Ionicons name="color-palette-outline" size={14} color={colors.textMuted} />
              <Text style={styles.detail}>Color: {report.attributes.color}</Text>
            </View>
          ) : null}
          {report.attributes?.size ? (
            <View style={styles.detailRow}>
              <Ionicons name="resize-outline" size={14} color={colors.textMuted} />
              <Text style={styles.detail}>Tamaño: {report.attributes.size}</Text>
            </View>
          ) : null}
          {report.attributes?.breed ? (
            <View style={styles.detailRow}>
              <Ionicons name="ribbon-outline" size={14} color={colors.textMuted} />
              <Text style={styles.detail}>Raza: {report.attributes.breed}</Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      <LocationCard
        location={report.location}
        onViewOnMap={() => {
          focusStore.set({ lat: report.location.lat, lng: report.location.lng });
          router.back();
        }}
      />

      {/* Coincidencias IA */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coincidencias de IA</Text>
        <Text style={styles.sectionHint}>
          Candidatos visualmente compatibles. La IA no confirma identidad.
        </Text>
        {matches.length > 0 ? (
          matches.map((m) => {
            const tint = compatTint(m.compatibility);
            return (
              <Pressable
                key={m.id}
                style={styles.matchCard}
                onPress={() => router.push(`/report/${m.candidateReportId}`)}
              >
                <View style={styles.matchRow}>
                  {/* Thumbnail del candidato */}
                  <View style={styles.matchThumb}>
                    {matchImages[m.candidateReportId] ? (
                      <Image
                        source={{ uri: matchImages[m.candidateReportId] }}
                        style={styles.matchThumbImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.matchThumbPlaceholder, { backgroundColor: withAlpha(tint, 0.12) }]}>
                        <Ionicons name="paw-outline" size={22} color={tint} />
                      </View>
                    )}
                    <View style={[styles.rankBadge, { backgroundColor: tint }]}>
                      <Text style={styles.rankText}>#{m.rank ?? '?'}</Text>
                    </View>
                  </View>

                  {/* Info del candidato */}
                  <View style={styles.matchInfo}>
                    <View style={styles.matchHeader}>
                      <Text style={styles.matchLabel}>Candidato #{m.rank ?? '?'}</Text>
                      <View style={[styles.scoreBadge, { backgroundColor: withAlpha(tint, 0.14) }]}>
                        <Text style={[styles.scoreText, { color: tint }]}>
                          {Math.round(m.compatibility)}%
                        </Text>
                      </View>
                    </View>
                    <View style={styles.scoreBar}>
                      <View
                        style={[
                          styles.scoreBarFill,
                          { width: `${m.compatibility}%`, backgroundColor: tint },
                        ]}
                      />
                    </View>
                    <View style={styles.matchCta}>
                      <Text style={styles.matchSub}>Ver este caso</Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })
        ) : (
          <View style={styles.emptySection}>
            <Ionicons name="search-outline" size={28} color={colors.border} />
            <Text style={styles.empty}>Sin coincidencias aún.</Text>
          </View>
        )}

        {processError ? <StatusBanner tone="error" message={processError} /> : null}

        <Button
          label="Buscar coincidencias con IA"
          icon="hardware-chip-outline"
          variant="secondary"
          onPress={handleProcess}
          loading={processing}
        />
      </View>

      {/* Línea de tiempo del caso */}
      {updates.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actividad del caso</Text>
          {updates.map((u, i) => (
            <View key={u.id} style={styles.timelineItem}>
              <View style={styles.timelineRail}>
                <IconBadge icon={kindIcon(u.kind)} color={colors.primary} size={36} />
                {i < updates.length - 1 ? <View style={styles.timelineLine} /> : null}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineKind}>{kindLabel(u.kind)}</Text>
                {u.body ? <Text style={styles.timelineBody}>{u.body}</Text> : null}
                <Text style={styles.timelineDate}>
                  {new Date(u.createdAt).toLocaleString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
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
                onPress={() => handleStatusChange('resolved', 'Resuelto')}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>Mascota localizada</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.actionBtnWarning]}
                onPress={() => handleStatusChange('rescue_in_progress', 'Rescate en progreso')}
              >
                <Ionicons name="car-outline" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>Estoy en rescate</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => handleStatusChange('cancelled', 'Cancelado')}
              >
                <Ionicons name="close-circle" size={18} color="#fff" />
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

      <Button
        label="Ir al chat del caso"
        icon="chatbubbles-outline"
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

import type { ComponentProps } from 'react';
type IoniconsName = ComponentProps<typeof Ionicons>['name'];

const KIND_ICON_MAP: Record<string, IoniconsName> = {
  vision_processed: 'hardware-chip-outline',
  status_changed: 'refresh-outline',
  member_joined: 'person-add-outline',
  rescuer_assigned: 'medical-outline',
};

function kindIcon(kind: string): IoniconsName {
  return KIND_ICON_MAP[kind] ?? 'ellipse-outline';
}

function compatTint(score: number): string {
  if (score >= 70) return colors.success;
  if (score >= 40) return colors.warning;
  return colors.danger;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Hero image */
  photoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    ...shadow.sm,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoHidden: {
    opacity: 0,
    position: 'absolute',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  photoPlaceholderText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  typePillOverlay: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  typePillText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#fff',
    letterSpacing: letterSpacing.wide,
  },
  /* Encabezado */
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginTop: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  status: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.heavy,
    color: colors.text,
    letterSpacing: letterSpacing.tight,
    lineHeight: 34,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: letterSpacing.snug,
  },
  sectionHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: -spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.sm,
  },
  matchRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  matchThumb: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    overflow: 'visible',
    position: 'relative',
    flexShrink: 0,
  },
  matchThumbImg: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
  },
  matchThumbPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 9,
    fontWeight: fontWeight.heavy,
    color: '#fff',
  },
  matchInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  scoreBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  scoreText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  scoreBar: {
    height: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  matchCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  emptySection: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  empty: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  timelineRail: {
    alignItems: 'center',
    width: 36,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 16,
    backgroundColor: colors.border,
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
    gap: 2,
    paddingBottom: spacing.lg,
  },
  timelineKind: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  timelineBody: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    ...shadow.sm,
  },
  actionBtnSuccess: { backgroundColor: colors.success },
  actionBtnWarning: { backgroundColor: colors.warning },
  actionBtnDanger: { backgroundColor: colors.danger },
  actionBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { IconBadge } from '../../../components/ui/IconBadge';
import { colors, fontSize, fontWeight, letterSpacing, radius, shadow, spacing, withAlpha } from '../../../theme/tokens';
import type { Report } from '../../../types/report';
import { reportStatusLabels, reportTypeColor, reportTypeIcon, reportTypeLabels } from '../labels';

interface ReportCardProps {
  report: Report;
  onPress?: (report: Report) => void;
  onRoutePress?: (report: Report) => void;
}

export function ReportCard({ report, onPress, onRoutePress }: ReportCardProps) {
  const accent = reportTypeColor[report.type];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress?.(report)}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <IconBadge icon={reportTypeIcon[report.type]} color={accent} size={48} />

      <View style={styles.body}>
        <Text style={[styles.type, { color: accent }]}>
          {reportTypeLabels[report.type]}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {report.title}
        </Text>
        {report.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {report.description}
          </Text>
        ) : null}
        <View style={styles.footer}>
          <View style={[styles.statusDot, { backgroundColor: accent }]} />
          <Text style={styles.status}>{reportStatusLabels[report.status]}</Text>
          <Text style={styles.sep}>·</Text>
          <Text style={styles.meta}>
            {report.location.lat.toFixed(3)}, {report.location.lng.toFixed(3)}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {onRoutePress ? (
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); onRoutePress(report); }}
            style={styles.routeBtn}
            hitSlop={8}
          >
            <Ionicons name="navigate-outline" size={20} color="#1565C0" />
          </Pressable>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={withAlpha(accent, 0.6)} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.sm,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  body: {
    flex: 1,
    gap: 2,
  },
  type: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.wide,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: letterSpacing.snug,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 19,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  status: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  sep: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  meta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routeBtn: {
    padding: 4,
  },
});

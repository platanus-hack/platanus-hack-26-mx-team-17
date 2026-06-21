import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '../../../components/ui/Badge';
import { colors, fontSize, fontWeight, radius, spacing } from '../../../theme/tokens';
import type { Report } from '../../../types/report';
import { reportStatusLabels, reportTypeColor, reportTypeLabels } from '../labels';

interface ReportCardProps {
  report: Report;
  onPress?: (report: Report) => void;
}

export function ReportCard({ report, onPress }: ReportCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress?.(report)}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.header}>
        <Badge label={reportTypeLabels[report.type]} color={reportTypeColor[report.type]} />
        <Text style={styles.status}>{reportStatusLabels[report.status]}</Text>
      </View>
      <Text style={styles.title}>{report.title}</Text>
      {report.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {report.description}
        </Text>
      ) : null}
      <Text style={styles.meta}>
        {report.location.lat.toFixed(4)}, {report.location.lng.toFixed(4)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  status: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  meta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

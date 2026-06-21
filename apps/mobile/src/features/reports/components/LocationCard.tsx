import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontSize, fontWeight, letterSpacing, radius, spacing, withAlpha } from '../../../theme/tokens';
import type { ReportLocation } from '../../../types/report';

interface LocationCardProps {
  location: ReportLocation | null;
  onViewOnMap?: () => void;
}

/**
 * Tarjeta de ubicación de SOLO LECTURA.
 * La ubicación se toma del GPS y no se puede editar (regla de producto).
 */
export function LocationCard({ location, onViewOnMap }: LocationCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="location" size={20} color={colors.info} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Ubicación · GPS actual</Text>
        {location ? (
          <>
            <Text style={styles.coords}>
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </Text>
            <Text style={styles.meta}>
              Precisión ±{Math.round(location.accuracyM)} m ·{' '}
              {new Date(location.capturedAt).toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </>
        ) : (
          <Text style={styles.meta}>Obteniendo ubicación…</Text>
        )}
        <Text style={styles.note}>Se toma del GPS automáticamente; no se puede editar.</Text>

        {location && onViewOnMap ? (
          <Pressable
            onPress={onViewOnMap}
            style={({ pressed }) => [styles.mapBtn, pressed && styles.mapBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Ver ubicación en el mapa"
          >
            <Ionicons name="map-outline" size={14} color={colors.info} />
            <Text style={styles.mapBtnText}>Ver en mapa</Text>
            <Ionicons name="arrow-forward" size={13} color={colors.info} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: withAlpha(colors.info, 0.07),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: withAlpha(colors.info, 0.18),
    padding: spacing.lg,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: withAlpha(colors.info, 0.13),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.info,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.wide,
  },
  coords: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: letterSpacing.snug,
  },
  meta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  note: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: withAlpha(colors.info, 0.12),
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  mapBtnPressed: {
    opacity: 0.7,
  },
  mapBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.info,
  },
});

import { StyleSheet, Text } from 'react-native';

import { Card } from '../../../components/ui/Card';
import { colors, fontSize, fontWeight, spacing } from '../../../theme/tokens';
import type { ReportLocation } from '../../../types/report';

interface LocationCardProps {
  location: ReportLocation | null;
}

/**
 * Tarjeta de ubicación de SOLO LECTURA.
 *
 * Regla de producto: el reporte se crea ÚNICAMENTE con el GPS actual; la
 * ubicación no se elige, edita ni arrastra. Por eso esta tarjeta no tiene
 * controles editables. En la fase mock muestra coords placeholder; luego
 * reflejará la lectura real de `getCurrentReportLocation()` (Rol 1).
 */
export function LocationCard({ location }: LocationCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Ubicación (GPS actual)</Text>
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
      <Text style={styles.note}>
        La ubicación se toma automáticamente del GPS y no se puede editar.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primaryStrong,
  },
  coords: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  meta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  note: {
    fontSize: fontSize.xs,
    color: colors.primaryStrong,
    marginTop: spacing.xs,
  },
});

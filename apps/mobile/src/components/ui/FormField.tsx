import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '../../theme/tokens';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  helper?: string;
  error?: string;
}

/**
 * Envoltorio de campo de formulario: etiqueta, ayuda y mensaje de error.
 * Usado por TextField y por controles no textuales (segmented, tarjetas).
 */
export function FormField({ label, children, required, helper, error }: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  required: {
    color: colors.danger,
  },
  helper: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.danger,
  },
});

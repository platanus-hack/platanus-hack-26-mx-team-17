import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { FormField } from '../../src/components/ui/FormField';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { StatusBanner } from '../../src/components/ui/StatusBanner';
import { TextField } from '../../src/components/ui/TextField';
import { LocationCard } from '../../src/features/reports/components/LocationCard';
import { reportTypeOptions } from '../../src/features/reports/labels';
import { getCurrentReportLocation, LocationError } from '../../src/features/map/location';
import { useCreateReportForm } from '../../src/features/reports/useCreateReportForm';
import { colors, fontSize, spacing } from '../../src/theme/tokens';
import type { ReportLocation } from '../../src/types/report';

/**
 * Formulario de creación de reporte (fase mock).
 *
 * - Ubicación SÓLO GPS actual (placeholder mock; Rol 1 conecta el GPS real).
 * - Imagen: placeholder (Rol 4 conecta expo-image-picker en fase posterior).
 * - Envío vía `reportService` (mock; Rol 2 conecta Supabase).
 * - Maneja estados: vacío, validación, enviando, éxito y error.
 */
export default function NewReportScreen() {
  const router = useRouter();
  const { fields, errors, status, submitError, setField, submit } = useCreateReportForm();

  // Captura GPS real (Rol 1): SÓLO ubicación actual, no editable.
  const [location, setLocation] = useState<ReportLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getCurrentReportLocation()
      .then((loc) => {
        if (active) setLocation(loc);
      })
      .catch((error) => {
        if (!active) return;
        setLocationError(
          error instanceof LocationError
            ? error.message
            : 'No se pudo obtener la ubicación actual.',
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async () => {
    const created = await submit(location);
    if (created) {
      router.replace(`/report/${created.id}`);
    }
  };

  return (
    <ScreenContainer>
      <FormField label="Tipo de reporte" required error={errors.type}>
        <SegmentedControl
          options={reportTypeOptions}
          value={fields.type}
          onChange={(value) => setField('type', value)}
        />
      </FormField>

      <TextField
        label="Título"
        required
        value={fields.title}
        onChangeText={(text) => setField('title', text)}
        placeholder="Ej. Luna — perrita café perdida"
        error={errors.title}
      />

      <TextField
        label="Descripción"
        value={fields.description}
        onChangeText={(text) => setField('description', text)}
        placeholder="Señas, comportamiento, dónde se vio por última vez…"
        multiline
      />

      <TextField
        label="Especie"
        value={fields.species}
        onChangeText={(text) => setField('species', text)}
        placeholder="Perro, gato…"
      />

      <View style={styles.attrRow}>
        <View style={styles.attrItem}>
          <TextField
            label="Color"
            value={fields.color}
            onChangeText={(text) => setField('color', text)}
            placeholder="Café"
          />
        </View>
        <View style={styles.attrItem}>
          <TextField
            label="Tamaño"
            value={fields.size}
            onChangeText={(text) => setField('size', text)}
            placeholder="Mediano"
          />
        </View>
      </View>

      <TextField
        label="Raza estimada"
        value={fields.breed}
        onChangeText={(text) => setField('breed', text)}
        placeholder="Mestizo"
      />

      {/* Placeholder de imagen: la captura/selección real la integra Rol 4 con
          expo-image-picker en una fase posterior. */}
      <FormField label="Foto" helper="La carga de imagen se integra próximamente.">
        <Card style={styles.imagePlaceholder}>
          <Text style={styles.imageText}>📷 Agregar foto (próximamente)</Text>
        </Card>
      </FormField>

      <LocationCard location={location} />

      {locationError ? <StatusBanner tone="error" message={locationError} /> : null}
      {errors.location ? <StatusBanner tone="error" message={errors.location} /> : null}
      {status === 'error' && submitError ? (
        <StatusBanner tone="error" message={submitError} />
      ) : null}

      <Button
        label="Crear reporte"
        onPress={handleSubmit}
        loading={status === 'submitting'}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  attrRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  attrItem: {
    flex: 1,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96,
    backgroundColor: colors.surfaceMuted,
    borderStyle: 'dashed',
  },
  imageText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});

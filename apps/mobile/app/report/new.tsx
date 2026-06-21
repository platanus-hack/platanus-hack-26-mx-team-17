import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { FormField } from '../../src/components/ui/FormField';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { StatusBanner } from '../../src/components/ui/StatusBanner';
import { TextField } from '../../src/components/ui/TextField';
import { LocationCard } from '../../src/features/reports/components/LocationCard';
import { reportTypeOptions } from '../../src/features/reports/labels';
import { useCreateReportForm } from '../../src/features/reports/useCreateReportForm';
import { colors, fontSize, spacing } from '../../src/theme/tokens';
import type { ReportLocation } from '../../src/types/report';

export default function NewReportScreen() {
  const router = useRouter();
  const { fields, errors, status, submitError, setField, submit } = useCreateReportForm();

  const [location, setLocation] = useState<ReportLocation | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Captura GPS real al montar la pantalla
  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(async ({ status: s }) => {
      if (s !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyM: pos.coords.accuracy ?? 0,
        capturedAt: new Date().toISOString(),
      });
    });
  }, []);

  const pickPhoto = async () => {
    const { status: s } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (s !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status: s } = await ImagePicker.requestCameraPermissionsAsync();
    if (s !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    const created = await submit(location, photoUri);
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

      {/* Selector de foto */}
      <FormField label="Foto">
        {photoUri ? (
          <TouchableOpacity onPress={pickPhoto} activeOpacity={0.8}>
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
            <Text style={styles.changePhoto}>Cambiar foto</Text>
          </TouchableOpacity>
        ) : (
          <Card style={styles.photoCard}>
            <TouchableOpacity style={styles.photoOption} onPress={takePhoto} activeOpacity={0.7}>
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={styles.photoLabel}>Tomar foto</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.photoOption} onPress={pickPhoto} activeOpacity={0.7}>
              <Text style={styles.photoIcon}>🖼️</Text>
              <Text style={styles.photoLabel}>Elegir de galería</Text>
            </TouchableOpacity>
          </Card>
        )}
      </FormField>

      <LocationCard location={location} />

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
  photoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 96,
    padding: 0,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    borderStyle: 'dashed',
  },
  photoOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  photoIcon: {
    fontSize: 28,
  },
  photoLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: colors.border,
  },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  changePhoto: {
    textAlign: 'center',
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: spacing.xs,
  },
});

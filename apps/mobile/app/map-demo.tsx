import { StyleSheet, View } from 'react-native';

import { MapView } from '../src/features/map/MapView';

/**
 * Ruta TEMPORAL de prueba (Rol 1) — verifica que Mapbox renderiza dentro del
 * development build, sin tocar el flujo de reportes de Rol 4 (app/index.tsx).
 *
 * Se alcanza por deep link `huellasos://map-demo` o navegando a `/map-demo`
 * en el dev client. Eliminar cuando el mapa se integre en la home definitiva.
 *
 * Mapbox es NATIVO: requiere un NUEVO development build (no funciona en Expo
 * Go). Aún sin ubicación, marcadores ni tracking.
 */
export default function MapDemoScreen() {
  return (
    <View style={styles.container}>
      <MapView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

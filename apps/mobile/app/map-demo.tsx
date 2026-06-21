import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../src/components/ui/ScreenContainer';
import { StatusBanner } from '../src/components/ui/StatusBanner';
import { colors, fontSize, fontWeight, radius, spacing } from '../src/theme/tokens';

/**
 * Ruta TEMPORAL de prueba (Rol 1) — verifica que Mapbox renderiza dentro del
 * development build, sin tocar el flujo de reportes de Rol 4 (app/index.tsx).
 *
 * Se alcanza por deep link huellasos://map-demo o navegando a /map-demo
 * en el dev client. Eliminar cuando el mapa se integre en la home definitiva.
 *
 * NOTA (Rol 4): este es un PLACEHOLDER sin `@rnmapbox/maps`. El módulo de
 * mapa es NATIVO; requiere instalar la dependencia, su config plugin en
 * app.config.ts y un NUEVO development build. Hasta entonces esta pantalla
 * sólo confirma que la ruta y el deep link `huellasos://map-demo` funcionan.
 * Rol 1: sustituir el contenido de <View style={styles.canvas}> por el
 * <MapView> real una vez hecho el rebuild con el nativo.
 */
export default function MapDemoScreen() {
  return (
    <ScreenContainer>
      <Text style={styles.title}>Demo de mapa</Text>
      <StatusBanner
        tone="info"
        message="Ruta de prueba activa. El mapa nativo (@rnmapbox/maps) se agrega en un rebuild posterior; por ahora esto sólo valida el deep link huellasos://map-demo."
      />
      <View style={styles.canvas}>
        <Text style={styles.placeholder}>Aquí irá el MapView (Rol 1)</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  canvas: {
    flex: 1,
    minHeight: 240,
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
});

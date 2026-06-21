import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '../src/theme/tokens';

/**
 * Layout raíz de navegación (Expo Router).
 *
 * Scaffolding COMPARTIDO: define el Stack base. Las rutas de cada rol se
 * agregan como pantallas dentro de app/. Coordinar con Rol 1 (mapa/home) y
 * Rol 2 (auth) al añadir sus grupos de rutas.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Huella SOS' }} />
        <Stack.Screen name="report/new" options={{ title: 'Nuevo reporte' }} />
        <Stack.Screen name="report/[id]" options={{ title: 'Detalle del caso' }} />
        <Stack.Screen name="report/[id]/tracking" options={{ title: 'Rescate' }} />
        {/* TEMPORAL (Rol 1): verificación de Mapbox en el dev build. Quitar al integrar el mapa en la home. */}
        <Stack.Screen name="map-demo" options={{ title: 'Demo de mapa' }} />
      </Stack>
    </SafeAreaProvider>
  );
}

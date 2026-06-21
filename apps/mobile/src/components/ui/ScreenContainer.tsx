import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../../theme/tokens';

interface ScreenContainerProps {
  children: ReactNode;
  /** Si true, envuelve el contenido en un ScrollView. Default true. */
  scroll?: boolean;
  contentStyle?: ViewStyle;
}

/**
 * Contenedor base de pantalla: área segura + fondo + padding consistente.
 * Toda pantalla debe envolverse aquí para mantener layout uniforme.
 */
export function ScreenContainer({
  children,
  scroll = true,
  contentStyle,
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.flex, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
});

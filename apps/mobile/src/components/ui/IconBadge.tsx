import { StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { radius, withAlpha } from '../../theme/tokens';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];
type IconBadgeVariant = 'soft' | 'solid';

interface IconBadgeProps {
  icon: IoniconsName;
  color: string;
  size?: number;
  variant?: IconBadgeVariant;
  style?: ViewStyle;
}

/**
 * Token circular con ícono vectorial — elemento firma de Huella SOS.
 *
 * Un mismo "token" representa cada tipo de reporte / evento a lo largo de la
 * app (tarjetas, selector, timeline, alertas), unificando el lenguaje visual.
 */
export function IconBadge({
  icon,
  color,
  size = 44,
  variant = 'soft',
  style,
}: IconBadgeProps) {
  const isSolid = variant === 'solid';
  const iconSize = Math.round(size * 0.47);
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          backgroundColor: isSolid ? color : withAlpha(color, 0.13),
        },
        style,
      ]}
    >
      <Ionicons
        name={icon}
        size={iconSize}
        color={isSolid ? '#ffffff' : color}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

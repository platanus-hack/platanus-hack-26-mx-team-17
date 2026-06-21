import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '../../theme/tokens';

type BannerTone = 'info' | 'success' | 'error' | 'warning';

interface StatusBannerProps {
  tone: BannerTone;
  message: string;
}

export function StatusBanner({ tone, message }: StatusBannerProps) {
  const palette = TONES[tone];
  return (
    <View style={[styles.banner, { backgroundColor: palette.bg, borderColor: palette.fg }]}>
      <Text style={[styles.text, { color: palette.fg }]}>{message}</Text>
    </View>
  );
}

const TONES: Record<BannerTone, { bg: string; fg: string }> = {
  info: { bg: colors.primaryMuted, fg: colors.primaryStrong },
  success: { bg: colors.successMuted, fg: colors.success },
  error: { bg: colors.dangerMuted, fg: colors.danger },
  warning: { bg: colors.warningMuted, fg: colors.warning },
};

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  text: {
    fontSize: fontSize.sm,
  },
});

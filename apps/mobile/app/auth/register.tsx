import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '../../src/components/ui/Button';
import { StatusBanner } from '../../src/components/ui/StatusBanner';
import { TextField } from '../../src/components/ui/TextField';
import { AuthError, authService } from '../../src/features/auth/authService';
import { colors, fontSize, fontWeight, spacing } from '../../src/theme/tokens';

export default function RegisterScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await authService.signInWithGoogle();
      router.replace('/report/new');
    } catch (err) {
      if (err instanceof AuthError && err.message === 'Autenticación cancelada') return;
      setError(err instanceof AuthError ? err.message : 'Error con Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!displayName.trim()) {
      setError('Ingresa tu nombre');
      return;
    }
    if (!email.trim()) {
      setError('Ingresa tu correo electrónico');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.signUpWithEmail(email.trim().toLowerCase(), password, displayName.trim());
      router.replace('/report/new');
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Crear cuenta</Text>
            <Text style={styles.subtitle}>Únete y ayuda a rescatar animales</Text>
          </View>

          <View style={styles.form}>
            <TextField
              label="Nombre"
              required
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Tu nombre o apodo"
            />
            <TextField
              label="Correo electrónico"
              required
              value={email}
              onChangeText={setEmail}
              placeholder="correo@ejemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextField
              label="Contraseña"
              required
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              autoCapitalize="none"
            />

            {error ? <StatusBanner tone="error" message={error} /> : null}

            <Button label="Crear cuenta" onPress={handleRegister} loading={loading} />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o continúa con</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              label="Continuar con Google"
              variant="secondary"
              onPress={handleGoogle}
              loading={googleLoading}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
            <Pressable onPress={() => router.replace('/auth/login')}>
              <Text style={styles.link}>Iniciar sesión</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.xxl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
  form: {
    gap: spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  link: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});

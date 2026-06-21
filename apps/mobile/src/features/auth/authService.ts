import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_EXISTS'
  | 'VALIDATION'
  | 'NETWORK'
  | 'UNKNOWN';

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

function mapAuthError(error: { message: string }): AuthError {
  const msg = error.message;
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
    return new AuthError('INVALID_CREDENTIALS', 'Correo o contraseña incorrectos');
  }
  if (msg.includes('already registered') || msg.includes('User already registered')) {
    return new AuthError('EMAIL_EXISTS', 'Este correo ya está registrado');
  }
  if (msg.includes('valid email')) {
    return new AuthError('VALIDATION', 'Correo electrónico inválido');
  }
  return new AuthError('NETWORK', msg);
}

function mapUser(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    displayName:
      (user.user_metadata?.display_name as string | undefined) ??
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split('@')[0] ??
      '',
  };
}

export const authService = {
  async signUpWithEmail(
    email: string,
    password: string,
    displayName: string,
  ): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw mapAuthError(error);
    if (!data.user) throw new AuthError('UNKNOWN', 'No se pudo crear la cuenta');
    return mapUser(data.user);
  },

  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw mapAuthError(error);
    if (!data.user) throw new AuthError('UNKNOWN', 'Error al iniciar sesión');
    return mapUser(data.user);
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw mapAuthError(error);
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ? mapUser(user) : null;
  },

  async signInWithGoogle(): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'huellasos://auth/callback',
        skipBrowserRedirect: true,
      },
    });

    if (error) throw mapAuthError(error);
    if (!data.url) throw new AuthError('UNKNOWN', 'No se obtuvo URL de autenticación');

    const result = await WebBrowser.openAuthSessionAsync(data.url, 'huellasos://auth/callback');

    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new AuthError('UNKNOWN', 'Autenticación cancelada');
    }
    if (result.type !== 'success') {
      throw new AuthError('NETWORK', 'Error abriendo el navegador');
    }

    const fragment = result.url.split('#')[1] ?? '';
    const params = new URLSearchParams(fragment);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      throw new AuthError('UNKNOWN', 'No se recibieron tokens de Google');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) throw mapAuthError(sessionError);
    if (!sessionData.user) throw new AuthError('UNKNOWN', 'Error al establecer sesión');

    return mapUser(sessionData.user);
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ? mapUser(session.user) : null);
    });
    return () => subscription.unsubscribe();
  },
};

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase compartido (singleton).
 *
 * CREADO POR Rol 1 porque el tracking/Realtime lo necesitan y aún no existía.
 * Es INFRAESTRUCTURA DE DATOS (propiedad de Rol 2): cuando Rol 2 estandarice
 * su capa de acceso, debe ADOPTAR este mismo singleton — NO duplicar clientes
 * (ver CLAUDE.md → "No duplicar clientes de Supabase").
 *
 * Sólo usa claves PÚBLICAS permitidas en el cliente (CLAUDE.md → Seguridad):
 * `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
 * NUNCA el service role ni secretos.
 */
const extra = Constants.expoConfig?.extra ?? {};

const supabaseUrl: string =
  typeof extra.supabaseUrl === 'string' ? extra.supabaseUrl : '';
const supabaseKey: string =
  typeof extra.supabasePublishableKey === 'string'
    ? extra.supabasePublishableKey
    : '';

/** ¿Hay credenciales públicas de Supabase configuradas? */
export const hasSupabaseConfig = supabaseUrl.length > 0 && supabaseKey.length > 0;

/**
 * Instancia única. Si faltan credenciales se crea igualmente con strings
 * vacíos (las llamadas fallarán con NETWORK), de modo que los servicios
 * manejen el error en vez de romper en import. `hasSupabaseConfig` permite
 * a la UI mostrar un estado claro.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

import { useEffect, useState } from 'react';

import { authService, type AuthUser } from './authService';

type AuthState = AuthUser | null | undefined; // undefined = cargando

export function useAuth() {
  const [user, setUser] = useState<AuthState>(undefined);

  useEffect(() => {
    authService.getCurrentUser().then(setUser).catch(() => setUser(null));
    return authService.onAuthStateChange(setUser);
  }, []);

  return {
    user,
    isLoading: user === undefined,
    isAuthenticated: user != null,
  };
}

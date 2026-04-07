import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────
export type UserRole = 'personal' | 'student';

export interface User {
  id:       string;
  name:     string;
  email:    string;
  role:     UserRole;
  avatar?:  string;
}

interface AuthState {
  user:        User | null;
  token:       string | null;
  isLoading:   boolean;
  isAuthenticated: boolean;
}

interface AuthContextData extends AuthState {
  signIn:  (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// ─── Context ─────────────────────────────────
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const STORAGE_KEYS = {
  USER:  '@fitgym:user',
  TOKEN: '@fitgym:token',
} as const;

// ─── Provider ────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user:            null,
    token:           null,
    isLoading:       true,
    isAuthenticated: false,
  });

  // Restaura sessão ao abrir o app
  useEffect(() => {
    (async () => {
      try {
        const [storedUser, storedToken] = await AsyncStorage.multiGet([
          STORAGE_KEYS.USER,
          STORAGE_KEYS.TOKEN,
        ]);
        const user  = storedUser[1]  ? (JSON.parse(storedUser[1]) as User) : null;
        const token = storedToken[1] ?? null;

        setState({ user, token, isLoading: false, isAuthenticated: !!token });
      } catch {
        setState(s => ({ ...s, isLoading: false }));
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    // TODO: substituir pela chamada real à API
    const mockUser: User = {
      id:    '1',
      name:  'João Personal',
      email,
      role:  email.includes('personal') ? 'personal' : 'student',
    };
    const mockToken = 'mock-jwt-token';

    await AsyncStorage.multiSet([
      [STORAGE_KEYS.USER,  JSON.stringify(mockUser)],
      [STORAGE_KEYS.TOKEN, mockToken],
    ]);

    setState({
      user:            mockUser,
      token:           mockToken,
      isLoading:       false,
      isAuthenticated: true,
    });
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove([STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN]);
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
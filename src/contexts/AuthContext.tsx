import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authService } from '../services/auth.service'
import type {
  RegisterStudentPayload,
  RegisterPersonalPayload,
} from '../services/auth.service'

// ─── Types ───────────────────────────────────
export type UserRole = 'PERSONAL' | 'STUDENT'

export interface User {
  id:      string
  name:    string
  email:   string
  role:    UserRole
  avatar?: string
}

interface AuthState {
  user:            User | null
  token:           string | null
  isLoading:       boolean
  isAuthenticated: boolean
}

interface AuthContextData extends AuthState {
  signIn:           (email: string, password: string) => Promise<void>
  signOut:          () => Promise<void>
  registerStudent:  (payload: RegisterStudentPayload) => Promise<void>
  registerPersonal: (payload: RegisterPersonalPayload) => Promise<void>
}

// ─── Context ─────────────────────────────────
const AuthContext = createContext<AuthContextData>({} as AuthContextData)

const STORAGE_KEYS = {
  USER:          '@fitgym:user',
  TOKEN:         '@fitgym:token',
  REFRESH_TOKEN: '@fitgym:refresh_token',
} as const

// ─── Provider ────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user:            null,
    token:           null,
    isLoading:       true,
    isAuthenticated: false,
  })

  // Restaura sessão ao abrir o app
  useEffect(() => {
    (async () => {
      try {
        const [storedUser, storedToken] = await AsyncStorage.multiGet([
          STORAGE_KEYS.USER,
          STORAGE_KEYS.TOKEN,
        ])
        const user  = storedUser[1]  ? (JSON.parse(storedUser[1]) as User) : null
        const token = storedToken[1] ?? null

        setState({ user, token, isLoading: false, isAuthenticated: !!token })
      } catch {
        setState(s => ({ ...s, isLoading: false }))
      }
    })()
  }, [])

  // ─── Persiste sessão ─────────────────────────
  const persistSession = useCallback(async (user: User, token: string, refreshToken: string) => {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.USER,          JSON.stringify(user)],
      [STORAGE_KEYS.TOKEN,         token],
      [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
    ])
    setState({ user, token, isLoading: false, isAuthenticated: true })
  }, [])

  // ─── Sign In ─────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    const { user, accessToken, refreshToken } = await authService.login({ email, password })
    await persistSession(user, accessToken, refreshToken)
  }, [persistSession])

  // ─── Sign Out ─────────────────────────────────
  const signOut = useCallback(async () => {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
      if (refreshToken) await authService.logout(refreshToken)
    } catch {
      // ignora erro de rede no logout
    } finally {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER,
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
      ])
      setState({ user: null, token: null, isLoading: false, isAuthenticated: false })
    }
  }, [])

  // ─── Register Student ─────────────────────────
  const registerStudent = useCallback(async (payload: RegisterStudentPayload) => {
    const { user, accessToken, refreshToken } = await authService.registerStudent(payload)
    await persistSession(user, accessToken, refreshToken)
  }, [persistSession])

  // ─── Register Personal ────────────────────────
  const registerPersonal = useCallback(async (payload: RegisterPersonalPayload) => {
    const { user, accessToken, refreshToken } = await authService.registerPersonal(payload)
    await persistSession(user, accessToken, refreshToken)
  }, [persistSession])

  return (
    <AuthContext.Provider value={{
      ...state,
      signIn,
      signOut,
      registerStudent,
      registerPersonal,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
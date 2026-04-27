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
  id:            string
  name:          string
  email:         string
  cpf?:          string
  role:          UserRole
  avatar?:       string
  phone?:        string
  sex?:          string
  birthDate?:    string
  userCode?:     string 
  cep?:          string
  street?:       string
  number?:       string
  neighborhood?: string
  city?:         string
  state?:        string
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
  registerStudent:  (payload: RegisterStudentPayload) => Promise<User>
  registerPersonal: (payload: RegisterPersonalPayload) => Promise<User>
  activateSession:  () => Promise<void>
  updateUser:       (updated: Partial<User>) => Promise<void>
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

  useEffect(() => {
    (async () => {
      try {
        const [storedUser, storedToken] = await AsyncStorage.multiGet([
          STORAGE_KEYS.USER,
          STORAGE_KEYS.TOKEN,
        ])
        const token = storedToken[1] ?? null

        if (!token) {
          setState({ user: null, token: null, isLoading: false, isAuthenticated: false })
          return
        }

        const user = await authService.me()
        setState({ user, token, isLoading: false, isAuthenticated: true })
      } catch {
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.USER,
          STORAGE_KEYS.TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
        ])
        setState({ user: null, token: null, isLoading: false, isAuthenticated: false })
      }
    })()
  }, [])

  const persistSession = useCallback(async (user: User, token: string, refreshToken: string) => {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.USER,          JSON.stringify(user)],
      [STORAGE_KEYS.TOKEN,         token],
      [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
    ])
    setState({ user, token, isLoading: false, isAuthenticated: true })
  }, [])

  const updateUser = useCallback(async (updated: Partial<User>) => {
    setState(prev => {
      if (!prev.user) return prev
      const newUser = { ...prev.user, ...updated }
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser))
      return { ...prev, user: newUser }
    })
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { user, accessToken, refreshToken } = await authService.login({ email, password })
    await persistSession(user, accessToken, refreshToken)
  }, [persistSession])

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

  const registerStudent = useCallback(async (payload: RegisterStudentPayload) => {
    const { user, accessToken, refreshToken } = await authService.registerStudent(payload)
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.USER,          JSON.stringify(user)],
      [STORAGE_KEYS.TOKEN,         accessToken],
      [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
    ])
    return user
  }, [])

  const registerPersonal = useCallback(async (payload: RegisterPersonalPayload) => {
    const { user, accessToken, refreshToken } = await authService.registerPersonal(payload)
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.USER,          JSON.stringify(user)],
      [STORAGE_KEYS.TOKEN,         accessToken],
      [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
    ])
    return user
  }, [])

  const activateSession = useCallback(async () => {
    try {
      const [storedUser, storedToken] = await AsyncStorage.multiGet([
        STORAGE_KEYS.USER,
        STORAGE_KEYS.TOKEN,
      ])
      const user  = storedUser[1]  ? (JSON.parse(storedUser[1]) as User) : null
      const token = storedToken[1] ?? null
      setState({ user, token, isLoading: false, isAuthenticated: true })
    } catch {
      setState(s => ({ ...s, isAuthenticated: false }))
    }
  }, [])

  return (
    <AuthContext.Provider value={{
      ...state,
      signIn,
      signOut,
      registerStudent,
      registerPersonal,
      activateSession,
      updateUser,
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
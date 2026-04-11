import AsyncStorage from '@react-native-async-storage/async-storage'
const BASE_URL = 'http://192.168.1.4'

const STORAGE_KEYS = {
  ACCESS_TOKEN:  '@fitgym:token',
  REFRESH_TOKEN: '@fitgym:refresh_token',
} as const

// ─── Types ───────────────────────────────────
interface RequestOptions extends RequestInit {
  authenticated?: boolean
}

interface ApiError {
  message: string
  errors?:  Record<string, string[]>
}

// ─── Helper: pega o token salvo ──────────────
async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
}

// ─── Helper: renova o token ──────────────────
async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
    if (!refreshToken) return null

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken }),
    })

    if (!res.ok) return null

    const data = await res.json()
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.ACCESS_TOKEN,  data.accessToken],
      [STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken],
    ])

    return data.accessToken
  } catch {
    return null
  }
}

// ─── Client principal ────────────────────────
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { authenticated = false, headers = {}, ...rest } = options

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  }

  // Adiciona token se rota autenticada
  if (authenticated) {
    let token = await getAccessToken()

    if (!token) {
      token = await refreshAccessToken()
    }

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: requestHeaders,
    ...rest,
  })

  // Token expirado — tenta renovar e repetir
  if (response.status === 401 && authenticated) {
    const newToken = await refreshAccessToken()

    if (newToken) {
      requestHeaders['Authorization'] = `Bearer ${newToken}`
      const retry = await fetch(`${BASE_URL}${path}`, {
        headers: requestHeaders,
        ...rest,
      })

      if (!retry.ok) {
        const err: ApiError = await retry.json()
        throw err
      }

      return retry.json() as Promise<T>
    }
  }

  if (!response.ok) {
    const err: ApiError = await response.json()
    throw err
  }

  // 204 No Content
  if (response.status === 204) return null as T

  return response.json() as Promise<T>
}
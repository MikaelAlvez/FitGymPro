import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

const getBaseUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants.manifest as any)?.debuggerHost
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0]
    return `http://${host}:3333`
  }
  return 'http://10.0.2.2:3333'
}

const BASE_URL = getBaseUrl()

const STORAGE_KEYS = {
  ACCESS_TOKEN:  '@fitgym:token',
  REFRESH_TOKEN: '@fitgym:refresh_token',
} as const

interface RequestOptions extends RequestInit {
  authenticated?: boolean
}

interface ApiError {
  message: string
  errors?:  Record<string, string[]>
}

async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
}

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

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { authenticated = false, headers = {}, body, method = 'GET', ...rest } = options

  const requestHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  }

  if (body) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  if (authenticated) {
    let token = await getAccessToken()
    if (!token) token = await refreshAccessToken()
    if (token) requestHeaders['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body,
    ...rest,
  })

  // Token expirado — tenta renovar e repetir
  if (response.status === 401 && authenticated) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      requestHeaders['Authorization'] = `Bearer ${newToken}`
      const retry = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: requestHeaders,
        body,
        ...rest,
      })
      if (!retry.ok) {
        const err: ApiError = await retry.json()
        throw err
      }
      if (retry.status === 204) return null as T
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
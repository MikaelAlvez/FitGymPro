import Constants from 'expo-constants'

const PRODUCTION_URL = 'https://api-fitgympro-production.up.railway.app'

export function getBaseUrl(): string {
  if (!__DEV__) return PRODUCTION_URL

  const host = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants.manifest as any)?.debuggerHost

  if (host) return `http://${host.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}
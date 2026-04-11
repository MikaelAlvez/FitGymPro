import * as ImagePicker from 'expo-image-picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants    from 'expo-constants'

// ─── Config ──────────────────────────────────
const getBaseUrl = () => {
  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost ??
    Constants.manifest?.debuggerHost

  if (debuggerHost) return `http://${debuggerHost.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}

// ─── Pede permissão e abre galeria ───────────
export async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

  if (status !== 'granted') {
    throw new Error('Permissão para acessar a galeria foi negada.')
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes:          ImagePicker.MediaTypeOptions.Images,
    allowsEditing:       true,
    aspect:              [1, 1],   // recorte quadrado
    quality:             0.7,      // comprime 70%
    base64:              false,
  })

  if (result.canceled) return null
  return result.assets[0].uri
}

// ─── Abre câmera ─────────────────────────────
export async function takePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync()

  if (status !== 'granted') {
    throw new Error('Permissão para usar a câmera foi negada.')
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect:        [1, 1],
    quality:       0.7,
  })

  if (result.canceled) return null
  return result.assets[0].uri
}

// ─── Faz upload do avatar ─────────────────────
export async function uploadAvatar(uri: string): Promise<string> {
  const token = await AsyncStorage.getItem('@fitgym:token')

  // Cria o FormData com o arquivo
  const formData = new FormData()
  const filename = uri.split('/').pop() ?? 'avatar.jpg'
  const match    = /\.(\w+)$/.exec(filename)
  const type     = match ? `image/${match[1]}` : 'image/jpeg'

  formData.append('avatar', {
    uri,
    name: filename,
    type,
  } as any)

  const response = await fetch(`${getBaseUrl()}/upload/avatar`, {
    method:  'POST',
    headers: {
      'Content-Type':  'multipart/form-data',
      Authorization:   token ? `Bearer ${token}` : '',
    },
    body: formData,
  })

  if (!response.ok) {
    const body = await response.json()
    throw new Error(body.message ?? 'Erro ao fazer upload da foto.')
  }

  const { url } = await response.json()
  return url
}
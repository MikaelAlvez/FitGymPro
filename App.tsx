import React, { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as NavigationBar from 'expo-navigation-bar'
import { Platform } from 'react-native'
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'
import * as SplashScreen from 'expo-splash-screen'
import { AuthProvider }  from './src/contexts/AuthContext'
import { RootNavigator } from './src/navigation/RootNavigator'
import { colors } from './src/theme'

SplashScreen.preventAutoHideAsync()

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  // Esconde a barra de navegação do Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden')
      NavigationBar.setBehaviorAsync('overlay-swipe')
    }
  }, [])

  const onLayoutRootView = React.useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
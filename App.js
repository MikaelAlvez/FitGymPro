import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Login from './assets/src/screens/Login';
import { colors } from './assets/src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Login />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
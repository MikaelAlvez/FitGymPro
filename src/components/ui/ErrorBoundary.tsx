import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

interface State { hasError: boolean; error: string }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: '' }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Erro</Text>
          <Text style={styles.message}>{this.state.error}</Text>
          <TouchableOpacity onPress={() => this.setState({ hasError: false, error: '' })}>
            <Text style={styles.retry}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )
    }
    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#0F0F0F' },
  title:     { fontSize: 20, fontWeight: 'bold', color: '#FF4444', marginBottom: 12 },
  message:   { fontSize: 14, color: '#FFFFFF', textAlign: 'center', marginBottom: 20 },
  retry:     { fontSize: 16, color: '#6366F1', fontWeight: 'bold' },
})

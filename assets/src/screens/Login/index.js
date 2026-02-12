import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  StatusBar,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo, Input, Button } from '../../components';
import styles from './styles';

const Login = ({ navigation, setCurrentScreen }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!username.trim()) {
      newErrors.username = 'Usuário é obrigatório';
    }

    if (!password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (password.length < 6) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Login',
        `Bem-vindo, ${username}!`,
        [{ text: 'OK' }]
      );
    }, 1500);
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Esqueceu a senha?',
      'Funcionalidade em desenvolvimento',
      [{ text: 'OK' }]
    );
  };

  const handleRegister = () => {
    if (setCurrentScreen) {
      setCurrentScreen('Register');
    } else {
      Alert.alert(
        'Cadastrar-se',
        'Funcionalidade de navegação em desenvolvimento',
        [{ text: 'OK' }]
      );
      // navigation.navigate('Register');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Logo size="large" />

            <View style={styles.inputsContainer}>
              <Input
                label="Usuário"
                placeholder="Digite seu usuário"
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  if (errors.username) {
                    setErrors({ ...errors, username: null });
                  }
                }}
                leftIcon="person-outline"
                error={errors.username}
                autoCapitalize="none"
              />

              <Input
                label="Senha"
                placeholder="Digite sua senha"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) {
                    setErrors({ ...errors, password: null });
                  }
                }}
                leftIcon="lock-closed-outline"
                secureTextEntry
                error={errors.password}
              />
            </View>

            <Button
              title="ENTRAR"
              onPress={handleLogin}
              loading={loading}
            />

            <View style={styles.linksContainer}>
              <TouchableOpacity 
                onPress={handleForgotPassword}
                activeOpacity={0.7}
              >
                <Text style={styles.linkText}>Esqueci minha senha</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleRegister}
                activeOpacity={0.7}
              >
                <Text style={styles.linkText}>Cadastrar-se</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Login;
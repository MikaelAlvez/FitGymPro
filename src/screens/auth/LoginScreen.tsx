import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Ionicons } from '@expo/vector-icons';
import { Button }   from '../../components/ui/Button';
import { Input }    from '../../components/ui/Input';
import { useAuth }  from '../../contexts/AuthContext';
import { colors, typography, spacing } from '../../theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// ─── Validação ───────────────────────────────
const schema = z.object({
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type FormData = z.infer<typeof schema>;

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

// ─── Screen ──────────────────────────────────
export function LoginScreen() {
  const { signIn } = useAuth();
  const navigation = useNavigation<Nav>();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email, password }: FormData) => {
    try {
      await signIn(email, password);
      // Navegação tratada pelo RootNavigator via estado de auth
    } catch {
      Alert.alert('Erro', 'Usuário ou senha inválidos.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={styles.logoContainer}>
              <Ionicons name="barbell" size={52} color={colors.primary} />
            </View>
            <Text style={styles.appName}>
              FitGym<Text style={styles.taglinePro}> PRO</Text>
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Usuário"
                  placeholder="seu@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon="person-outline"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.email?.message}
                  containerStyle={styles.inputSpacing}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Senha"
                  placeholder="••••••••"
                  leftIcon="lock-closed-outline"
                  secureTextEntry
                  secureToggle
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.password?.message}
                  containerStyle={styles.inputSpacing}
                />
              )}
            />

            <Button
              label="ENTRAR"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              style={styles.btnLogin}
            />

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.link}>Esqueci minha senha</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.link}>Cadastrar-se</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['6'],
    paddingVertical: spacing['10'],
  },

  // Logo
  logoArea: {
    alignItems: 'center',
    marginBottom: spacing['10'],
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['3'],
  },
  appName: {
    fontFamily: typography.family.bold,
    fontSize: typography.size['2xl'],
    color: colors.primary,
    letterSpacing: 1,
  },
  tagline: {
    fontFamily: typography.family.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: spacing['1'],
  },
  taglinePro: {
    color: colors.primary,
    fontFamily: typography.family.bold,
  },

  // Form
  form: {
    gap: spacing['4'],
    alignItems: 'center',
  },
  inputSpacing: {
    width: '100%',
  },
  btnLogin: {
    marginTop: spacing['2'],
    width: '100%',
  },
  link: {
    fontFamily: typography.family.medium,
    fontSize: typography.size.md,
    color: colors.primary,
    textAlign: 'center',
    paddingVertical: spacing['1'],
  },
});
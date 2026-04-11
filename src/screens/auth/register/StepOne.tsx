import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActionSheetIOS,
} from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';

import { Input }                    from '../../../components/ui/Input';
import { Button }                   from '../../../components/ui/Button';
import { authService }              from '../../../services/auth.service';
import { pickImage, takePhoto }     from '../../../services/upload.service';
import { maskCpf }                  from '../../../utils/cpf';
import type { StepOneData }         from './useRegisterForm';
import { colors, typography, spacing, radii } from '../../../theme';

interface Props {
  form:         UseFormReturn<StepOneData>;
  avatarUri:    string | null;
  onPickAvatar: (uri: string) => void;
  onSubmit:     (data: StepOneData) => void;
}

export function StepOne({ form, avatarUri, onPickAvatar, onSubmit }: Props) {
  const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = form;
  const [checking,    setChecking]    = useState(false);
  const [checkingCpf, setCheckingCpf] = useState(false);

  // ─── Selecionar foto ─────────────────────────
  const handlePickAvatar = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancelar', 'Tirar foto', 'Escolher da galeria'], cancelButtonIndex: 0 },
        async (idx) => {
          if (idx === 1) { const uri = await takePhoto(); if (uri) onPickAvatar(uri) }
          if (idx === 2) { const uri = await pickImage(); if (uri) onPickAvatar(uri) }
        },
      )
    } else {
      Alert.alert('Foto de perfil', 'Escolha uma opção', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Tirar foto',          onPress: async () => { const uri = await takePhoto(); if (uri) onPickAvatar(uri) } },
        { text: 'Escolher da galeria', onPress: async () => { const uri = await pickImage(); if (uri) onPickAvatar(uri) } },
      ])
    }
  }

  // ─── Verifica CPF ao sair do campo ───────────
  const handleCpfBlur = async (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length !== 11) return
    try {
      setCheckingCpf(true)
      const { available } = await authService.checkCpf(value)
      if (!available) {
        setError('cpf', { type: 'manual', message: 'CPF já cadastrado. Use outro ou faça login.' })
      }
    } catch {
      // silencia erro de rede no blur
    } finally {
      setCheckingCpf(false)
    }
  }

  // ─── Verifica e-mail ao sair do campo ────────
  const handleEmailBlur = async (value: string) => {
    if (!value || !value.includes('@')) return
    try {
      const { available } = await authService.checkEmail(value)
      if (!available) {
        setError('email', { type: 'manual', message: 'E-mail já cadastrado. Use outro ou faça login.' })
      }
    } catch {
      // silencia erro de rede no blur
    }
  }

  // ─── Valida tudo antes de avançar ────────────
  const handleContinue = async (data: StepOneData) => {
    try {
      setChecking(true)

      const [emailRes, cpfRes] = await Promise.all([
        authService.checkEmail(data.email),
        authService.checkCpf(data.cpf),
      ])

      let hasError = false

      if (!emailRes.available) {
        setError('email', { type: 'manual', message: 'E-mail já cadastrado. Use outro ou faça login.' })
        hasError = true
      }

      if (!cpfRes.available) {
        setError('cpf', { type: 'manual', message: 'CPF já cadastrado. Use outro ou faça login.' })
        hasError = true
      }

      if (hasError) return

      onSubmit(data)
    } catch {
      setError('email', { type: 'manual', message: 'Não foi possível verificar os dados. Tente novamente.' })
    } finally {
      setChecking(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <TouchableOpacity style={styles.avatarBtn} onPress={handlePickAvatar} activeOpacity={0.8}>
          <View style={styles.avatarCircle}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="image-outline" size={36} color={colors.textSecondary} />
            )}
            <View style={styles.avatarBadge}>
              <Ionicons name={avatarUri ? 'pencil' : 'add'} size={14} color={colors.white} />
            </View>
          </View>
          <Text style={styles.avatarLabel}>
            {avatarUri ? 'Alterar foto' : 'Adicionar foto'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Dados pessoais</Text>

        <View style={styles.fields}>
          <Controller
            control={control} name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nome"
                placeholder="Seu nome completo"
                autoCapitalize="words"
                onChangeText={onChange} onBlur={onBlur} value={value}
                error={errors.name?.message}
              />
            )}
          />

          <Controller
            control={control} name="cpf"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="CPF"
                placeholder="000.000.000-00"
                keyboardType="numeric"
                maxLength={14}
                onChangeText={raw => onChange(maskCpf(raw))}
                onBlur={() => { onBlur(); handleCpfBlur(value ?? '') }}
                value={value}
                error={errors.cpf?.message}
                rightIcon={checkingCpf ? 'reload-outline' : undefined}
              />
            )}
          />

          <Controller
            control={control} name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="E-mail"
                placeholder="seu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                onChangeText={onChange}
                onBlur={() => { onBlur(); handleEmailBlur(value ?? '') }}
                value={value}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control} name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Telefone/Whatsapp"
                placeholder="(00) 00000-0000"
                keyboardType="phone-pad"
                onChangeText={onChange} onBlur={onBlur} value={value}
                error={errors.phone?.message}
              />
            )}
          />

          <Controller
            control={control} name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Senha"
                placeholder="••••••••"
                secureTextEntry secureToggle
                onChangeText={onChange} onBlur={onBlur} value={value}
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control} name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirmar senha"
                placeholder="••••••••"
                secureTextEntry secureToggle
                onChangeText={onChange} onBlur={onBlur} value={value}
                error={errors.confirmPassword?.message}
              />
            )}
          />
        </View>

        <Button
          label="Continuar"
          onPress={handleSubmit(handleContinue)}
          loading={isSubmitting || checking}
          style={styles.btn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing['6'],
    paddingBottom: spacing['10'],
  },
  avatarBtn: {
    alignItems: 'center',
    marginVertical: spacing['6'],
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 22, height: 22,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    marginTop: spacing['2'],
    fontFamily: typography.family.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontFamily: typography.family.bold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    marginBottom: spacing['4'],
  },
  fields: { gap: spacing['4'] },
  btn:    { marginTop: spacing['8'] },
});
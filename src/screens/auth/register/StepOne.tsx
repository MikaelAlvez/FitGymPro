import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
  Image, Alert, ActionSheetIOS, Modal, FlatList,
} from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';

import { Input }                from '../../../components/ui/Input';
import { Button }               from '../../../components/ui/Button';
import { authService }          from '../../../services/auth.service';
import { pickImage, takePhoto } from '../../../services/upload.service';
import { maskCpf }              from '../../../utils/cpf';
import { maskDate, isValidDate } from '../../../utils/date';
import type { StepOneData }     from './useRegisterForm';
import { colors, typography, spacing, radii } from '../../../theme';

const SEX_OPTIONS = ['Masculino', 'Feminino', 'Prefiro não informar'];

function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2)  return `(${digits}`
  if (digits.length <= 7)  return `(${digits.slice(0,2)}) ${digits.slice(2)}`
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
}

interface Props {
  form:         UseFormReturn<StepOneData>;
  avatarUri:    string | null;
  onPickAvatar: (uri: string) => void;
  onSubmit:     (data: StepOneData) => void;
}

export function StepOne({ form, avatarUri, onPickAvatar, onSubmit }: Props) {
  const { control, handleSubmit, setError, clearErrors, formState: { errors, isSubmitting } } = form;
  const [checking,    setChecking]    = useState(false);
  const [checkingCpf, setCheckingCpf] = useState(false);
  const [sexModal,    setSexModal]    = useState(false);

  // ─── Foto ─────────────────────────────────
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
        { text: 'Escolher da galeria', onPress: async () => { const uri = await pickImage();  if (uri) onPickAvatar(uri) } },
      ])
    }
  }

  // ─── Data em tempo real ────────────────────
  const handleDateChange = (raw: string, onChange: (v: string) => void) => {
    const masked = maskDate(raw)
    onChange(masked)
    const digits = masked.replace(/\D/g, '')
    if (digits.length === 8) {
      if (!isValidDate(masked)) {
        setError('birthDate', { type: 'manual', message: 'Data de nascimento inválida' })
      } else {
        clearErrors('birthDate')
      }
    } else {
      clearErrors('birthDate')
    }
  }

  // ─── CPF blur ─────────────────────────────
  const handleCpfBlur = async (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length !== 11) return
    try {
      setCheckingCpf(true)
      const { available } = await authService.checkCpf(value)
      if (!available) setError('cpf', { type: 'manual', message: 'CPF já cadastrado. Use outro ou faça login.' })
    } catch {} finally { setCheckingCpf(false) }
  }

  // ─── Email blur ───────────────────────────
  const handleEmailBlur = async (value: string) => {
    if (!value || !value.includes('@')) return
    try {
      const { available } = await authService.checkEmail(value)
      if (!available) setError('email', { type: 'manual', message: 'E-mail já cadastrado. Use outro ou faça login.' })
    } catch {}
  }

  // ─── Submit ───────────────────────────────
  const handleContinue = async (data: StepOneData) => {
    if (!isValidDate(data.birthDate)) {
      setError('birthDate', { type: 'manual', message: 'Data de nascimento inválida' })
      return
    }
    try {
      setChecking(true)
      const [emailRes, cpfRes] = await Promise.all([
        authService.checkEmail(data.email),
        authService.checkCpf(data.cpf),
      ])
      let hasError = false
      if (!emailRes.available) { setError('email', { type: 'manual', message: 'E-mail já cadastrado. Use outro ou faça login.' }); hasError = true }
      if (!cpfRes.available)   { setError('cpf',   { type: 'manual', message: 'CPF já cadastrado. Use outro ou faça login.' });   hasError = true }
      if (hasError) return
      onSubmit(data)
    } catch (err: any) {
      console.warn('Erro ao verificar dados:', err?.message)
      onSubmit(data)
    } finally {
      setChecking(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <TouchableOpacity style={styles.avatarBtn} onPress={handlePickAvatar} activeOpacity={0.8}>
          <View style={styles.avatarCircle}>
            {avatarUri
              ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              : <Ionicons name="image-outline" size={36} color={colors.textSecondary} />
            }
            <View style={styles.avatarBadge}>
              <Ionicons name={avatarUri ? 'pencil' : 'add'} size={14} color={colors.white} />
            </View>
          </View>
          <Text style={styles.avatarLabel}>{avatarUri ? 'Alterar foto' : 'Adicionar foto'}</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Dados pessoais</Text>

        <View style={styles.fields}>
          <Controller control={control} name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Nome *" placeholder="Seu nome completo" autoCapitalize="words"
                onChangeText={onChange} onBlur={onBlur} value={value} error={errors.name?.message} />
            )}
          />

          <Controller control={control} name="cpf"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="CPF *" placeholder="000.000.000-00" keyboardType="numeric" maxLength={14}
                onChangeText={raw => onChange(maskCpf(raw))}
                onBlur={() => { onBlur(); handleCpfBlur(value ?? '') }}
                value={value} error={errors.cpf?.message}
                rightIcon={checkingCpf ? 'reload-outline' : undefined} />
            )}
          />

          {/* Sexo */}
          <Controller control={control} name="sex"
            render={({ field: { onChange, value } }) => (
              <>
                <View style={styles.selectorWrapper}>
                  <Text style={styles.selectorLabel}>Sexo *</Text>
                  <TouchableOpacity
                    style={[styles.selectorBox, errors.sex ? styles.selectorBoxError : null]}
                    onPress={() => setSexModal(true)} activeOpacity={0.8}
                  >
                    <Text style={value ? styles.selectorValue : styles.selectorPlaceholder}>
                      {value ?? 'Selecione'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {errors.sex && <Text style={styles.errorText}>{errors.sex.message}</Text>}
                </View>

                <Modal visible={sexModal} transparent animationType="slide" onRequestClose={() => setSexModal(false)}>
                  <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSexModal(false)} />
                  <View style={styles.sheet}>
                    <View style={styles.sheetHeader}>
                      <Text style={styles.sheetTitle}>Sexo</Text>
                      <TouchableOpacity onPress={() => setSexModal(false)}>
                        <Ionicons name="close" size={22} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    <FlatList
                      data={SEX_OPTIONS}
                      keyExtractor={i => i}
                      renderItem={({ item }) => {
                        const active = item === value
                        return (
                          <TouchableOpacity
                            style={[styles.option, active && styles.optionActive]}
                            onPress={() => { onChange(item); setSexModal(false) }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.optionText, active && styles.optionTextActive]}>{item}</Text>
                            {active && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                          </TouchableOpacity>
                        )
                      }}
                    />
                  </View>
                </Modal>
              </>
            )}
          />

          {/* Data de nascimento */}
          <Controller control={control} name="birthDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Data de nascimento *" placeholder="DD/MM/AAAA"
                keyboardType="numeric" maxLength={10}
                onChangeText={raw => handleDateChange(raw, onChange)}
                onBlur={onBlur} value={value} error={errors.birthDate?.message} />
            )}
          />

          <Controller control={control} name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="E-mail *" placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none"
                onChangeText={onChange}
                onBlur={() => { onBlur(); handleEmailBlur(value ?? '') }}
                value={value} error={errors.email?.message} />
            )}
          />

          <Controller control={control} name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Telefone/Whatsapp *" placeholder="(00) 00000-0000" keyboardType="phone-pad" maxLength={15}
                onChangeText={raw => onChange(maskPhone(raw))}
                onBlur={onBlur} value={value} error={errors.phone?.message} />
            )}
          />

          <Controller control={control} name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Senha *" placeholder="••••••••" secureTextEntry secureToggle
                onChangeText={onChange} onBlur={onBlur} value={value} error={errors.password?.message} />
            )}
          />

          <Controller control={control} name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Confirmar senha *" placeholder="••••••••" secureTextEntry secureToggle
                onChangeText={onChange} onBlur={onBlur} value={value} error={errors.confirmPassword?.message} />
            )}
          />
        </View>

        <Text style={styles.required}>* Campos obrigatórios</Text>

        <Button label="Continuar" onPress={handleSubmit(handleContinue)}
          loading={isSubmitting || checking} style={styles.btn} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: spacing['6'], paddingBottom: spacing['10'] },
  avatarBtn:    { alignItems: 'center', marginVertical: spacing['6'] },
  avatarCircle: { width: 80, height: 80, borderRadius: radii.full, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage:  { width: 80, height: 80, borderRadius: radii.full },
  avatarBadge:  { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: radii.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarLabel:  { marginTop: spacing['2'], fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary },
  sectionTitle: { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.textPrimary, marginBottom: spacing['4'] },
  fields:   { gap: spacing['4'] },
  required: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: spacing['2'] },
  btn:      { marginTop: spacing['6'] },
  // Selector
  selectorWrapper: { gap: spacing['1'] },
  selectorLabel:   { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary, marginBottom: spacing['1'] },
  selectorBox:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 52, paddingHorizontal: spacing['4'] },
  selectorBoxError:    { borderColor: colors.error },
  selectorValue:       { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  selectorPlaceholder: { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textDisabled },
  errorText: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.error, marginTop: spacing['1'] },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:   { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], paddingBottom: spacing['8'], maxHeight: '50%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['6'], paddingVertical: spacing['4'], borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  option:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing['4'], paddingHorizontal: spacing['6'], borderBottomWidth: 1, borderBottomColor: colors.divider },
  optionActive:     { backgroundColor: colors.surfaceHigh },
  optionText:       { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  optionTextActive: { fontFamily: typography.family.semiBold, color: colors.primary },
});
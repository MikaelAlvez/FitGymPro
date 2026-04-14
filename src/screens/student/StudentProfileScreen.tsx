import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, Modal, FlatList, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'

import { Input }           from '../../components/ui/Input'
import { Button }          from '../../components/ui/Button'
import { useAuth }         from '../../contexts/AuthContext'
import { userService }     from '../../services/user.service'
import { uploadAvatar, pickImage, takePhoto } from '../../services/upload.service'
import { maskDate, isValidDate } from '../../utils/date'
import { colors, typography, spacing, radii, shadows } from '../../theme'

// ─── Config ──────────────────────────────────
const getBaseUrl = () => {
  const host = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants.manifest as any)?.debuggerHost
  if (host) return `http://${host.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}

const SEX_OPTIONS = ['Masculino', 'Feminino', 'Prefiro não informar']

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2)  return `(${d}`
  if (d.length <= 7)  return `(${d.slice(0,2)}) ${d.slice(2)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

export function StudentProfileScreen() {
  const { user, updateUser, signOut } = useAuth()
  const avatarUrl = user?.avatar ? `${getBaseUrl()}${user.avatar}` : null

  const [saving,    setSaving]    = useState(false)
  const [sexModal,  setSexModal]  = useState(false)
  const [logoutAlert, setLogoutAlert] = useState(false)

  const [form, setForm] = useState({
    name:         user?.name          ?? '',
    phone:        user?.phone         ?? '',
    sex:          user?.sex           ?? '',
    birthDate:    user?.birthDate     ?? '',
    cep:          user?.cep           ?? '',
    street:       user?.street        ?? '',
    number:       user?.number        ?? '',
    neighborhood: user?.neighborhood  ?? '',
    city:         user?.city          ?? '',
    state:        user?.state         ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (field: string, value: string) => {
    setForm(p => ({ ...p, [field]: value }))
    setErrors(p => ({ ...p, [field]: '' }))
  }

  // ─── Foto ──────────────────────────────────
  const handlePickAvatar = () => {
    Alert.alert('Foto de perfil', 'Escolha uma opção', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Tirar foto',          onPress: async () => { const uri = await takePhoto(); if (uri) doUpload(uri) } },
      { text: 'Escolher da galeria', onPress: async () => { const uri = await pickImage(); if (uri) doUpload(uri) } },
    ])
  }

  const doUpload = async (uri: string) => {
    try {
      const url = await uploadAvatar(uri)
      await updateUser({ avatar: url })
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar a foto.')
    }
  }

  // ─── Salvar ────────────────────────────────
  const handleSave = async () => {
    const errs: Record<string, string> = {}

    if (!form.name.trim() || form.name.length < 3) errs.name = 'Nome deve ter ao menos 3 caracteres'
    if (form.birthDate && !isValidDate(form.birthDate))  errs.birthDate = 'Data de nascimento inválida'

    if (Object.keys(errs).length) { setErrors(errs); return }

    try {
      setSaving(true)
      const updated = await userService.updateProfile({
        name:         form.name      || undefined,
        phone:        form.phone     || undefined,
        sex:          form.sex       || undefined,
        birthDate:    form.birthDate || undefined,
        cep:          form.cep       || undefined,
        street:       form.street    || undefined,
        number:       form.number    || undefined,
        neighborhood: form.neighborhood || undefined,
        city:         form.city      || undefined,
        state:        form.state     || undefined,
      })
      await updateUser(updated)
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!')
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Avatar */}
          <View style={s.avatarSection}>
            <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8}>
              {avatarUrl
                ? <Image source={{ uri: avatarUrl }} style={s.avatar} />
                : (
                  <View style={s.avatarPlaceholder}>
                    <Text style={s.avatarInitial}>{user?.name?.charAt(0).toUpperCase()}</Text>
                  </View>
                )
              }
              <View style={s.avatarBadge}>
                <Ionicons name="camera" size={14} color={colors.white} />
              </View>
            </TouchableOpacity>
            <Text style={s.avatarName}>{user?.name}</Text>
            <Text style={s.avatarRole}>Aluno</Text>
          </View>

          {/* Dados pessoais */}
          <Text style={s.sectionTitle}>Dados pessoais</Text>
          <View style={s.card}>
            <Input label="Nome *" value={form.name}
              onChangeText={v => set('name', v)} error={errors.name} />

            <Input label="Telefone" value={form.phone} keyboardType="phone-pad" maxLength={15}
              onChangeText={raw => set('phone', maskPhone(raw))} />

            {/* Sexo */}
            <View>
              <Text style={s.fieldLabel}>Sexo</Text>
              <TouchableOpacity style={s.selector} onPress={() => setSexModal(true)} activeOpacity={0.8}>
                <Text style={form.sex ? s.selectorValue : s.selectorPlaceholder}>
                  {form.sex || 'Selecione'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Input label="Data de nascimento" value={form.birthDate}
              placeholder="DD/MM/AAAA" keyboardType="numeric" maxLength={10}
              onChangeText={raw => {
                const d = raw.replace(/\D/g,'').slice(0,8)
                let masked = d
                if (d.length > 2) masked = `${d.slice(0,2)}/${d.slice(2)}`
                if (d.length > 4) masked = `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`
                set('birthDate', masked)
              }}
              error={errors.birthDate} />
          </View>

          {/* Endereço */}
          <Text style={s.sectionTitle}>Endereço</Text>
          <View style={s.card}>
            <Input label="CEP" value={form.cep} keyboardType="numeric" maxLength={9}
              onChangeText={raw => {
                const d = raw.replace(/\D/g,'').slice(0,8)
                set('cep', d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d)
              }} />
            <Input label="Rua" value={form.street} onChangeText={v => set('street', v)} />
            <View style={s.row}>
              <View style={{ width: 90 }}>
                <Input label="Nº" value={form.number} keyboardType="numeric"
                  onChangeText={v => set('number', v)} />
              </View>
              <View style={s.flex}>
                <Input label="Bairro" value={form.neighborhood}
                  onChangeText={v => set('neighborhood', v)} />
              </View>
            </View>
            <Input label="Cidade" value={form.city} onChangeText={v => set('city', v)} />
            <Input label="Estado" value={form.state} maxLength={2} autoCapitalize="characters"
              onChangeText={v => set('state', v.toUpperCase())} />
          </View>

          <Button label="Salvar alterações" onPress={handleSave} loading={saving} style={s.btn} />

          {/* Sair */}
          <TouchableOpacity style={s.logoutBtn} onPress={() =>
            Alert.alert('Sair', 'Deseja realmente sair?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Sair', style: 'destructive', onPress: signOut },
            ])
          }>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={s.logoutText}>Sair da conta</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sex Modal */}
      <Modal visible={sexModal} transparent animationType="slide" onRequestClose={() => setSexModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setSexModal(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Sexo</Text>
            <TouchableOpacity onPress={() => setSexModal(false)}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={SEX_OPTIONS}
            keyExtractor={i => i}
            renderItem={({ item }) => {
              const active = item === form.sex
              return (
                <TouchableOpacity
                  style={[s.option, active && s.optionActive]}
                  onPress={() => { set('sex', item); setSexModal(false) }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.optionText, active && s.optionTextActive]}>{item}</Text>
                  {active && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )
            }}
          />
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  flex:   { flex: 1 },
  scroll: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  // Avatar
  avatarSection: { alignItems: 'center', paddingVertical: spacing['6'] },
  avatar: { width: 90, height: 90, borderRadius: radii.full, borderWidth: 3, borderColor: colors.primary },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.primary },
  avatarInitial: { fontFamily: typography.family.bold, fontSize: typography.size['2xl'], color: colors.white },
  avatarBadge:   { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: radii.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarName:    { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.textPrimary, marginTop: spacing['2'] },
  avatarRole:    { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 },

  // Sections
  sectionTitle: { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary, marginBottom: spacing['3'], marginTop: spacing['4'] },
  card: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], gap: spacing['4'], ...shadows.sm },

  // Selector
  fieldLabel:          { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary, marginBottom: spacing['1'] },
  selector:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 52, paddingHorizontal: spacing['4'] },
  selectorValue:       { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  selectorPlaceholder: { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textDisabled },

  row: { flexDirection: 'row', gap: spacing['3'] },
  btn: { marginTop: spacing['6'] },

  // Logout
  logoutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], paddingVertical: spacing['5'], marginTop: spacing['2'] },
  logoutText: { fontFamily: typography.family.medium, fontSize: typography.size.base, color: colors.error },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:   { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], paddingBottom: spacing['8'], maxHeight: '50%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['6'], paddingVertical: spacing['4'], borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  option:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing['4'], paddingHorizontal: spacing['6'], borderBottomWidth: 1, borderBottomColor: colors.divider },
  optionActive:     { backgroundColor: colors.surfaceHigh },
  optionText:       { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  optionTextActive: { fontFamily: typography.family.semiBold, color: colors.primary },
})
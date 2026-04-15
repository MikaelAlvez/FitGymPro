import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, Modal, FlatList,
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
import { isValidDate }     from '../../utils/date'
import { colors, typography, spacing, radii, shadows } from '../../theme'

// ─── Config ──────────────────────────────────
const getBaseUrl = () => {
  const host = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants.manifest as any)?.debuggerHost
  if (host) return `http://${host.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}

// ─── Dados ───────────────────────────────────
const SEX_OPTIONS = ['Masculino', 'Feminino', 'Prefiro não informar']

const STATES = [
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Pará' },
  { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' },
]

// ─── Máscaras ─────────────────────────────────
function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2)  return `(${d}`
  if (d.length <= 7)  return `(${d.slice(0,2)}) ${d.slice(2)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function maskCep(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d
}

function maskDate(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  if (d.length > 4) return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`
  if (d.length > 2) return `${d.slice(0,2)}/${d.slice(2)}`
  return d
}

function maskCpf(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length <= 11)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, e) =>
      e ? `${a}.${b}.${c}-${e}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a
    )
  return raw
}

// ─── Component ────────────────────────────────
export function StudentProfileScreen() {
  const { user, updateUser } = useAuth()
  const avatarUrl = user?.avatar ? `${getBaseUrl()}${user.avatar}` : null

  const [saving,     setSaving]     = useState(false)
  const [sexModal,   setSexModal]   = useState(false)
  const [stateModal, setStateModal] = useState(false)

  const [form, setForm] = useState({
    name:         user?.name         ?? '',
    phone:        user?.phone        ?? '',
    sex:          user?.sex          ?? '',
    birthDate:    user?.birthDate    ?? '',
    cep:          user?.cep          ?? '',
    street:       user?.street       ?? '',
    number:       user?.number       ?? '',
    neighborhood: user?.neighborhood ?? '',
    city:         user?.city         ?? '',
    state:        user?.state        ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (field: string, value: string) => {
    setForm(p => ({ ...p, [field]: value }))
    setErrors(p => ({ ...p, [field]: '' }))
  }

  // ─── Avatar ───────────────────────────────
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

  // ─── Salvar ───────────────────────────────
  const handleSave = async () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim() || form.name.length < 3) errs.name = 'Nome deve ter ao menos 3 caracteres'
    if (form.birthDate && !isValidDate(form.birthDate)) errs.birthDate = 'Data de nascimento inválida'
    if (Object.keys(errs).length) { setErrors(errs); return }

    try {
      setSaving(true)
      const updated = await userService.updateProfile({
        name:         form.name         || undefined,
        phone:        form.phone        || undefined,
        sex:          form.sex          || undefined,
        birthDate:    form.birthDate    || undefined,
        cep:          form.cep          || undefined,
        street:       form.street       || undefined,
        number:       form.number       || undefined,
        neighborhood: form.neighborhood || undefined,
        city:         form.city         || undefined,
        state:        form.state        || undefined,
      })
      await updateUser(updated)
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!')
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  const selectedStateName = STATES.find(s => s.uf === form.state)

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

            {/* Data de nascimento */}
            <Input label="Data de nascimento" value={form.birthDate}
              placeholder="DD/MM/AAAA" keyboardType="numeric" maxLength={10}
              onChangeText={raw => set('birthDate', maskDate(raw))}
              error={errors.birthDate} />

            {/* E-mail — bloqueado */}
            <View>
              <Text style={s.fieldLabel}>E-mail</Text>
              <View style={s.lockedField}>
                <Text style={s.lockedValue}>{user?.email}</Text>
                <Ionicons name="lock-closed" size={16} color={colors.textDisabled} />
              </View>
            </View>

            {/* CPF — bloqueado */}
            <View>
              <Text style={s.fieldLabel}>CPF</Text>
              <View style={s.lockedField}>
                <Text style={s.lockedValue}>
                  {user?.cpf ? maskCpf(user.cpf) : '—'}
                </Text>
                <Ionicons name="lock-closed" size={16} color={colors.textDisabled} />
              </View>
            </View>
          </View>

          {/* Endereço */}
          <Text style={s.sectionTitle}>Endereço</Text>
          <View style={s.card}>
            <Input label="CEP" value={form.cep} keyboardType="numeric" maxLength={9}
              onChangeText={raw => set('cep', maskCep(raw))} />

            <Input label="Rua" value={form.street}
              onChangeText={v => set('street', v)} />

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

            <Input label="Cidade" value={form.city}
              onChangeText={v => set('city', v)} />

            {/* Estado — seletor */}
            <View>
              <Text style={s.fieldLabel}>Estado</Text>
              <TouchableOpacity style={s.selector} onPress={() => setStateModal(true)} activeOpacity={0.8}>
                <Text style={form.state ? s.selectorValue : s.selectorPlaceholder}>
                  {form.state ? `${form.state} — ${selectedStateName?.name}` : 'Selecione o estado'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <Button label="Salvar alterações" onPress={handleSave} loading={saving} style={s.btn} />

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal — Sexo */}
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

      {/* Modal — Estado */}
      <Modal visible={stateModal} transparent animationType="slide" onRequestClose={() => setStateModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setStateModal(false)} />
        <View style={[s.sheet, { maxHeight: '70%' }]}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Selecione o estado</Text>
            <TouchableOpacity onPress={() => setStateModal(false)}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={STATES}
            keyExtractor={item => item.uf}
            renderItem={({ item }) => {
              const active = item.uf === form.state
              return (
                <TouchableOpacity
                  style={[s.stateOption, active && s.stateOptionActive]}
                  onPress={() => { set('state', item.uf); setStateModal(false) }}
                  activeOpacity={0.7}
                >
                  <View style={s.stateUfBadge}>
                    <Text style={s.stateUf}>{item.uf}</Text>
                  </View>
                  <Text style={[s.stateName, active && s.stateNameActive]}>
                    {item.name}
                  </Text>
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

// ─── Styles ──────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  flex:   { flex: 1 },
  scroll: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  // Avatar
  avatarSection:     { alignItems: 'center', paddingVertical: spacing['6'] },
  avatar:            { width: 90, height: 90, borderRadius: radii.full, borderWidth: 3, borderColor: colors.primary },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.primary },
  avatarInitial:     { fontFamily: typography.family.bold, fontSize: typography.size['2xl'], color: colors.white },
  avatarBadge:       { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: radii.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarName:        { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.textPrimary, marginTop: spacing['2'] },
  avatarRole:        { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 },

  // Sections
  sectionTitle: { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary, marginBottom: spacing['3'], marginTop: spacing['4'] },
  card:         { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], gap: spacing['4'], ...shadows.sm },

  // Selector genérico
  fieldLabel:          { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary, marginBottom: spacing['1'] },
  selector:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 52, paddingHorizontal: spacing['4'] },
  selectorValue:       { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  selectorPlaceholder: { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textDisabled },

  // Campos bloqueados
  lockedField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 52, paddingHorizontal: spacing['4'], opacity: 0.6 },
  lockedValue: { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textSecondary },

  row: { flexDirection: 'row', gap: spacing['3'] },
  btn: { marginTop: spacing['6'] },

  // Modal base
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], paddingBottom: spacing['8'], maxHeight: '50%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['6'], paddingVertical: spacing['4'], borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },

  // Opções do modal de sexo
  option:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing['4'], paddingHorizontal: spacing['6'], borderBottomWidth: 1, borderBottomColor: colors.divider },
  optionActive:    { backgroundColor: colors.surfaceHigh },
  optionText:      { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  optionTextActive:{ fontFamily: typography.family.semiBold, color: colors.primary },

  // Opções do modal de estado
  stateOption:       { flexDirection: 'row', alignItems: 'center', gap: spacing['3'], paddingVertical: spacing['3'], paddingHorizontal: spacing['6'], borderBottomWidth: 1, borderBottomColor: colors.divider },
  stateOptionActive: { backgroundColor: colors.surfaceHigh },
  stateUfBadge:      { width: 36, height: 36, borderRadius: radii.md, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  stateUf:           { fontFamily: typography.family.bold, fontSize: typography.size.xs, color: colors.primary },
  stateName:         { flex: 1, fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  stateNameActive:   { fontFamily: typography.family.semiBold, color: colors.primary },
})
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Alert, ActivityIndicator, Modal, TextInput,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { personalRequestService } from '../../services/personal-request.service'
import type { PersonalItem } from '../../services/personal-request.service'
import { colors, typography, spacing, radii, shadows } from '../../theme'

const getBaseUrl = () => {
  const host = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants.manifest as any)?.debuggerHost
  if (host) return `http://${host.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}

const FORMAT_LABEL: Record<string, string> = {
  presential: 'Presencial',
  online:     'Online',
  hybrid:     'Híbrido',
}

const STATUS_CONFIG = {
  PENDING:  { label: 'Aguardando', color: '#F59E0B', icon: 'time-outline'          as const },
  ACCEPTED: { label: 'Aceito',     color: colors.success, icon: 'checkmark-circle' as const },
  REJECTED: { label: 'Recusado',   color: colors.error,   icon: 'close-circle'     as const },
}

export function StudentPersonalsScreen() {
  const [personals,   setPersonals]   = useState<PersonalItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [msgModal,    setMsgModal]    = useState(false)
  const [selected,    setSelected]    = useState<PersonalItem | null>(null)
  const [message,     setMessage]     = useState('')
  const [sending,     setSending]     = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await personalRequestService.listPersonals()
      setPersonals(data)
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os personais.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    load(true)
  }

  const handleOpenRequest = (personal: PersonalItem) => {
    if (personal.requestStatus === 'PENDING') {
      Alert.alert('Aguardando', 'Sua solicitação está sendo analisada pelo personal.')
      return
    }
    if (personal.requestStatus === 'ACCEPTED') {
      Alert.alert('Vinculado', `Você já está vinculado a ${personal.name}.`)
      return
    }
    setSelected(personal)
    setMessage('')
    setMsgModal(true)
  }

  const handleSendRequest = async () => {
    if (!selected) return
    try {
      setSending(true)
      await personalRequestService.sendRequest(selected.id, message || undefined)
      setMsgModal(false)
      Alert.alert('Solicitação enviada!', `${selected.name} será notificado e poderá aceitar ou recusar seu pedido.`)
      load(true)
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível enviar a solicitação.')
    } finally {
      setSending(false)
    }
  }

  const renderPersonal = ({ item }: { item: PersonalItem }) => {
    const avatarUrl  = item.avatar ? `${getBaseUrl()}${item.avatar}` : null
    const status     = item.requestStatus ? STATUS_CONFIG[item.requestStatus] : null
    const formatLabel = item.personalProfile?.classFormat
      ? FORMAT_LABEL[item.personalProfile.classFormat] ?? item.personalProfile.classFormat
      : null

    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => handleOpenRequest(item)}
        activeOpacity={0.8}
      >
        {/* Avatar */}
        {avatarUrl
          ? <Image source={{ uri: avatarUrl }} style={s.avatar} />
          : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarInitial}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
          )
        }

        {/* Info */}
        <View style={s.info}>
          <Text style={s.name}>{item.name}</Text>

          {item.personalProfile?.cref && (
            <Text style={s.cref}>CREF: {item.personalProfile.cref}</Text>
          )}

          <View style={s.tags}>
            {formatLabel && (
              <View style={s.tag}>
                <Ionicons name="location-outline" size={11} color={colors.primary} />
                <Text style={s.tagText}>{formatLabel}</Text>
              </View>
            )}
            {(item.city || item.state) && (
              <View style={s.tag}>
                <Ionicons name="map-outline" size={11} color={colors.textSecondary} />
                <Text style={s.tagText}>{[item.city, item.state].filter(Boolean).join(' - ')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Status ou botão */}
        {status ? (
          <View style={[s.statusBadge, { backgroundColor: `${status.color}20` }]}>
            <Ionicons name={status.icon} size={14} color={status.color} />
            <Text style={[s.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        ) : (
          <View style={s.requestBtn}>
            <Ionicons name="person-add-outline" size={18} color={colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Personal Trainers</Text>
        <Text style={s.headerSub}>Encontre um personal e solicite acompanhamento</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['10'] }} />
      ) : (
        <FlatList
          data={personals}
          keyExtractor={i => i.id}
          renderItem={renderPersonal}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyText}>Nenhum personal disponível</Text>
            </View>
          }
        />
      )}

      {/* Modal — mensagem opcional */}
      <Modal visible={msgModal} transparent animationType="slide" onRequestClose={() => setMsgModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setMsgModal(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Solicitar personal</Text>
            <TouchableOpacity onPress={() => setMsgModal(false)}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={s.sheetBody}>
            {selected && (
              <View style={s.selectedInfo}>
                <View style={s.selectedAvatar}>
                  <Text style={s.selectedAvatarText}>{selected.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={s.selectedName}>{selected.name}</Text>
                  {selected.personalProfile?.cref && (
                    <Text style={s.selectedCref}>CREF: {selected.personalProfile.cref}</Text>
                  )}
                </View>
              </View>
            )}

            <Text style={s.msgLabel}>Mensagem (opcional)</Text>
            <TextInput
              style={s.msgInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Ex: Quero focar em hipertrofia..."
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={3}
              maxLength={300}
            />
            <Text style={s.msgCount}>{message.length}/300</Text>

            <TouchableOpacity
              style={[s.sendBtn, sending && { opacity: 0.6 }]}
              onPress={handleSendRequest}
              disabled={sending}
              activeOpacity={0.8}
            >
              {sending
                ? <ActivityIndicator color={colors.white} />
                : <Text style={s.sendBtnText}>Enviar solicitação</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },

  header:     { paddingHorizontal: spacing['5'], paddingTop: spacing['5'], paddingBottom: spacing['3'] },
  headerTitle:{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  headerSub:  { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing['1'] },

  list: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  card: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  colors.surface,
    borderRadius:     radii.xl,
    padding:          spacing['4'],
    marginBottom:     spacing['3'],
    gap:              spacing['3'],
    ...shadows.sm,
  },

  avatar:            { width: 52, height: 52, borderRadius: radii.full, borderWidth: 2, borderColor: colors.primary },
  avatarPlaceholder: { width: 52, height: 52, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary },
  avatarInitial:     { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.white },

  info:  { flex: 1 },
  name:  { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  cref:  { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  tags:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['1'], marginTop: spacing['2'] },
  tag:   { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.surfaceHigh, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 3 },
  tagText: { fontFamily: typography.family.regular, fontSize: 10, color: colors.textSecondary },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: spacing['1'] },
  statusText:  { fontFamily: typography.family.medium, fontSize: typography.size.xs },
  requestBtn:  { width: 36, height: 36, borderRadius: radii.full, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },

  empty:     { alignItems: 'center', marginTop: spacing['10'], gap: spacing['3'] },
  emptyText: { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textDisabled },

  // Modal
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], paddingBottom: spacing['8'] },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['6'], paddingVertical: spacing['4'], borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  sheetBody:   { padding: spacing['6'], gap: spacing['4'] },

  selectedInfo:       { flexDirection: 'row', alignItems: 'center', gap: spacing['3'], backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'] },
  selectedAvatar:     { width: 44, height: 44, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  selectedAvatarText: { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.white },
  selectedName:       { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  selectedCref:       { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },

  msgLabel: { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  msgInput: { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, padding: spacing['4'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary, minHeight: 90, textAlignVertical: 'top' },
  msgCount: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textDisabled, textAlign: 'right', marginTop: -spacing['2'] },

  sendBtn:     { backgroundColor: colors.primary, borderRadius: radii.lg, height: 52, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },
})
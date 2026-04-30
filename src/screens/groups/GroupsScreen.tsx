import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, Alert,
  Modal, TextInput, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import Constants from 'expo-constants'
import * as ImagePicker from 'expo-image-picker'
import { groupService } from '../../services/group.service'
import type { Group } from '../../services/group.service'
import { uploadSessionPhoto } from '../../services/upload.service'
import { colors, typography, spacing, radii, shadows } from '../../theme'

const getBaseUrl = () => {
  const host = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants.manifest as any)?.debuggerHost
  if (host) return `http://${host.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}

const isGroupCode = (text: string) => /^GRP-[A-Z0-9]{6}$/.test(text.trim().toUpperCase())

function stringToColor(str: string): string {
  const palette = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444']
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return palette[Math.abs(hash) % palette.length]
}

export function GroupsScreen() {
  const navigation = useNavigation<any>()

  const [groups,     setGroups]     = useState<Group[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Modal criar grupo
  const [createModal,   setCreateModal]   = useState(false)
  const [newName,       setNewName]       = useState('')
  const [newDesc,       setNewDesc]       = useState('')
  const [avatarUri,     setAvatarUri]     = useState<string | null>(null)
  const [avatarUrl,     setAvatarUrl]     = useState<string | null>(null)
  const [uploadingImg,  setUploadingImg]  = useState(false)
  const [creating,      setCreating]      = useState(false)

  // Modal entrar por código
  const [joinModal, setJoinModal] = useState(false)
  const [joinCode,  setJoinCode]  = useState('')
  const [joining,   setJoining]   = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await groupService.listMy()
      setGroups(data)
    } catch {
      // silencia
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const resetCreateForm = () => {
    setNewName('')
    setNewDesc('')
    setAvatarUri(null)
    setAvatarUrl(null)
  }

  const handlePickAvatar = async () => {
    Alert.alert('Foto do grupo', 'Escolha uma opção', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Tirar foto',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync()
          if (status !== 'granted') { Alert.alert('Permissão negada', 'Habilite a câmera nas configurações.'); return }
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 })
          if (!result.canceled && result.assets[0]) await doUploadAvatar(result.assets[0].uri)
        },
      },
      {
        text: 'Escolher da galeria',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
          if (status !== 'granted') { Alert.alert('Permissão negada', 'Habilite a galeria nas configurações.'); return }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 })
          if (!result.canceled && result.assets[0]) await doUploadAvatar(result.assets[0].uri)
        },
      },
    ])
  }

  const doUploadAvatar = async (uri: string) => {
    try {
      setUploadingImg(true)
      setAvatarUri(uri)
      const url = await uploadSessionPhoto(uri)
      setAvatarUrl(url)
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar a foto.')
      setAvatarUri(null)
      setAvatarUrl(null)
    } finally {
      setUploadingImg(false)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) { Alert.alert('Atenção', 'O nome do grupo é obrigatório.'); return }
    if (uploadingImg) { Alert.alert('Aguarde', 'A foto ainda está sendo enviada.'); return }
    try {
      setCreating(true)
      const group = await groupService.create({
        name:        newName.trim(),
        description: newDesc.trim() || undefined,
        avatar:      avatarUrl ?? undefined,
      })
      setCreateModal(false)
      resetCreateForm()
      navigation.navigate('GroupDetail', { groupId: group.id })
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível criar o grupo.')
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async () => {
    const upper = joinCode.trim().toUpperCase()
    if (!isGroupCode(upper)) { Alert.alert('Código inválido', 'Use o formato GRP-XXXXXX.'); return }
    try {
      setJoining(true)
      const result = await groupService.joinByCode(upper)
      setJoinModal(false)
      setJoinCode('')
      Alert.alert('Sucesso!', 'Você entrou no grupo.')
      navigation.navigate('GroupDetail', { groupId: result.groupId })
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível entrar no grupo.')
    } finally {
      setJoining(false)
    }
  }

  const renderGroup = ({ item }: { item: Group }) => {
    const imgUrl  = item.avatar ? `${getBaseUrl()}${item.avatar}` : null
    const isOwner = item.myRole === 'OWNER'

    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
        activeOpacity={0.8}
      >
        {imgUrl
          ? <Image source={{ uri: imgUrl }} style={s.groupAvatar} />
          : (
            <View style={[s.groupAvatarPlaceholder, { backgroundColor: stringToColor(item.name) }]}>
              <Text style={s.groupAvatarInitial}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
          )
        }

        <View style={s.cardInfo}>
          <View style={s.cardNameRow}>
            <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
            {isOwner && (
              <View style={s.ownerBadge}>
                <Ionicons name="star" size={10} color="#F59E0B" />
                <Text style={s.ownerBadgeText}>Criador</Text>
              </View>
            )}
          </View>
          {item.description && (
            <Text style={s.cardDesc} numberOfLines={1}>{item.description}</Text>
          )}
          <View style={s.cardMeta}>
            <View style={s.metaItem}>
              <Ionicons name="people-outline" size={12} color={colors.textSecondary} />
              <Text style={s.metaText}>{item._count?.members ?? 0} membros</Text>
            </View>
            <View style={s.metaItem}>
              <Ionicons name="trophy-outline" size={12} color={colors.textSecondary} />
              <Text style={s.metaText}>{item._count?.challenges ?? 0} desafios</Text>
            </View>
            <View style={s.metaItem}>
              <Ionicons name="qr-code-outline" size={12} color={colors.primary} />
              <Text style={[s.metaText, { color: colors.primary }]}>{item.code}</Text>
            </View>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Grupos</Text>
          <Text style={s.headerSub}>{groups.length} grupo{groups.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.headerBtn} onPress={() => setJoinModal(true)}>
            <Ionicons name="enter-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.headerBtnPrimary} onPress={() => setCreateModal(true)}>
            <Ionicons name="add" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['10'] }} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={i => i.id}
          renderItem={renderGroup}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-circle-outline" size={56} color={colors.textDisabled} />
              <Text style={s.emptyTitle}>Nenhum grupo ainda</Text>
              <Text style={s.emptyText}>Crie um grupo ou entre pelo código</Text>
              <View style={s.emptyActions}>
                <TouchableOpacity style={s.emptyBtn} onPress={() => setCreateModal(true)}>
                  <Ionicons name="add" size={18} color={colors.white} />
                  <Text style={s.emptyBtnText}>Criar grupo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.emptyBtnOutline} onPress={() => setJoinModal(true)}>
                  <Ionicons name="enter-outline" size={18} color={colors.primary} />
                  <Text style={s.emptyBtnOutlineText}>Entrar por código</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
        />
      )}

      {/* Modal criar grupo com foto */}
      <Modal
        visible={createModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setCreateModal(false); resetCreateForm() }}
      >
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => { setCreateModal(false); resetCreateForm() }} />
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Criar grupo</Text>
            <TouchableOpacity onPress={() => { setCreateModal(false); resetCreateForm() }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.sheetBody} keyboardShouldPersistTaps="handled">

            {/* Seletor de foto */}
            <View style={s.avatarPickerSection}>
              <TouchableOpacity style={s.avatarPicker} onPress={handlePickAvatar} activeOpacity={0.8}>
                {uploadingImg ? (
                  <ActivityIndicator color={colors.primary} />
                ) : avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={s.avatarPreview} />
                ) : (
                  <View style={s.avatarPickerPlaceholder}>
                    <Ionicons name="camera-outline" size={28} color={colors.textSecondary} />
                    <Text style={s.avatarPickerText}>Foto do grupo</Text>
                    <Text style={s.avatarPickerSub}>opcional</Text>
                  </View>
                )}
              </TouchableOpacity>
              {avatarUri && !uploadingImg && (
                <TouchableOpacity
                  style={s.avatarRemoveBtn}
                  onPress={() => { setAvatarUri(null); setAvatarUrl(null) }}
                >
                  <Ionicons name="close-circle" size={22} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Nome do grupo *</Text>
              <TextInput
                style={s.input} value={newName} onChangeText={setNewName}
                placeholder="Ex: Turma Hipertrofia 2025" placeholderTextColor={colors.textDisabled}
                maxLength={50}
              />
            </View>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Descrição (opcional)</Text>
              <TextInput
                style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
                value={newDesc} onChangeText={setNewDesc}
                placeholder="Ex: Grupo para acompanhar o treino da turma..." placeholderTextColor={colors.textDisabled}
                multiline maxLength={200}
              />
            </View>
            <TouchableOpacity
              style={[s.saveBtn, (creating || uploadingImg) && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={creating || uploadingImg}
              activeOpacity={0.8}
            >
              {creating
                ? <ActivityIndicator color={colors.white} />
                : <Text style={s.saveBtnText}>Criar grupo</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal entrar por código */}
      <Modal visible={joinModal} transparent animationType="slide" onRequestClose={() => setJoinModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setJoinModal(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Entrar em um grupo</Text>
            <TouchableOpacity onPress={() => setJoinModal(false)}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={s.sheetBody}>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Código do grupo</Text>
              <TextInput
                style={s.input} value={joinCode}
                onChangeText={v => setJoinCode(v.toUpperCase())}
                placeholder="Ex: GRP-ABC123" placeholderTextColor={colors.textDisabled}
                autoCapitalize="characters" autoCorrect={false} maxLength={10}
              />
              <Text style={s.inputHint}>Peça o código GRP-XXXXXX ao criador do grupo</Text>
            </View>
            <TouchableOpacity
              style={[s.saveBtn, joining && { opacity: 0.6 }]}
              onPress={handleJoin} disabled={joining} activeOpacity={0.8}
            >
              {joining ? <ActivityIndicator color={colors.white} /> : <Text style={s.saveBtnText}>Entrar no grupo</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing['5'], paddingTop: spacing['5'], paddingBottom: spacing['3'], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle:     { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  headerSub:       { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing['1'] },
  headerRight:     { flexDirection: 'row', gap: spacing['2'] },
  headerBtn:       { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerBtnPrimary:{ width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

  list: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], gap: spacing['3'], ...shadows.sm },
  groupAvatar:            { width: 52, height: 52, borderRadius: radii.lg },
  groupAvatarPlaceholder: { width: 52, height: 52, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  groupAvatarInitial:     { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.white },

  cardInfo:    { flex: 1 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing['2'], flexWrap: 'wrap' },
  cardName:    { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary, flex: 1 },
  cardDesc:    { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  cardMeta:    { flexDirection: 'row', gap: spacing['3'], marginTop: spacing['2'], flexWrap: 'wrap' },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText:    { fontFamily: typography.family.regular, fontSize: 10, color: colors.textSecondary },

  ownerBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${'#F59E0B'}20`, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 2 },
  ownerBadgeText: { fontFamily: typography.family.medium, fontSize: 10, color: '#F59E0B' },

  empty:        { alignItems: 'center', marginTop: spacing['12'], gap: spacing['3'], paddingHorizontal: spacing['8'] },
  emptyTitle:   { fontFamily: typography.family.semiBold, fontSize: typography.size.lg, color: colors.textSecondary },
  emptyText:    { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textDisabled, textAlign: 'center' },
  emptyActions: { flexDirection: 'row', gap: spacing['3'], marginTop: spacing['2'] },
  emptyBtn:            { flexDirection: 'row', alignItems: 'center', gap: spacing['1'], backgroundColor: colors.primary, borderRadius: radii.lg, paddingHorizontal: spacing['4'], paddingVertical: spacing['3'] },
  emptyBtnText:        { fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.white },
  emptyBtnOutline:     { flexDirection: 'row', alignItems: 'center', gap: spacing['1'], backgroundColor: `${colors.primary}15`, borderRadius: radii.lg, paddingHorizontal: spacing['4'], paddingVertical: spacing['3'], borderWidth: 1.5, borderColor: `${colors.primary}40` },
  emptyBtnOutlineText: { fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.primary },

  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:      { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], maxHeight: '85%' },
  sheetHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['6'], paddingVertical: spacing['4'], borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle: { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  sheetBody:  { padding: spacing['6'], gap: spacing['4'], paddingBottom: spacing['10'] },

  // Avatar picker
  avatarPickerSection:   { alignItems: 'center', marginBottom: spacing['2'] },
  avatarPicker:          { width: 100, height: 100, borderRadius: radii.xl, backgroundColor: colors.surfaceHigh, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarPreview:         { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarPickerPlaceholder:{ alignItems: 'center', gap: 4 },
  avatarPickerText:      { fontFamily: typography.family.medium, fontSize: typography.size.xs, color: colors.textSecondary },
  avatarPickerSub:       { fontFamily: typography.family.regular, fontSize: 10, color: colors.textDisabled },
  avatarRemoveBtn:       { position: 'absolute', top: -4, right: '26%' },

  inputGroup: { gap: spacing['1'] },
  inputLabel: { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  inputHint:  { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textDisabled },
  input:      { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 52, paddingHorizontal: spacing['4'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  saveBtn:    { backgroundColor: colors.primary, borderRadius: radii.lg, height: 52, alignItems: 'center', justifyContent: 'center' },
  saveBtnText:{ fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },
})
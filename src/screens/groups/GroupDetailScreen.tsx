import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, Alert,
  Modal, TextInput, ScrollView, Share, Clipboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import Constants from 'expo-constants'
import { groupService } from '../../services/group.service'
import type { Group, GroupChallenge, GroupMember } from '../../services/group.service'
import { useAuth } from '../../contexts/AuthContext'
import { colors, typography, spacing, radii, shadows } from '../../theme'

const getBaseUrl = () => {
  const host = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants.manifest as any)?.debuggerHost
  if (host) return `http://${host.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', {
  day: '2-digit', month: 'short', year: 'numeric',
})

const getChallengeStatus = (c: GroupChallenge): 'upcoming' | 'active' | 'ended' => {
  const now   = new Date()
  const start = new Date(c.startDate)
  const end   = new Date(c.endDate)
  if (now < start) return 'upcoming'
  if (now > end)   return 'ended'
  return 'active'
}

const STATUS_CONFIG = {
  upcoming: { label: 'Em breve',  color: '#F59E0B',           icon: 'time-outline'           as const },
  active:   { label: 'Ativo',     color: colors.success,      icon: 'flash-outline'          as const },
  ended:    { label: 'Encerrado', color: colors.textDisabled, icon: 'checkmark-done-outline' as const },
}

const maskDate = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8)
  if (d.length > 4) return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`
  if (d.length > 2) return `${d.slice(0,2)}/${d.slice(2)}`
  return d
}

// ─── ChallengeItem ────────────────────────────

interface ChallengeItemProps {
  c:         GroupChallenge
  groupId:   string
  onRanking: (challengeId: string) => void
}

function ChallengeItem({ c, groupId, onRanking }: ChallengeItemProps) {
  const status  = getChallengeStatus(c)
  const cfg     = STATUS_CONFIG[status]
  const myCount = c.checkins?.length ?? 0
  const pct     = Math.min((myCount / c.goal) * 100, 100)

  return (
    <View style={s.challengeCard}>
      <View style={s.challengeHeader}>
        <View style={s.challengeTitleRow}>
          <Text style={s.challengeTitle}>{c.title}</Text>
          <View style={[s.statusBadge, { backgroundColor: `${cfg.color}20` }]}>
            <Ionicons name={cfg.icon} size={12} color={cfg.color} />
            <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        {c.description && <Text style={s.challengeDesc}>{c.description}</Text>}
      </View>

      <View style={s.challengeDates}>
        <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
        <Text style={s.challengeDateText}>
          {formatDate(c.startDate)} → {formatDate(c.endDate)}
        </Text>
      </View>

      <View style={s.progressSection}>
        <View style={s.progressHeader}>
          <Text style={s.progressLabel}>Seu progresso</Text>
          <Text style={s.progressCount}>{myCount}/{c.goal} treinos</Text>
        </View>
        <View style={s.progressBar}>
          <View style={[s.progressFill, {
            width: `${pct}%` as any,
            backgroundColor: pct >= 100 ? colors.success : colors.primary,
          }]} />
        </View>
        {/* ✅ Dica sobre como contabilizar */}
        <Text style={s.progressHint}>
          Faça check-in e checkout na tela de treinos para contabilizar
        </Text>
      </View>

      {/* ✅ Apenas botão de ranking — sem botão de check-in */}
      <TouchableOpacity
        style={s.rankingBtnFull}
        onPress={() => onRanking(c.id)}
        activeOpacity={0.8}
      >
        <Ionicons name="podium-outline" size={18} color={colors.primary} />
        <Text style={s.rankingBtnText}>Ver Ranking</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── MemberItem ───────────────────────────────

interface MemberItemProps {
  m: GroupMember
}

function MemberItem({ m }: MemberItemProps) {
  const avatarUrl   = m.user.avatar ? `${getBaseUrl()}${m.user.avatar}` : null
  const isItemOwner = m.role === 'OWNER'

  return (
    <View style={s.memberCard}>
      {avatarUrl
        ? <Image source={{ uri: avatarUrl }} style={s.memberAvatar} />
        : (
          <View style={s.memberAvatarPlaceholder}>
            <Text style={s.memberAvatarInitial}>{m.user.name.charAt(0).toUpperCase()}</Text>
          </View>
        )
      }
      <View style={s.memberInfo}>
        <View style={s.memberNameRow}>
          <Text style={s.memberName}>{m.user.name}</Text>
          {isItemOwner && (
            <View style={s.ownerBadge}>
              <Ionicons name="star" size={10} color="#F59E0B" />
              <Text style={s.ownerBadgeText}>Criador</Text>
            </View>
          )}
        </View>
        <Text style={s.memberCode}>{m.user.userCode}</Text>
      </View>
    </View>
  )
}

// ─── Tela principal ───────────────────────────

export function GroupDetailScreen() {
  const navigation  = useNavigation<any>()
  const route       = useRoute<any>()
  const { groupId } = route.params as { groupId: string }
  const { user }    = useAuth()

  const [group,      setGroup]      = useState<Group | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab,  setActiveTab]  = useState<'challenges' | 'members'>('challenges')

  const [challengeModal,    setChallengeModal]    = useState(false)
  const [challengeTitle,    setChallengeTitle]    = useState('')
  const [challengeDesc,     setChallengeDesc]     = useState('')
  const [challengeGoal,     setChallengeGoal]     = useState('7')
  const [challengeStart,    setChallengeStart]    = useState('')
  const [challengeEnd,      setChallengeEnd]      = useState('')
  const [creatingChallenge, setCreatingChallenge] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await groupService.getById(groupId)
      setGroup(data)
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o grupo.')
      navigation.goBack()
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [groupId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const isOwner    = group?.myRole === 'OWNER'
  const challenges = group?.challenges ?? []
  const members    = group?.members    ?? []

  const handleCreateChallenge = async () => {
    if (!challengeTitle.trim()) { Alert.alert('Atenção', 'Título é obrigatório.'); return }
    const goal = parseInt(challengeGoal)
    if (!goal || goal < 1) { Alert.alert('Atenção', 'Meta deve ser ao menos 1.'); return }
    if (!challengeStart || !challengeEnd) { Alert.alert('Atenção', 'Datas são obrigatórias.'); return }

    const parseDate = (str: string) => {
      const [d, m, y] = str.split('/')
      return new Date(`${y}-${m}-${d}`).toISOString()
    }

    try {
      setCreatingChallenge(true)
      await groupService.createChallenge(groupId, {
        title:       challengeTitle.trim(),
        description: challengeDesc.trim() || undefined,
        goal,
        startDate:   parseDate(challengeStart),
        endDate:     parseDate(challengeEnd),
      })
      setChallengeModal(false)
      setChallengeTitle(''); setChallengeDesc(''); setChallengeGoal('7')
      setChallengeStart(''); setChallengeEnd('')
      load(true)
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível criar o desafio.')
    } finally {
      setCreatingChallenge(false)
    }
  }

  const handleLeave = () => {
    Alert.alert('Sair do grupo', 'Deseja sair deste grupo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive',
        onPress: async () => {
          try {
            await groupService.leave(groupId)
            navigation.goBack()
          } catch (err: any) {
            Alert.alert('Erro', err?.message ?? 'Não foi possível sair do grupo.')
          }
        },
      },
    ])
  }

  const handleDelete = () => {
    Alert.alert('Deletar grupo', 'Esta ação é irreversível. Deseja deletar o grupo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Deletar', style: 'destructive',
        onPress: async () => {
          try {
            await groupService.delete(groupId)
            navigation.goBack()
          } catch (err: any) {
            Alert.alert('Erro', err?.message ?? 'Não foi possível deletar o grupo.')
          }
        },
      },
    ])
  }

  const handleShare = () => {
    if (!group) return
    Share.share({ message: `Entre no meu grupo "${group.name}" no FitGym!\nCódigo: ${group.code}` })
  }

  const footerComponent = isOwner ? (
    <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
      <Ionicons name="trash-outline" size={18} color={colors.error} />
      <Text style={s.deleteBtnText}>Deletar grupo</Text>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity style={s.leaveBtn} onPress={handleLeave}>
      <Ionicons name="exit-outline" size={18} color={colors.error} />
      <Text style={s.leaveBtnText}>Sair do grupo</Text>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['10'] }} />
      </SafeAreaView>
    )
  }

  if (!group) return null

  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{group.name}</Text>
          {group.description && <Text style={s.headerSub} numberOfLines={1}>{group.description}</Text>}
        </View>
        <TouchableOpacity style={s.headerBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Info card */}
      <View style={s.infoCard}>
        <TouchableOpacity
          style={s.codeBox}
          onPress={() => { Clipboard.setString(group.code); Alert.alert('Copiado!', `Código ${group.code} copiado.`) }}
        >
          <Ionicons name="qr-code-outline" size={16} color={colors.primary} />
          <Text style={s.codeText}>{group.code}</Text>
          <Ionicons name="copy-outline" size={14} color={colors.primary} />
        </TouchableOpacity>

        <View style={s.infoStats}>
          <View style={s.infoStat}>
            <Text style={s.infoStatValue}>{group._count?.members ?? members.length}</Text>
            <Text style={s.infoStatLabel}>Membros</Text>
          </View>
          <View style={s.infoStatDivider} />
          <View style={s.infoStat}>
            <Text style={s.infoStatValue}>{group._count?.challenges ?? challenges.length}</Text>
            <Text style={s.infoStatLabel}>Desafios</Text>
          </View>
          <View style={s.infoStatDivider} />
          <View style={s.infoStat}>
            <Text style={s.infoStatValue}>{challenges.filter(c => getChallengeStatus(c) === 'active').length}</Text>
            <Text style={s.infoStatLabel}>Ativos</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        <TouchableOpacity
          style={[s.tab, activeTab === 'challenges' && s.tabActive]}
          onPress={() => setActiveTab('challenges')}
        >
          <Ionicons name="trophy-outline" size={16} color={activeTab === 'challenges' ? colors.primary : colors.textSecondary} />
          <Text style={[s.tabText, activeTab === 'challenges' && s.tabTextActive]}>Desafios</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, activeTab === 'members' && s.tabActive]}
          onPress={() => setActiveTab('members')}
        >
          <Ionicons name="people-outline" size={16} color={activeTab === 'members' ? colors.primary : colors.textSecondary} />
          <Text style={[s.tabText, activeTab === 'members' && s.tabTextActive]}>Membros</Text>
        </TouchableOpacity>
        {isOwner && activeTab === 'challenges' && (
          <TouchableOpacity style={s.addChallengeBtn} onPress={() => setChallengeModal(true)}>
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={s.addChallengeBtnText}>Novo desafio</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ✅ FlatLists separados por tipo */}
      {activeTab === 'challenges' ? (
        <FlatList<GroupChallenge>
          data={challenges}
          keyExtractor={i => i.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true) }}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <ChallengeItem
              c={item}
              groupId={groupId}
              onRanking={challengeId => navigation.navigate('ChallengeRanking', { groupId, challengeId })}
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="trophy-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyText}>{isOwner ? 'Crie o primeiro desafio!' : 'Nenhum desafio ainda'}</Text>
            </View>
          }
          ListFooterComponent={footerComponent}
        />
      ) : (
        <FlatList<GroupMember>
          data={members}
          keyExtractor={i => i.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true) }}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => <MemberItem m={item} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyText}>Nenhum membro</Text>
            </View>
          }
          ListFooterComponent={footerComponent}
        />
      )}

      {/* Modal criar desafio */}
      <Modal visible={challengeModal} transparent animationType="slide" onRequestClose={() => setChallengeModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setChallengeModal(false)} />
        <View style={[s.sheet, { maxHeight: '85%' }]}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Criar desafio</Text>
            <TouchableOpacity onPress={() => setChallengeModal(false)}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.sheetBody} keyboardShouldPersistTaps="handled">
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Título *</Text>
              <TextInput
                style={s.input} value={challengeTitle} onChangeText={setChallengeTitle}
                placeholder="Ex: 30 dias de treino" placeholderTextColor={colors.textDisabled} maxLength={60}
              />
            </View>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Descrição (opcional)</Text>
              <TextInput
                style={[s.input, { minHeight: 72, textAlignVertical: 'top' }]}
                value={challengeDesc} onChangeText={setChallengeDesc}
                placeholder="Ex: Treinar ao menos 30 vezes em 30 dias!" placeholderTextColor={colors.textDisabled}
                multiline maxLength={200}
              />
            </View>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Meta (número de treinos) *</Text>
              <TextInput
                style={s.input} value={challengeGoal} onChangeText={setChallengeGoal}
                keyboardType="numeric" placeholder="Ex: 30" placeholderTextColor={colors.textDisabled} maxLength={3}
              />
            </View>
            <View style={s.dateRow}>
              <View style={[s.inputGroup, { flex: 1 }]}>
                <Text style={s.inputLabel}>Início *</Text>
                <TextInput
                  style={s.input} value={challengeStart}
                  onChangeText={v => setChallengeStart(maskDate(v))}
                  placeholder="DD/MM/AAAA" placeholderTextColor={colors.textDisabled}
                  keyboardType="numeric" maxLength={10}
                />
              </View>
              <View style={[s.inputGroup, { flex: 1 }]}>
                <Text style={s.inputLabel}>Fim *</Text>
                <TextInput
                  style={s.input} value={challengeEnd}
                  onChangeText={v => setChallengeEnd(maskDate(v))}
                  placeholder="DD/MM/AAAA" placeholderTextColor={colors.textDisabled}
                  keyboardType="numeric" maxLength={10}
                />
              </View>
            </View>
            <TouchableOpacity
              style={[s.saveBtn, creatingChallenge && { opacity: 0.6 }]}
              onPress={handleCreateChallenge}
              disabled={creatingChallenge}
              activeOpacity={0.8}
            >
              {creatingChallenge
                ? <ActivityIndicator color={colors.white} />
                : <Text style={s.saveBtnText}>Criar desafio</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header:       { flexDirection: 'row', alignItems: 'center', gap: spacing['2'], paddingHorizontal: spacing['5'], paddingTop: spacing['5'], paddingBottom: spacing['3'] },
  backBtn:      { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1 },
  headerTitle:  { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.textPrimary },
  headerSub:    { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },
  headerBtn:    { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },

  infoCard:        { marginHorizontal: spacing['5'], backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], gap: spacing['3'], ...shadows.sm },
  codeBox:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], backgroundColor: `${colors.primary}10`, borderRadius: radii.lg, paddingVertical: spacing['2'] },
  codeText:        { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.primary, letterSpacing: 2 },
  infoStats:       { flexDirection: 'row', justifyContent: 'space-around' },
  infoStat:        { alignItems: 'center', gap: 2 },
  infoStatValue:   { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  infoStatLabel:   { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },
  infoStatDivider: { width: 1, backgroundColor: colors.border },

  tabsRow:             { flexDirection: 'row', paddingHorizontal: spacing['5'], paddingBottom: spacing['3'], gap: spacing['2'], alignItems: 'center' },
  tab:                 { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['1'], paddingVertical: spacing['3'], borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  tabActive:           { backgroundColor: `${colors.primary}15`, borderColor: colors.primary },
  tabText:             { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  tabTextActive:       { color: colors.primary, fontFamily: typography.family.semiBold },
  addChallengeBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: radii.lg, paddingHorizontal: spacing['3'], paddingVertical: spacing['3'] },
  addChallengeBtnText: { fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.white },

  list: { paddingHorizontal: spacing['5'], paddingBottom: spacing['6'] },

  challengeCard:     { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], gap: spacing['3'], ...shadows.sm },
  challengeHeader:   { gap: spacing['1'] },
  challengeTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing['2'] },
  challengeTitle:    { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary, flex: 1 },
  challengeDesc:     { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },
  statusBadge:       { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 3 },
  statusText:        { fontFamily: typography.family.medium, fontSize: 10 },
  challengeDates:    { flexDirection: 'row', alignItems: 'center', gap: spacing['1'] },
  challengeDateText: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },

  progressSection: { gap: spacing['1'] },
  progressHeader:  { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel:   { fontFamily: typography.family.medium, fontSize: typography.size.xs, color: colors.textSecondary },
  progressCount:   { fontFamily: typography.family.bold, fontSize: typography.size.xs, color: colors.primary },
  progressBar:     { height: 6, backgroundColor: colors.surfaceHigh, borderRadius: 3, overflow: 'hidden' },
  progressFill:    { height: '100%', borderRadius: 3 },
  progressHint:    { fontFamily: typography.family.regular, fontSize: 10, color: colors.textDisabled, marginTop: 2 },

  // ✅ Botão ranking ocupa largura total
  rankingBtnFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], backgroundColor: `${colors.primary}15`, borderRadius: radii.lg, height: 44, borderWidth: 1.5, borderColor: `${colors.primary}30` },
  rankingBtnText: { fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.primary },

  memberCard:              { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], gap: spacing['3'], ...shadows.sm },
  memberAvatar:            { width: 48, height: 48, borderRadius: radii.full, borderWidth: 2, borderColor: colors.primary },
  memberAvatarPlaceholder: { width: 48, height: 48, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary },
  memberAvatarInitial:     { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.white },
  memberInfo:              { flex: 1 },
  memberNameRow:           { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  memberName:              { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  memberCode:              { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textDisabled, marginTop: 2, letterSpacing: 1 },
  ownerBadge:              { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${'#F59E0B'}20`, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 2 },
  ownerBadgeText:          { fontFamily: typography.family.medium, fontSize: 10, color: '#F59E0B' },

  leaveBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], paddingVertical: spacing['5'], marginTop: spacing['2'] },
  leaveBtnText: { fontFamily: typography.family.medium, fontSize: typography.size.base, color: colors.error },
  deleteBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], paddingVertical: spacing['5'], marginTop: spacing['2'] },
  deleteBtnText:{ fontFamily: typography.family.medium, fontSize: typography.size.base, color: colors.error },

  empty:     { alignItems: 'center', marginTop: spacing['10'], gap: spacing['2'] },
  emptyText: { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textDisabled },

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'] },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['6'], paddingVertical: spacing['4'], borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  sheetBody:   { padding: spacing['6'], gap: spacing['4'], paddingBottom: spacing['10'] },
  inputGroup:  { gap: spacing['1'] },
  inputLabel:  { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  input:       { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 52, paddingHorizontal: spacing['4'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  dateRow:     { flexDirection: 'row', gap: spacing['3'] },
  saveBtn:     { backgroundColor: colors.primary, borderRadius: radii.lg, height: 52, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },
})
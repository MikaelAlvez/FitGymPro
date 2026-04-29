import React, { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Image, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { useNavigation } from '@react-navigation/native'  // ✅ import no topo
import { userService } from '../../services/user.service'
import { friendService } from '../../services/friend.service'
import type { FriendStatusResult } from '../../services/friend.service'
import { colors, typography, spacing, radii, shadows } from '../../theme'

const getBaseUrl = () => {
  const host = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants.manifest as any)?.debuggerHost
  if (host) return `http://${host.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}

const isUserCode = (text: string) => /^[A-Z]{2,3}-[A-Z0-9]{6}$/.test(text.trim().toUpperCase())

type SearchResult = {
  id: string; name: string; email: string; role: string
  avatar: string | null; userCode: string
  city: string | null; state: string | null
  personalProfile?: { cref: string; classFormat: string } | null
  studentProfile?:  { goal: string; experience: string } | null
}

const ROLE_LABEL: Record<string, string> = {
  STUDENT:  'Aluno',
  PERSONAL: 'Personal Trainer',
}

const FORMAT_LABEL: Record<string, string> = {
  presential: 'Presencial', online: 'Online', hybrid: 'Híbrido',
}

export function CommunitySearchScreen() {
  const navigation = useNavigation<any>()  // ✅ aqui, no topo do componente

  const [search,       setSearch]       = useState('')
  const [loading,      setLoading]      = useState(false)
  const [result,       setResult]       = useState<SearchResult | null>(null)
  const [friendStatus, setFriendStatus] = useState<FriendStatusResult | null>(null)
  const [actioning,    setActioning]    = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = async (code: string) => {
    setLoading(true)
    setResult(null)
    setFriendStatus(null)
    try {
      const user   = await userService.searchByCode(code)
      const status = await friendService.getStatus(user.id)
      setResult(user)
      setFriendStatus(status)
    } catch {
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (v: string) => {
    setSearch(v)
    setResult(null)
    setFriendStatus(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const upper = v.trim().toUpperCase()
    if (isUserCode(upper)) {
      debounceRef.current = setTimeout(() => doSearch(upper), 400)
    }
  }

  const handleSubmit = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const upper = search.trim().toUpperCase()
    if (upper) doSearch(upper)
  }

  const handleSendRequest = async () => {
    if (!result) return
    try {
      setActioning(true)
      await friendService.sendRequest(result.id)
      const status = await friendService.getStatus(result.id)
      setFriendStatus(status)
      Alert.alert('Solicitação enviada!', `${result.name} receberá sua solicitação de amizade.`)
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível enviar a solicitação.')
    } finally {
      setActioning(false)
    }
  }

  const handleUnfriend = async () => {
    if (!result) return
    Alert.alert(
      'Desfazer amizade',
      `Deseja desfazer a amizade com ${result.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desfazer', style: 'destructive',
          onPress: async () => {
            try {
              setActioning(true)
              await friendService.unfriend(result.id)
              setFriendStatus({ status: null, requestId: null, isSender: false })
            } catch {
              Alert.alert('Erro', 'Não foi possível desfazer a amizade.')
            } finally {
              setActioning(false)
            }
          },
        },
      ],
    )
  }

  // ✅ navigation agora está acessível aqui pois foi declarado no topo
  const renderActionButton = () => {
    if (!result || !friendStatus) return null
    const { status, requestId, isSender } = friendStatus

    if (actioning) return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['4'] }} />

    if (status === 'ACCEPTED') {
      return (
        <TouchableOpacity style={s.unfriendBtn} onPress={handleUnfriend} activeOpacity={0.8}>
          <Ionicons name="person-remove-outline" size={18} color={colors.error} />
          <Text style={s.unfriendBtnText}>Desfazer amizade</Text>
        </TouchableOpacity>
      )
    }

    if (status === 'PENDING' && isSender) {
      return (
        <View style={s.pendingBtn}>
          <Ionicons name="time-outline" size={18} color="#F59E0B" />
          <Text style={s.pendingBtnText}>Solicitação enviada</Text>
        </View>
      )
    }

    if (status === 'PENDING' && !isSender) {
      return (
        <View style={s.pendingRow}>
          <TouchableOpacity
            style={s.acceptBtn}
            onPress={async () => {
              if (!requestId) return
              try {
                setActioning(true)
                await friendService.acceptRequest(requestId)
                setFriendStatus({ status: 'ACCEPTED', requestId, isSender: false })
              } catch {
                Alert.alert('Erro', 'Não foi possível aceitar.')
              } finally {
                setActioning(false)
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={18} color={colors.white} />
            <Text style={s.acceptBtnText}>Aceitar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.rejectBtn}
            onPress={async () => {
              if (!requestId) return
              try {
                setActioning(true)
                await friendService.rejectRequest(requestId)
                setFriendStatus({ status: 'REJECTED', requestId, isSender: false })
              } catch {
                Alert.alert('Erro', 'Não foi possível recusar.')
              } finally {
                setActioning(false)
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={18} color={colors.error} />
            <Text style={s.rejectBtnText}>Recusar</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <TouchableOpacity style={s.addBtn} onPress={handleSendRequest} activeOpacity={0.8}>
        <Ionicons name="person-add-outline" size={18} color={colors.white} />
        <Text style={s.addBtnText}>Adicionar amigo</Text>
      </TouchableOpacity>
    )
  }

  const avatarUrl = result?.avatar ? `${getBaseUrl()}${result.avatar}` : null

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Buscar na Comunidade</Text>
          <Text style={s.headerSub}>Encontre amigos pelo código</Text>
        </View>
      </View>

      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={handleChange}
            onSubmitEditing={handleSubmit}
            placeholder="Ex: STU-4EA142 ou PER-B186CB"
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {loading && <ActivityIndicator size="small" color={colors.primary} />}
          {search.length > 0 && !loading && (
            <TouchableOpacity onPress={() => { setSearch(''); setResult(null) }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={s.searchBtn} onPress={handleSubmit} activeOpacity={0.8}>
          <Ionicons name="search" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {result ? (
          <View style={s.resultCard}>
            {avatarUrl
              ? <Image source={{ uri: avatarUrl }} style={s.resultAvatar} />
              : (
                <View style={s.resultAvatarPlaceholder}>
                  <Text style={s.resultAvatarInitial}>{result.name.charAt(0).toUpperCase()}</Text>
                </View>
              )
            }
            <Text style={s.resultName}>{result.name}</Text>
            <View style={s.resultRoleBadge}>
              <Ionicons
                name={result.role === 'PERSONAL' ? 'fitness-outline' : 'person-outline'}
                size={12}
                color={result.role === 'PERSONAL' ? colors.primary : colors.success}
              />
              <Text style={[s.resultRoleText, { color: result.role === 'PERSONAL' ? colors.primary : colors.success }]}>
                {ROLE_LABEL[result.role] ?? result.role}
              </Text>
            </View>
            <Text style={s.resultCode}>{result.userCode}</Text>

            {(result.city || result.state) && (
              <View style={s.locationRow}>
                <Ionicons name="map-outline" size={13} color={colors.textSecondary} />
                <Text style={s.locationText}>
                  {[result.city, result.state].filter(Boolean).join(' — ')}
                </Text>
              </View>
            )}

            {result.personalProfile && (
              <View style={s.chipsRow}>
                {result.personalProfile.cref && (
                  <View style={s.chip}>
                    <Text style={s.chipText}>CREF: {result.personalProfile.cref}</Text>
                  </View>
                )}
                {result.personalProfile.classFormat && (
                  <View style={s.chip}>
                    <Text style={s.chipText}>{FORMAT_LABEL[result.personalProfile.classFormat]}</Text>
                  </View>
                )}
              </View>
            )}

            {result.studentProfile && (
              <View style={s.chipsRow}>
                {result.studentProfile.goal && (
                  <View style={s.chip}>
                    <Text style={s.chipText}>{result.studentProfile.goal}</Text>
                  </View>
                )}
              </View>
            )}

            {renderActionButton()}
          </View>
        ) : !loading && search.length > 0 && (
          <View style={s.empty}>
            <Ionicons name="search-outline" size={48} color={colors.textDisabled} />
            <Text style={s.emptyTitle}>Nenhum resultado</Text>
            <Text style={s.emptyText}>Verifique o código e tente novamente</Text>
          </View>
        )}

        {!result && !loading && search.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color={colors.textDisabled} />
            <Text style={s.emptyTitle}>Busque por código</Text>
            <Text style={s.emptyText}>Digite o código do usuário no formato STU-XXXXXX ou PER-XXXXXX</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },

  header:      { flexDirection: 'row', alignItems: 'center', gap: spacing['3'], paddingHorizontal: spacing['5'], paddingTop: spacing['5'], paddingBottom: spacing['3'] },
  backBtn:     { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  headerSub:   { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing['1'] },

  searchRow:   { paddingHorizontal: spacing['5'], paddingBottom: spacing['4'], flexDirection: 'row', gap: spacing['2'] },
  searchBox:   { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 48, paddingHorizontal: spacing['4'], gap: spacing['2'] },
  searchInput: { flex: 1, fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  searchBtn:   { width: 48, height: 48, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

  body: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  resultCard:              { backgroundColor: colors.surface, borderRadius: radii['2xl'], padding: spacing['6'], alignItems: 'center', gap: spacing['3'], ...shadows.sm },
  resultAvatar:            { width: 80, height: 80, borderRadius: radii.full, borderWidth: 3, borderColor: colors.primary },
  resultAvatarPlaceholder: { width: 80, height: 80, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.primary },
  resultAvatarInitial:     { fontFamily: typography.family.bold, fontSize: typography.size['2xl'], color: colors.white },
  resultName:              { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  resultRoleBadge:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultRoleText:          { fontFamily: typography.family.medium, fontSize: typography.size.sm },
  resultCode:              { fontFamily: typography.family.bold, fontSize: typography.size.sm, color: colors.textDisabled, letterSpacing: 2 },

  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing['1'] },
  locationText: { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'], justifyContent: 'center' },
  chip:     { backgroundColor: colors.surfaceHigh, borderRadius: radii.full, paddingHorizontal: spacing['3'], paddingVertical: spacing['1'] },
  chipText: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },

  addBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], backgroundColor: colors.primary, borderRadius: radii.lg, height: 48, width: '100%' },
  addBtnText:  { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },

  pendingBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], backgroundColor: `${'#F59E0B'}20`, borderRadius: radii.lg, height: 48, width: '100%' },
  pendingBtnText: { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: '#F59E0B' },

  pendingRow:    { flexDirection: 'row', gap: spacing['3'], width: '100%' },
  acceptBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], backgroundColor: colors.success, borderRadius: radii.lg, height: 48 },
  acceptBtnText: { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },
  rejectBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], backgroundColor: `${colors.error}15`, borderRadius: radii.lg, height: 48 },
  rejectBtnText: { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.error },

  unfriendBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], backgroundColor: `${colors.error}10`, borderRadius: radii.lg, height: 48, width: '100%', borderWidth: 1.5, borderColor: `${colors.error}30` },
  unfriendBtnText: { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.error },

  empty:      { alignItems: 'center', marginTop: spacing['12'], gap: spacing['3'], paddingHorizontal: spacing['8'] },
  emptyTitle: { fontFamily: typography.family.semiBold, fontSize: typography.size.lg, color: colors.textSecondary },
  emptyText:  { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textDisabled, textAlign: 'center' },
})
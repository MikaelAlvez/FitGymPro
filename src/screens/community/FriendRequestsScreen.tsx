import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Alert, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import Constants from 'expo-constants'
import { friendService } from '../../services/friend.service'
import type { FriendRequest } from '../../services/friend.service'
import { colors, typography, spacing, radii, shadows } from '../../theme'

const getBaseUrl = () => {
  const host = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants.manifest as any)?.debuggerHost
  if (host) return `http://${host.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}

const ROLE_LABEL: Record<string, string> = {
  STUDENT:  'Aluno',
  PERSONAL: 'Personal Trainer',
}

export function FriendRequestsScreen() {
  const navigation = useNavigation<any>()
  const [requests,   setRequests]   = useState<FriendRequest[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actioning,  setActioning]  = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await friendService.listPendingRequests()
      setRequests(data)
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as solicitações.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const handleAccept = async (request: FriendRequest) => {
    try {
      setActioning(request.id)
      await friendService.acceptRequest(request.id)
      setRequests(prev => prev.filter(r => r.id !== request.id))
      Alert.alert('Amizade aceita!', `Você e ${request.sender?.name} agora são amigos.`)
    } catch {
      Alert.alert('Erro', 'Não foi possível aceitar a solicitação.')
    } finally {
      setActioning(null)
    }
  }

  const handleReject = async (request: FriendRequest) => {
    Alert.alert(
      'Recusar solicitação',
      `Deseja recusar a solicitação de ${request.sender?.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recusar', style: 'destructive',
          onPress: async () => {
            try {
              setActioning(request.id)
              await friendService.rejectRequest(request.id)
              setRequests(prev => prev.filter(r => r.id !== request.id))
            } catch {
              Alert.alert('Erro', 'Não foi possível recusar a solicitação.')
            } finally {
              setActioning(null)
            }
          },
        },
      ],
    )
  }

  const renderRequest = ({ item }: { item: FriendRequest }) => {
    const sender     = item.sender
    if (!sender) return null
    const avatarUrl  = sender.avatar ? `${getBaseUrl()}${sender.avatar}` : null
    const isActioning= actioning === item.id

    return (
      <View style={s.card}>
        {avatarUrl
          ? <Image source={{ uri: avatarUrl }} style={s.avatar} />
          : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarInitial}>{sender.name.charAt(0).toUpperCase()}</Text>
            </View>
          )
        }

        <View style={s.info}>
          <Text style={s.name}>{sender.name}</Text>
          <View style={s.roleBadge}>
            <Ionicons
              name={sender.role === 'PERSONAL' ? 'fitness-outline' : 'person-outline'}
              size={11}
              color={sender.role === 'PERSONAL' ? colors.primary : colors.success}
            />
            <Text style={[s.roleText, { color: sender.role === 'PERSONAL' ? colors.primary : colors.success }]}>
              {ROLE_LABEL[sender.role] ?? sender.role}
            </Text>
          </View>
          {sender.userCode && (
            <Text style={s.userCode}>{sender.userCode}</Text>
          )}
        </View>

        {isActioning ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={s.actions}>
            <TouchableOpacity style={s.acceptBtn} onPress={() => handleAccept(item)} activeOpacity={0.8}>
              <Ionicons name="checkmark" size={20} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={s.rejectBtn} onPress={() => handleReject(item)} activeOpacity={0.8}>
              <Ionicons name="close" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Solicitações</Text>
          <Text style={s.headerSub}>
            {requests.length} pendente{requests.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['10'] }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={i => i.id}
          renderItem={renderRequest}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true) }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyTitle}>Nenhuma solicitação</Text>
              <Text style={s.emptyText}>Quando alguém te adicionar, aparecerá aqui</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header:      { flexDirection: 'row', alignItems: 'center', gap: spacing['3'], paddingHorizontal: spacing['5'], paddingTop: spacing['5'], paddingBottom: spacing['4'] },
  backBtn:     { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  headerSub:   { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 },

  list: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  card:              { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], gap: spacing['3'], ...shadows.sm },
  avatar:            { width: 52, height: 52, borderRadius: radii.full, borderWidth: 2, borderColor: colors.primary },
  avatarPlaceholder: { width: 52, height: 52, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary },
  avatarInitial:     { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.white },

  info:     { flex: 1 },
  name:     { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  roleBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  roleText: { fontFamily: typography.family.medium, fontSize: typography.size.xs },
  userCode: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textDisabled, letterSpacing: 1, marginTop: 2 },

  actions:   { flexDirection: 'row', gap: spacing['2'] },
  acceptBtn: { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { width: 40, height: 40, borderRadius: radii.full, backgroundColor: `${colors.error}15`, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: `${colors.error}30` },

  empty:      { alignItems: 'center', marginTop: spacing['12'], gap: spacing['3'], paddingHorizontal: spacing['8'] },
  emptyTitle: { fontFamily: typography.family.semiBold, fontSize: typography.size.lg, color: colors.textSecondary },
  emptyText:  { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textDisabled, textAlign: 'center' },
})
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Alert, ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { personalRequestService } from '../../services/personal-request.service'
import type { PersonalRequest } from '../../services/personal-request.service'
import { colors, typography, spacing, radii, shadows } from '../../theme'

const getBaseUrl = () => {
  const host = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants.manifest as any)?.debuggerHost
  if (host) return `http://${host.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}

const EXPERIENCE_LABEL: Record<string, string> = {
  beginner:     'Iniciante',
  intermediate: 'Intermediário',
  advanced:     'Avançado',
}

export function PersonalRequestsScreen() {
  const [requests,   setRequests]   = useState<PersonalRequest[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await personalRequestService.listPendingRequests()
      setRequests(data)
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as solicitações.')
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

  const handleAccept = (item: PersonalRequest) => {
    Alert.alert(
      'Aceitar solicitação',
      `Deseja aceitar ${item.student?.name} como seu aluno?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceitar',
          onPress: async () => {
            try {
              setProcessing(item.id)
              await personalRequestService.acceptRequest(item.id)
              Alert.alert('Aceito!', `${item.student?.name} agora é seu aluno.`)
              load(true)
            } catch (err: any) {
              Alert.alert('Erro', err?.message ?? 'Não foi possível aceitar.')
            } finally {
              setProcessing(null)
            }
          },
        },
      ],
    )
  }

  const handleReject = (item: PersonalRequest) => {
    Alert.alert(
      'Recusar solicitação',
      `Deseja recusar a solicitação de ${item.student?.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recusar',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(item.id)
              await personalRequestService.rejectRequest(item.id)
              Alert.alert('Recusado', 'A solicitação foi recusada.')
              load(true)
            } catch (err: any) {
              Alert.alert('Erro', err?.message ?? 'Não foi possível recusar.')
            } finally {
              setProcessing(null)
            }
          },
        },
      ],
    )
  }

  const renderRequest = ({ item }: { item: PersonalRequest }) => {
    const student    = item.student
    const avatarUrl  = student?.avatar ? `${getBaseUrl()}${student.avatar}` : null
    const isProcessing = processing === item.id
    const experience = student?.studentProfile?.experience
      ? EXPERIENCE_LABEL[student.studentProfile.experience] ?? student.studentProfile.experience
      : null

    return (
      <View style={s.card}>
        {/* Avatar + info */}
        <View style={s.cardTop}>
          {avatarUrl
            ? <Image source={{ uri: avatarUrl }} style={s.avatar} />
            : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarInitial}>{student?.name.charAt(0).toUpperCase()}</Text>
              </View>
            )
          }
          <View style={s.info}>
            <Text style={s.name}>{student?.name}</Text>
            <View style={s.tags}>
              {student?.studentProfile?.goal && (
                <View style={s.tag}>
                  <Ionicons name="fitness-outline" size={11} color={colors.primary} />
                  <Text style={s.tagText}>{student.studentProfile.goal}</Text>
                </View>
              )}
              {experience && (
                <View style={s.tag}>
                  <Ionicons name="bar-chart-outline" size={11} color={colors.textSecondary} />
                  <Text style={s.tagText}>{experience}</Text>
                </View>
              )}
              {(student?.city || student?.state) && (
                <View style={s.tag}>
                  <Ionicons name="map-outline" size={11} color={colors.textSecondary} />
                  <Text style={s.tagText}>{[student.city, student.state].filter(Boolean).join(' - ')}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Mensagem */}
        {item.message && (
          <View style={s.msgBox}>
            <Ionicons name="chatbubble-outline" size={14} color={colors.textSecondary} />
            <Text style={s.msgText}>{item.message}</Text>
          </View>
        )}

        {/* Data */}
        <Text style={s.date}>
          Solicitado em {new Date(item.createdAt).toLocaleDateString('pt-BR')}
        </Text>

        {/* Botões */}
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.rejectBtn, isProcessing && { opacity: 0.5 }]}
            onPress={() => handleReject(item)}
            disabled={!!processing}
            activeOpacity={0.8}
          >
            {isProcessing
              ? <ActivityIndicator size="small" color={colors.error} />
              : <>
                  <Ionicons name="close" size={18} color={colors.error} />
                  <Text style={s.rejectBtnText}>Recusar</Text>
                </>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.acceptBtn, isProcessing && { opacity: 0.5 }]}
            onPress={() => handleAccept(item)}
            disabled={!!processing}
            activeOpacity={0.8}
          >
            {isProcessing
              ? <ActivityIndicator size="small" color={colors.white} />
              : <>
                  <Ionicons name="checkmark" size={18} color={colors.white} />
                  <Text style={s.acceptBtnText}>Aceitar</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Solicitações</Text>
        <Text style={s.headerSub}>Alunos que querem seu acompanhamento</Text>
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="mail-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyText}>Nenhuma solicitação pendente</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },

  header:     { paddingHorizontal: spacing['5'], paddingTop: spacing['5'], paddingBottom: spacing['3'] },
  headerTitle:{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  headerSub:  { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing['1'] },

  list: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  card: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], gap: spacing['3'], ...shadows.sm },

  cardTop:           { flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },
  avatar:            { width: 52, height: 52, borderRadius: radii.full, borderWidth: 2, borderColor: colors.primary },
  avatarPlaceholder: { width: 52, height: 52, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary },
  avatarInitial:     { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.white },

  info:    { flex: 1 },
  name:    { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  tags:    { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['1'], marginTop: spacing['2'] },
  tag:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.surfaceHigh, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 3 },
  tagText: { fontFamily: typography.family.regular, fontSize: 10, color: colors.textSecondary },

  msgBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['2'], backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'] },
  msgText: { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, flex: 1 },

  date: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textDisabled },

  actions:       { flexDirection: 'row', gap: spacing['3'] },
  rejectBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], borderWidth: 1.5, borderColor: colors.error, borderRadius: radii.lg, height: 44 },
  rejectBtnText: { fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.error },
  acceptBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], backgroundColor: colors.primary, borderRadius: radii.lg, height: 44 },
  acceptBtnText: { fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.white },

  empty:     { alignItems: 'center', marginTop: spacing['10'], gap: spacing['3'] },
  emptyText: { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textDisabled },
})
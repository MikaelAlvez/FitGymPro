import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, Image,
  ActivityIndicator, TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import Constants from 'expo-constants'
import { groupService } from '../../services/group.service'
import type { ChallengeRanking } from '../../services/group.service'
import { useAuth } from '../../contexts/AuthContext'
import { colors, typography, spacing, radii, shadows } from '../../theme'

const getBaseUrl = () => {
  const host = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants.manifest as any)?.debuggerHost
  if (host) return `http://${host.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}

const MEDAL_COLORS = ['#F59E0B', '#9CA3AF', '#CD7C2F']
const MEDAL_ICONS  = ['trophy', 'medal', 'ribbon'] as const

export function ChallengeRankingScreen() {
  const navigation = useNavigation<any>()
  const route      = useRoute<any>()
  const { groupId, challengeId } = route.params as { groupId: string; challengeId: string }
  const { user } = useAuth()

  const [data,    setData]    = useState<ChallengeRanking | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const result = await groupService.getRanking(groupId, challengeId)
      setData(result)
    } catch {
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }, [groupId, challengeId])

  React.useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['10'] }} />
      </SafeAreaView>
    )
  }

  if (!data) return null

  const { challenge, ranking } = data
  const goal = challenge.goal

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{challenge.title}</Text>
          <Text style={s.headerSub}>Meta: {goal} treinos</Text>
        </View>
      </View>

      <FlatList
        data={ranking}
        keyExtractor={i => i.user.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>Placar</Text>
            <Text style={s.summaryCompleted}>
              {ranking.filter(r => r.done).length}/{ranking.length} membros completaram
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const isMe      = item.user.id === user?.id
          const avatarUrl = item.user.avatar ? `${getBaseUrl()}${item.user.avatar}` : null
          const pct       = Math.min((item.checkins / goal) * 100, 100)
          const medal     = index < 3 ? MEDAL_COLORS[index] : null
          const medalIcon = index < 3 ? MEDAL_ICONS[index] : null

          return (
            <View style={[s.rankCard, isMe && s.rankCardMe]}>
              {/* Posição */}
              <View style={s.rankPos}>
                {medal
                  ? <Ionicons name={medalIcon!} size={24} color={medal} />
                  : <Text style={s.rankPosText}>{index + 1}</Text>
                }
              </View>

              {/* Avatar */}
              {avatarUrl
                ? <Image source={{ uri: avatarUrl }} style={[s.rankAvatar, isMe && { borderColor: colors.primary }]} />
                : (
                  <View style={[s.rankAvatarPlaceholder, isMe && { borderColor: colors.primary }]}>
                    <Text style={s.rankAvatarInitial}>{item.user.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )
              }

              {/* Info */}
              <View style={s.rankInfo}>
                <View style={s.rankNameRow}>
                  <Text style={[s.rankName, isMe && { color: colors.primary }]} numberOfLines={1}>
                    {item.user.name} {isMe ? '(você)' : ''}
                  </Text>
                  {item.done && (
                    <View style={s.doneBadge}>
                      <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                      <Text style={s.doneBadgeText}>Meta atingida</Text>
                    </View>
                  )}
                </View>
                {/* Barra de progresso */}
                <View style={s.progressBar}>
                  <View style={[s.progressFill, {
                    width: `${pct}%` as any,
                    backgroundColor: item.done ? colors.success : isMe ? colors.primary : colors.textSecondary,
                  }]} />
                </View>
                <Text style={s.rankCheckins}>{item.checkins}/{goal} check-ins</Text>
              </View>
            </View>
          )
        }}
      />
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

  list: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  summaryCard:      { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['4'], alignItems: 'center', gap: spacing['1'], ...shadows.sm },
  summaryTitle:     { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  summaryCompleted: { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary },

  rankCard:               { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], gap: spacing['3'], ...shadows.sm },
  rankCardMe:             { borderWidth: 1.5, borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}08` },
  rankPos:                { width: 32, alignItems: 'center' },
  rankPosText:            { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.textSecondary },
  rankAvatar:             { width: 44, height: 44, borderRadius: radii.full, borderWidth: 2, borderColor: colors.border },
  rankAvatarPlaceholder:  { width: 44, height: 44, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border },
  rankAvatarInitial:      { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },
  rankInfo:      { flex: 1, gap: spacing['1'] },
  rankNameRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing['2'], flexWrap: 'wrap' },
  rankName:      { fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.textPrimary, flex: 1 },
  doneBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${colors.success}15`, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 2 },
  doneBadgeText: { fontFamily: typography.family.medium, fontSize: 10, color: colors.success },
  progressBar:   { height: 6, backgroundColor: colors.surfaceHigh, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },
  rankCheckins:  { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },
})
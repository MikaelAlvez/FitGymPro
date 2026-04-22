import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import Constants from 'expo-constants'
import { sessionService } from '../../services/session.service'
import type { WorkoutSession } from '../../services/session.service'
import { colors, typography, spacing, radii, shadows } from '../../theme'

const getBaseUrl = () => {
  const host = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants.manifest as any)?.debuggerHost
  if (host) return `http://${host.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

const formatTime = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function StudentFeedScreen() {
  const [sessions,   setSessions]   = useState<WorkoutSession[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await sessionService.getHistory()
      setSessions(data)
    } catch {
      // silencia
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const renderSession = ({ item }: { item: WorkoutSession }) => {
    const photoStartUrl = item.photoStart ? `${getBaseUrl()}${item.photoStart}` : null
    const photoEndUrl   = item.photoEnd   ? `${getBaseUrl()}${item.photoEnd}`   : null

    return (
      <View style={s.card}>

        {/* ─── Header ─── */}
        <View style={s.cardHeader}>
          <View style={s.cardIconBox}>
            <Ionicons name="barbell" size={18} color={colors.primary} />
          </View>
          <View style={s.cardHeaderInfo}>
            <Text style={s.cardWorkoutName}>{item.workout?.name ?? 'Treino'}</Text>
            <Text style={s.cardDate}>{formatDate(item.startedAt)}</Text>
          </View>
          <View style={s.completedBadge}>
            <Ionicons name="checkmark-circle" size={13} color={colors.success} />
            <Text style={s.completedBadgeText}>Concluído</Text>
          </View>
        </View>

        {/* ─── Fotos ─── */}
        {(photoStartUrl || photoEndUrl) && (
          <View style={s.photosRow}>
            {photoStartUrl && (
              <View style={s.photoBox}>
                <Image source={{ uri: photoStartUrl }} style={s.photo} />
                <View style={s.photoLabel}>
                  <Text style={s.photoLabelText}>Início</Text>
                </View>
              </View>
            )}
            {photoEndUrl && (
              <View style={s.photoBox}>
                <Image source={{ uri: photoEndUrl }} style={s.photo} />
                <View style={s.photoLabel}>
                  <Text style={s.photoLabelText}>Fim</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ─── Legenda ─── */}
        <Text style={s.caption}>{item.caption}</Text>

        {/* ─── Observação ─── */}
        {item.notes && (
          <View style={s.notesBox}>
            <Ionicons name="chatbubble-outline" size={13} color={colors.textSecondary} />
            <Text style={s.notesText}>{item.notes}</Text>
          </View>
        )}

        {/* ─── Stats ─── */}
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Ionicons name="time-outline" size={14} color={colors.primary} />
            <Text style={s.statValue}>{item.duration ? formatDuration(item.duration) : '—'}</Text>
            <Text style={s.statLabel}>Duração</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Ionicons name="log-in-outline" size={14} color={colors.success} />
            <Text style={s.statValue}>{formatTime(item.startedAt)}</Text>
            <Text style={s.statLabel}>Check-in</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Ionicons name="log-out-outline" size={14} color={colors.error} />
            <Text style={s.statValue}>{item.finishedAt ? formatTime(item.finishedAt) : '—'}</Text>
            <Text style={s.statLabel}>Check-out</Text>
          </View>
        </View>

        {/* ─── Localização ─── */}
        {item.location && (
          <View style={s.locationRow}>
            <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
            <Text style={s.locationText} numberOfLines={1}>{item.location}</Text>
          </View>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={s.safe}>

      <View style={s.header}>
        <Text style={s.headerTitle}>Meu Feed</Text>
        <Text style={s.headerSub}>
          {sessions.length} treino{sessions.length !== 1 ? 's' : ''} registrado{sessions.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['10'] }} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={i => i.id}
          renderItem={renderSession}
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
              <Ionicons name="fitness-outline" size={52} color={colors.textDisabled} />
              <Text style={s.emptyTitle}>Nenhum treino registrado</Text>
              <Text style={s.emptyText}>Faça check-in em um treino para começar seu histórico</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },

  header:      { paddingHorizontal: spacing['5'], paddingTop: spacing['5'], paddingBottom: spacing['3'] },
  headerTitle: { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  headerSub:   { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing['1'] },

  list: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  card:       { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['4'], gap: spacing['3'], ...shadows.sm },

  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },
  cardIconBox:    { width: 40, height: 40, borderRadius: radii.lg, backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
  cardHeaderInfo: { flex: 1 },
  cardWorkoutName:{ fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  cardDate:       { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${colors.success}15`, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 3 },
  completedBadgeText: { fontFamily: typography.family.medium, fontSize: 10, color: colors.success },

  photosRow: { flexDirection: 'row', gap: spacing['2'] },
  photoBox:  { flex: 1, borderRadius: radii.lg, overflow: 'hidden' },
  photo:     { width: '100%', height: 140, resizeMode: 'cover' },
  photoLabel:{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 4, alignItems: 'center' },
  photoLabelText: { fontFamily: typography.family.medium, fontSize: 11, color: colors.white },

  caption: { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },

  notesBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['2'], backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'] },
  notesText: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, flex: 1 },

  statsRow:    { flexDirection: 'row', backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'] },
  statItem:    { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 2 },
  statValue:   { fontFamily: typography.family.bold, fontSize: typography.size.sm, color: colors.textPrimary },
  statLabel:   { fontFamily: typography.family.regular, fontSize: 10, color: colors.textSecondary },

  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing['1'] },
  locationText: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, flex: 1 },

  empty:      { alignItems: 'center', marginTop: spacing['12'], gap: spacing['3'], paddingHorizontal: spacing['8'] },
  emptyTitle: { fontFamily: typography.family.semiBold, fontSize: typography.size.lg, color: colors.textSecondary },
  emptyText:  { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textDisabled, textAlign: 'center' },
})
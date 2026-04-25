import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { statsService } from '../../services/stats.service'
import type { WorkoutStats } from '../../services/stats.service'
import { colors, typography, spacing, radii, shadows } from '../../theme'

// ─── Helpers ─────────────────────────────────
const fmtDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const calcIMC = (weight: string | null, height: string | null) => {
  if (!weight || !height) return null
  const w = parseFloat(weight)
  const h = parseFloat(height) / 100
  if (!w || !h) return null
  return (w / (h * h)).toFixed(1)
}

const imcLabel = (v: number) => {
  if (v < 18.5) return { label: 'Abaixo do peso', color: '#F59E0B' }
  if (v < 24.9) return { label: 'Peso normal',    color: colors.success }
  if (v < 29.9) return { label: 'Sobrepeso',      color: '#F59E0B' }
  return             { label: 'Obesidade',         color: colors.error }
}

// ─── Períodos ─────────────────────────────────
const PERIODS = [
  { label: '7 dias',   days: 7   },
  { label: '30 dias',  days: 30  },
  { label: '90 dias',  days: 90  },
  { label: 'Tudo',     days: 0   },
]

const getPeriodDates = (days: number) => {
  if (days === 0) return { from: undefined, to: undefined }
  const to   = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)
  return {
    from: from.toISOString().split('T')[0],
    to:   to.toISOString().split('T')[0],
  }
}

// ─── Mini bar chart puro (sem lib) ───────────
function BarChart({
  data, color, height = 120,
}: {
  data: { label: string; value: number }[]
  color: string
  height?: number
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 4 }}>
      {data.map((d, i) => {
        const barH = max > 0 ? Math.max((d.value / max) * (height - 24), d.value > 0 ? 4 : 0) : 0
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height }}>
            {d.value > 0 && (
              <Text style={{ fontFamily: typography.family.bold, fontSize: 9, color, marginBottom: 2 }}>
                {d.value}
              </Text>
            )}
            <View style={{
              width: '80%',
              height: barH,
              backgroundColor: d.value > 0 ? color : colors.surfaceHigh,
              borderRadius: 4,
              minHeight: 3,
            }} />
            <Text style={{ fontFamily: typography.family.regular, fontSize: 9, color: colors.textSecondary, marginTop: 4 }}>
              {d.label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

// ─── Mini line chart puro ────────────────────
function LineChart({
  data, color, height = 80,
}: {
  data: { label: string; value: number }[]
  color: string
  height?: number
}) {
  const max    = Math.max(...data.map(d => d.value), 1)
  const min    = Math.min(...data.map(d => d.value))
  const range  = max - min || 1
  const chartH = height - 28

  return (
    <View style={{ height }}>
      {/* Linha */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartH, position: 'relative' }}>
        {data.map((d, i) => {
          const y = chartH - ((d.value - min) / range) * chartH
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', position: 'relative' }}>
              {/* Ponto */}
              <View style={{
                position:        'absolute',
                top:             y - 4,
                width:           8,
                height:          8,
                borderRadius:    4,
                backgroundColor: color,
                borderWidth:     2,
                borderColor:     colors.surface,
              }} />
              {/* Valor */}
              {i === data.length - 1 || i === 0 ? (
                <Text style={{
                  position:   'absolute',
                  top:        y - 18,
                  fontFamily: typography.family.bold,
                  fontSize:   9,
                  color,
                }}>
                  {d.value}
                </Text>
              ) : null}
            </View>
          )
        })}
      </View>
      {/* Labels */}
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {data.map((d, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontFamily: typography.family.regular, fontSize: 9, color: colors.textSecondary }}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  )
}

// ─── Componente principal ─────────────────────
export function StudentDashboardScreen() {
  const [stats,         setStats]         = useState<WorkoutStats | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [selectedPeriod,setSelectedPeriod]= useState(1) // 30 dias default

  const load = useCallback(async (periodIdx: number) => {
    setLoading(true)
    try {
      const { from, to } = getPeriodDates(PERIODS[periodIdx].days)
      const data = await statsService.getWorkoutStats(from, to)
      setStats(data)
    } catch {
      // silencia
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load(selectedPeriod) }, [selectedPeriod]))

  const handlePeriod = (idx: number) => {
    setSelectedPeriod(idx)
  }

  const imc    = stats ? calcIMC(stats.bodyMetrics.weight, stats.bodyMetrics.height) : null
  const imcVal = imc ? parseFloat(imc) : null
  const imcInfo = imcVal ? imcLabel(imcVal) : null

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ─── Header ─── */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Relatórios</Text>
          <Text style={s.headerSub}>Acompanhe sua evolução</Text>
        </View>

        {/* ─── Filtro de período ─── */}
        <View style={s.periodRow}>
          {PERIODS.map((p, i) => (
            <TouchableOpacity
              key={i}
              style={[s.periodChip, selectedPeriod === i && s.periodChipActive]}
              onPress={() => handlePeriod(i)}
              activeOpacity={0.8}
            >
              <Text style={[s.periodChipText, selectedPeriod === i && s.periodChipTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['10'] }} />
        ) : !stats ? (
          <View style={s.empty}>
            <Ionicons name="stats-chart-outline" size={48} color={colors.textDisabled} />
            <Text style={s.emptyText}>Nenhum dado disponível</Text>
          </View>
        ) : (
          <>
            {/* ─── Cards de resumo ─── */}
            <View style={s.summaryGrid}>
              <View style={[s.summaryCard, { borderTopColor: colors.primary }]}>
                <Ionicons name="checkmark-done-circle-outline" size={22} color={colors.primary} />
                <Text style={s.summaryValue}>{stats.totalSessions}</Text>
                <Text style={s.summaryLabel}>Treinos{'\n'}realizados</Text>
              </View>

              <View style={[s.summaryCard, { borderTopColor: colors.success }]}>
                <Ionicons name="time-outline" size={22} color={colors.success} />
                <Text style={s.summaryValue}>{stats.avgDuration > 0 ? fmtDuration(stats.avgDuration) : '—'}</Text>
                <Text style={s.summaryLabel}>Tempo{'\n'}médio</Text>
              </View>

              <View style={[s.summaryCard, { borderTopColor: '#F59E0B' }]}>
                <Ionicons name="flame-outline" size={22} color="#F59E0B" />
                <Text style={s.summaryValue}>{stats.currentStreak}</Text>
                <Text style={s.summaryLabel}>Streak{'\n'}atual</Text>
              </View>

              <View style={[s.summaryCard, { borderTopColor: colors.info }]}>
                <Ionicons name="trophy-outline" size={22} color={colors.info} />
                <Text style={s.summaryValue}>{stats.maxStreak}</Text>
                <Text style={s.summaryLabel}>Melhor{'\n'}streak</Text>
              </View>
            </View>

            {/* ─── Total de horas ─── */}
            {stats.totalDuration > 0 && (
              <View style={s.totalCard}>
                <View style={s.totalCardLeft}>
                  <Ionicons name="stopwatch-outline" size={28} color={colors.primary} />
                  <View>
                    <Text style={s.totalCardValue}>{fmtDuration(stats.totalDuration)}</Text>
                    <Text style={s.totalCardLabel}>Total de tempo treinando</Text>
                  </View>
                </View>
                <View style={s.totalCardRight}>
                  <Text style={s.totalCardMax}>Máx: {fmtDuration(stats.maxDuration)}</Text>
                </View>
              </View>
            )}

            {/* ─── Treinos por dia da semana ─── */}
            {stats.weekdayData.some(d => d.count > 0) && (
              <View style={s.chartCard}>
                <View style={s.chartHeader}>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  <Text style={s.chartTitle}>Treinos por dia da semana</Text>
                </View>
                <BarChart
                  data={stats.weekdayData.map(d => ({ label: d.name, value: d.count }))}
                  color={colors.primary}
                  height={130}
                />
              </View>
            )}

            {/* ─── Frequência semanal ─── */}
            {stats.weeklyData.length > 1 && (
              <View style={s.chartCard}>
                <View style={s.chartHeader}>
                  <Ionicons name="trending-up-outline" size={18} color={colors.success} />
                  <Text style={s.chartTitle}>Frequência semanal</Text>
                </View>
                <LineChart
                  data={stats.weeklyData.map(d => ({ label: d.week, value: d.count }))}
                  color={colors.success}
                  height={100}
                />
              </View>
            )}

            {/* ─── Métricas corporais ─── */}
            <View style={s.chartCard}>
              <View style={s.chartHeader}>
                <Ionicons name="body-outline" size={18} color="#F59E0B" />
                <Text style={s.chartTitle}>Métricas corporais</Text>
              </View>

              <View style={s.bodyMetricsRow}>
                <View style={s.bodyMetricItem}>
                  <Text style={s.bodyMetricValue}>
                    {stats.bodyMetrics.weight ? `${stats.bodyMetrics.weight} kg` : '—'}
                  </Text>
                  <Text style={s.bodyMetricLabel}>Peso</Text>
                </View>
                <View style={s.bodyMetricDivider} />
                <View style={s.bodyMetricItem}>
                  <Text style={s.bodyMetricValue}>
                    {stats.bodyMetrics.height ? `${stats.bodyMetrics.height} cm` : '—'}
                  </Text>
                  <Text style={s.bodyMetricLabel}>Altura</Text>
                </View>
                <View style={s.bodyMetricDivider} />
                <View style={s.bodyMetricItem}>
                  <Text style={[s.bodyMetricValue, imcInfo ? { color: imcInfo.color } : {}]}>
                    {imc ?? '—'}
                  </Text>
                  <Text style={s.bodyMetricLabel}>IMC</Text>
                </View>
              </View>

              {imcInfo && (
                <>
                  {/* Barra de IMC visual */}
                  <View style={s.imcBarContainer}>
                    <View style={s.imcBar}>
                      <View style={[s.imcBarSegment, { backgroundColor: '#F59E0B', flex: 1 }]} />
                      <View style={[s.imcBarSegment, { backgroundColor: colors.success, flex: 1.3 }]} />
                      <View style={[s.imcBarSegment, { backgroundColor: '#F59E0B', flex: 1 }]} />
                      <View style={[s.imcBarSegment, { backgroundColor: colors.error, flex: 1 }]} />
                    </View>
                    {/* Indicador */}
                    {imcVal && (
                      <View style={[s.imcIndicator, {
                        left: `${Math.min(Math.max(((imcVal - 15) / 25) * 100, 2), 96)}%` as any,
                      }]}>
                        <View style={[s.imcIndicatorDot, { backgroundColor: imcInfo.color }]} />
                      </View>
                    )}
                  </View>
                  <View style={s.imcLabelsRow}>
                    <Text style={s.imcBarLabel}>15</Text>
                    <Text style={s.imcBarLabel}>18.5</Text>
                    <Text style={s.imcBarLabel}>25</Text>
                    <Text style={s.imcBarLabel}>30</Text>
                    <Text style={s.imcBarLabel}>40</Text>
                  </View>
                  <View style={[s.imcClassBadge, { backgroundColor: `${imcInfo.color}20` }]}>
                    <Text style={[s.imcClassText, { color: imcInfo.color }]}>{imcInfo.label}</Text>
                  </View>
                </>
              )}
            </View>

            {/* ─── Streak visual ─── */}
            {stats.currentStreak > 0 && (
              <View style={[s.chartCard, s.streakCard]}>
                <View style={s.streakHeader}>
                  <Text style={s.streakEmoji}>🔥</Text>
                  <View>
                    <Text style={s.streakValue}>{stats.currentStreak} dia{stats.currentStreak !== 1 ? 's' : ''} seguidos</Text>
                    <Text style={s.streakSub}>Continue assim! Seu recorde é de {stats.maxStreak} dias.</Text>
                  </View>
                </View>
                {/* Barra de progresso em relação ao recorde */}
                <View style={s.streakBarBg}>
                  <View style={[s.streakBarFill, {
                    width: `${Math.min((stats.currentStreak / Math.max(stats.maxStreak, 1)) * 100, 100)}%` as any,
                  }]} />
                </View>
                <Text style={s.streakBarLabel}>
                  {stats.currentStreak >= stats.maxStreak
                    ? '🏆 Novo recorde!'
                    : `${stats.maxStreak - stats.currentStreak} dia(s) para bater seu recorde`}
                </Text>
              </View>
            )}

            {/* ─── Empty state quando sem sessões ─── */}
            {stats.totalSessions === 0 && (
              <View style={s.emptyStats}>
                <Ionicons name="barbell-outline" size={40} color={colors.textDisabled} />
                <Text style={s.emptyStatsTitle}>Nenhum treino no período</Text>
                <Text style={s.emptyStatsText}>Faça check-in em um treino para ver seus relatórios aqui</Text>
              </View>
            )}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  header:      { paddingTop: spacing['5'], paddingBottom: spacing['2'] },
  headerTitle: { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  headerSub:   { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing['1'] },

  periodRow:           { flexDirection: 'row', gap: spacing['2'], marginVertical: spacing['4'] },
  periodChip:          { flex: 1, paddingVertical: spacing['2'], borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
  periodChipActive:    { backgroundColor: colors.primary, borderColor: colors.primary },
  periodChipText:      { fontFamily: typography.family.medium, fontSize: typography.size.xs, color: colors.textSecondary },
  periodChipTextActive:{ color: colors.white },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['3'], marginBottom: spacing['3'] },
  summaryCard: { width: '47%', backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], alignItems: 'center', gap: spacing['2'], borderTopWidth: 3, ...shadows.sm },
  summaryValue:{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  summaryLabel:{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, textAlign: 'center' },

  totalCard:      { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing['3'], ...shadows.sm },
  totalCardLeft:  { flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },
  totalCardValue: { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.textPrimary },
  totalCardLabel: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  totalCardRight: {},
  totalCardMax:   { fontFamily: typography.family.medium, fontSize: typography.size.xs, color: colors.textSecondary },

  chartCard:   { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], gap: spacing['3'], ...shadows.sm },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  chartTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.textPrimary },

  bodyMetricsRow:    { flexDirection: 'row', backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'] },
  bodyMetricItem:    { flex: 1, alignItems: 'center', gap: 2 },
  bodyMetricDivider: { width: 1, backgroundColor: colors.border },
  bodyMetricValue:   { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.textPrimary },
  bodyMetricLabel:   { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },

  imcBarContainer:  { marginTop: spacing['2'], position: 'relative' },
  imcBar:           { flexDirection: 'row', height: 10, borderRadius: radii.full, overflow: 'hidden', gap: 2 },
  imcBarSegment:    { height: '100%', borderRadius: 2 },
  imcIndicator:     { position: 'absolute', top: -3, marginLeft: -6 },
  imcIndicatorDot:  { width: 16, height: 16, borderRadius: 8, borderWidth: 2.5, borderColor: colors.surface },
  imcLabelsRow:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  imcBarLabel:      { fontFamily: typography.family.regular, fontSize: 9, color: colors.textSecondary },
  imcClassBadge:    { alignSelf: 'center', borderRadius: radii.full, paddingHorizontal: spacing['3'], paddingVertical: spacing['1'], marginTop: spacing['2'] },
  imcClassText:     { fontFamily: typography.family.semiBold, fontSize: typography.size.xs },

  streakCard:   { borderWidth: 1.5, borderColor: `#F59E0B30`, gap: spacing['3'] },
  streakHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },
  streakEmoji:  { fontSize: 32 },
  streakValue:  { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.textPrimary },
  streakSub:    { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  streakBarBg:  { height: 8, backgroundColor: colors.surfaceHigh, borderRadius: radii.full, overflow: 'hidden' },
  streakBarFill:{ height: '100%', backgroundColor: '#F59E0B', borderRadius: radii.full },
  streakBarLabel:{ fontFamily: typography.family.medium, fontSize: typography.size.xs, color: colors.textSecondary, textAlign: 'center' },

  empty:     { alignItems: 'center', marginTop: spacing['10'], gap: spacing['3'] },
  emptyText: { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textDisabled },

  emptyStats:      { alignItems: 'center', gap: spacing['3'], paddingVertical: spacing['8'], backgroundColor: colors.surface, borderRadius: radii.xl, ...shadows.sm },
  emptyStatsTitle: { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textSecondary },
  emptyStatsText:  { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textDisabled, textAlign: 'center', paddingHorizontal: spacing['4'] },
})
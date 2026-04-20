import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { workoutService } from '../../services/workout.service'
import type { Workout } from '../../services/workout.service'
import { colors, typography, spacing, radii, shadows } from '../../theme'

const DAYS = [
  { key: 'monday',    label: 'Segunda'   },
  { key: 'tuesday',   label: 'Terça'     },
  { key: 'wednesday', label: 'Quarta'    },
  { key: 'thursday',  label: 'Quinta'    },
  { key: 'friday',    label: 'Sexta'     },
  { key: 'saturday',  label: 'Sábado'    },
  { key: 'sunday',    label: 'Domingo'   },
]

const DAY_SHORT: Record<string, string> = {
  monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua',
  thursday: 'Qui', friday: 'Sex', saturday: 'Sáb', sunday: 'Dom',
}

// Dia atual
const TODAY_KEY = (() => {
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  return days[new Date().getDay()]
})()

const ALL_FILTER = { key: 'all', label: 'Todos' }

export function StudentWorkoutsScreen() {
  const [workouts,   setWorkouts]   = useState<Workout[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dayFilter,  setDayFilter]  = useState('all')
  const [expanded,   setExpanded]   = useState<Set<string>>(new Set())

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await workoutService.myWorkouts()
      setWorkouts(data)
    } catch {
      // silencia
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => { load() }, [load]),
  )

  const filtered = dayFilter === 'all'
    ? workouts
    : workouts.filter(w => w.days.includes(dayFilter))

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Só mostra dias que têm treino
  const daysWithWorkout = DAYS.filter(d => workouts.some(w => w.days.includes(d.key)))

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Meus Treinos</Text>
        <Text style={s.headerSub}>
          {workouts.length} treino{workouts.length !== 1 ? 's' : ''} criado{workouts.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filtro por dia */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filtersRow}
      >
        {/* Chip Todos */}
        <TouchableOpacity
          style={[s.filterChip, dayFilter === 'all' && s.filterChipActive]}
          onPress={() => setDayFilter('all')}
          activeOpacity={0.8}
        >
          <Text style={[s.filterChipText, dayFilter === 'all' && s.filterChipTextActive]}>
            Todos ({workouts.length})
          </Text>
        </TouchableOpacity>

        {/* Chip "Hoje" */}
        {workouts.some(w => w.days.includes(TODAY_KEY)) && (
          <TouchableOpacity
            style={[s.filterChip, s.filterChipToday, dayFilter === TODAY_KEY && s.filterChipActive]}
            onPress={() => setDayFilter(TODAY_KEY)}
            activeOpacity={0.8}
          >
            <Ionicons name="today-outline" size={13} color={dayFilter === TODAY_KEY ? colors.white : colors.primary} />
            <Text style={[s.filterChipText, { color: dayFilter === TODAY_KEY ? colors.white : colors.primary }]}>
              Hoje
            </Text>
          </TouchableOpacity>
        )}

        {/* Chips por dia */}
        {daysWithWorkout.map(d => (
          <TouchableOpacity
            key={d.key}
            style={[s.filterChip, dayFilter === d.key && s.filterChipActive]}
            onPress={() => setDayFilter(d.key)}
            activeOpacity={0.8}
          >
            <Text style={[s.filterChipText, dayFilter === d.key && s.filterChipTextActive]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['10'] }} />
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true) }}
              tintColor={colors.primary}
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="barbell-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyText}>
                {dayFilter === 'all'
                  ? 'Nenhum treino criado ainda'
                  : `Nenhum treino para ${DAYS.find(d => d.key === dayFilter)?.label ?? dayFilter}`}
              </Text>
            </View>
          ) : (
            filtered.map(workout => {
              const isExpanded = expanded.has(workout.id)
              const isToday    = workout.days.includes(TODAY_KEY)

              return (
                <View key={workout.id} style={[s.workoutCard, isToday && s.workoutCardToday]}>
                  {/* Badge "Hoje" */}
                  {isToday && (
                    <View style={s.todayBadge}>
                      <Text style={s.todayBadgeText}>Hoje</Text>
                    </View>
                  )}

                  {/* Header do treino */}
                  <TouchableOpacity
                    style={s.workoutHeader}
                    onPress={() => toggleExpand(workout.id)}
                    activeOpacity={0.8}
                  >
                    <View style={s.workoutIconBox}>
                      <Ionicons name="barbell" size={20} color={colors.primary} />
                    </View>
                    <View style={s.workoutInfo}>
                      <Text style={s.workoutName}>{workout.name}</Text>
                      {/* Dias em chips */}
                      <View style={s.daysRow}>
                        {workout.days.map(d => (
                          <View key={d} style={[s.dayBadge, d === TODAY_KEY && s.dayBadgeToday]}>
                            <Text style={[s.dayBadgeText, d === TODAY_KEY && s.dayBadgeTextToday]}>
                              {DAY_SHORT[d] ?? d}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {/* Notas */}
                  {isExpanded && workout.notes && (
                    <View style={s.notesBox}>
                      <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
                      <Text style={s.notesText}>{workout.notes}</Text>
                    </View>
                  )}

                  {/* Exercícios (expandido) */}
                  {isExpanded && (
                    <View style={s.exerciseList}>
                      <Text style={s.exerciseListTitle}>
                        {workout.exercises.length} exercício{workout.exercises.length !== 1 ? 's' : ''}
                      </Text>
                      {workout.exercises.map((ex, i) => (
                        <View
                          key={ex.id ?? i}
                          style={[s.exerciseRow, i < workout.exercises.length - 1 && s.exerciseDivider]}
                        >
                          <View style={s.exerciseIndex}>
                            <Text style={s.exerciseIndexText}>{i + 1}</Text>
                          </View>
                          <View style={s.exerciseInfo}>
                            <Text style={s.exerciseName}>{ex.name}</Text>
                            <Text style={s.exerciseSets}>{ex.sets} séries × {ex.reps} reps</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Resumo quando fechado */}
                  {!isExpanded && (
                    <Text style={s.exerciseSummary}>
                      {workout.exercises.length} exercício{workout.exercises.length !== 1 ? 's' : ''}
                      {workout.notes ? ' · Com observações' : ''}
                    </Text>
                  )}
                </View>
              )
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },

  header:      { paddingHorizontal: spacing['5'], paddingTop: spacing['5'], paddingBottom: spacing['2'] },
  headerTitle: { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  headerSub:   { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing['1'] },

  // Filtros
  filtersRow:           { paddingHorizontal: spacing['5'], paddingVertical: spacing['3'], gap: spacing['2'] },
  filterChip:           { paddingHorizontal: spacing['3'], paddingVertical: spacing['2'], borderRadius: radii.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 4 },
  filterChipToday:      { borderColor: colors.primary },
  filterChipActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText:       { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  filterChipTextActive: { color: colors.white },

  list: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  empty:     { alignItems: 'center', marginTop: spacing['10'], gap: spacing['3'] },
  emptyText: { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textDisabled, textAlign: 'center' },

  // Workout card
  workoutCard:      { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], gap: spacing['2'], ...shadows.sm },
  workoutCardToday: { borderWidth: 1.5, borderColor: `${colors.primary}40` },

  todayBadge:     { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 2, marginBottom: spacing['1'] },
  todayBadgeText: { fontFamily: typography.family.bold, fontSize: 10, color: colors.white },

  workoutHeader:  { flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },
  workoutIconBox: { width: 40, height: 40, borderRadius: radii.lg, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  workoutInfo:    { flex: 1 },
  workoutName:    { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },

  daysRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['1'], marginTop: spacing['1'] },
  dayBadge:          { backgroundColor: colors.surfaceHigh, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 2 },
  dayBadgeToday:     { backgroundColor: `${colors.primary}20` },
  dayBadgeText:      { fontFamily: typography.family.regular, fontSize: 10, color: colors.textSecondary },
  dayBadgeTextToday: { color: colors.primary, fontFamily: typography.family.bold },

  exerciseSummary: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textDisabled, marginTop: spacing['1'] },

  notesBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['2'], backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'] },
  notesText: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, flex: 1 },

  exerciseList:      { gap: 0, marginTop: spacing['2'] },
  exerciseListTitle: { fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.textSecondary, marginBottom: spacing['2'] },
  exerciseRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing['3'], paddingVertical: spacing['2'] },
  exerciseDivider:   { borderBottomWidth: 1, borderBottomColor: colors.divider },
  exerciseIndex:     { width: 24, height: 24, borderRadius: radii.full, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  exerciseIndexText: { fontFamily: typography.family.bold, fontSize: typography.size.xs, color: colors.primary },
  exerciseInfo:      { flex: 1 },
  exerciseName:      { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textPrimary },
  exerciseSets:      { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
})
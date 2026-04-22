import React, { useState, useCallback, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { workoutService } from '../../services/workout.service'
import type { Workout } from '../../services/workout.service'
import { useAuth } from '../../contexts/AuthContext'
import { WorkoutFormModal }    from '../../components/ui/WorkoutFormModal'
import { WorkoutSessionModal } from '../../components/ui/WorkoutSessionModal'
import type { WorkoutPayload } from '../../components/ui/WorkoutFormModal'
import { colors, typography, spacing, radii, shadows } from '../../theme'

const DAYS = [
  { key: 'monday',    label: 'Seg' },
  { key: 'tuesday',   label: 'Ter' },
  { key: 'wednesday', label: 'Qua' },
  { key: 'thursday',  label: 'Qui' },
  { key: 'friday',    label: 'Sex' },
  { key: 'saturday',  label: 'Sáb' },
  { key: 'sunday',    label: 'Dom' },
]

const DAY_SHORT: Record<string, string> = {
  monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua',
  thursday: 'Qui', friday: 'Sex', saturday: 'Sáb', sunday: 'Dom',
}

const TODAY_KEY = (() => {
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  return days[new Date().getDay()]
})()

export function StudentWorkoutsScreen() {
  const { user }   = useAuth()
  const navigation = useNavigation<any>()
  const route      = useRoute<any>()

  const [workouts,       setWorkouts]       = useState<Workout[]>([])
  const [loading,        setLoading]        = useState(true)
  const [refreshing,     setRefreshing]     = useState(false)
  const [dayFilter,      setDayFilter]      = useState('all')
  const [expanded,       setExpanded]       = useState<Set<string>>(new Set())
  const [workoutModal,   setWorkoutModal]   = useState(false)
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null)

  // Session modal
  const [sessionModal,   setSessionModal]   = useState(false)
  const [sessionWorkout, setSessionWorkout] = useState<{ id: string; name: string } | null>(null)

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

  useFocusEffect(useCallback(() => { load() }, [load]))

  useEffect(() => {
    if (route.params?.openCreate) {
      setEditingWorkout(null)
      setWorkoutModal(true)
      navigation.setParams({ openCreate: false })
    }
  }, [route.params?.openCreate])

  const filtered = dayFilter === 'all'
    ? workouts
    : workouts.filter(w => w.days.includes(dayFilter))

  const toggleExpand = (id: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const openCreateModal = () => { setEditingWorkout(null); setWorkoutModal(true) }
  const openEditModal   = (workout: Workout) => { setEditingWorkout(workout); setWorkoutModal(true) }

  const handleSave = async (payload: WorkoutPayload) => {
    if (editingWorkout) {
      await workoutService.update(editingWorkout.id, payload)
      Alert.alert('Sucesso', 'Treino atualizado!')
    } else {
      await workoutService.create({ ...payload, studentId: user!.id })
      Alert.alert('Sucesso', 'Treino criado!')
    }
    setWorkoutModal(false)
    load(true)
  }

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Excluir treino', `Deseja excluir "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try { await workoutService.delete(id); load(true) }
          catch { Alert.alert('Erro', 'Não foi possível excluir.') }
        },
      },
    ])
  }

  const handleToggleActive = (workout: Workout) => {
    Alert.alert(
      `${workout.active ? 'Inativar' : 'Ativar'} treino`,
      `Deseja ${workout.active ? 'inativar' : 'ativar'} "${workout.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: workout.active ? 'Inativar' : 'Ativar',
          style: workout.active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              workout.active
                ? await workoutService.deactivateWorkout(workout.id)
                : await workoutService.activateWorkout(workout.id)
              load(true)
            } catch {
              Alert.alert('Erro', 'Não foi possível realizar a ação.')
            }
          },
        },
      ],
    )
  }

  const hasToday = workouts.some(w => w.days.includes(TODAY_KEY))

  const renderExercises = (workout: Workout) => {
    const items    = workout.exercises
    const rendered: React.ReactNode[] = []
    let i = 0

    while (i < items.length) {
      const ex = items[i]

      if (ex.type === 'cardio') {
        rendered.push(
          <View key={`cardio-${ex.id ?? i}`} style={[s.exerciseRow, i < items.length - 1 && s.exerciseDivider]}>
            <View style={s.cardioIcon}><Ionicons name="bicycle" size={14} color={colors.info} /></View>
            <View style={s.exerciseInfo}>
              <Text style={s.exerciseName}>{ex.name}</Text>
              <Text style={s.exerciseSets}>{ex.duration ?? '—'}</Text>
            </View>
          </View>
        )
        i++; continue
      }

      if (ex.groupId) {
        const groupId = ex.groupId
        const groupLabel = ex.groupLabel ?? 'Grupo'
        const groupItems: typeof items = []
        while (i < items.length && items[i].groupId === groupId) { groupItems.push(items[i]); i++ }
        rendered.push(
          <View key={`group-${groupId}`} style={s.groupBlock}>
            <View style={s.groupBlockHeader}>
              <Ionicons name="git-merge-outline" size={12} color={colors.primary} />
              <Text style={s.groupBlockLabel}>{groupLabel}</Text>
            </View>
            {groupItems.map((gEx, gi) => (
              <View key={gEx.id ?? gi} style={[s.exerciseRow, gi < groupItems.length - 1 && s.exerciseDivider]}>
                <View style={s.exerciseIndex}><Text style={s.exerciseIndexText}>{String.fromCharCode(65 + gi)}</Text></View>
                <View style={s.exerciseInfo}>
                  <Text style={s.exerciseName}>{gEx.name}</Text>
                  <Text style={s.exerciseSets}>{gEx.sets} séries × {gEx.reps} reps</Text>
                </View>
              </View>
            ))}
          </View>
        )
        continue
      }

      rendered.push(
        <View key={ex.id ?? i} style={[s.exerciseRow, i < items.length - 1 && s.exerciseDivider]}>
          <View style={s.exerciseIndex}><Text style={s.exerciseIndexText}>{i + 1}</Text></View>
          <View style={s.exerciseInfo}>
            <Text style={s.exerciseName}>{ex.name}</Text>
            <Text style={s.exerciseSets}>{ex.sets} séries × {ex.reps} reps</Text>
          </View>
        </View>
      )
      i++
    }
    return rendered
  }

  return (
    <SafeAreaView style={s.safe}>

      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Meus Treinos</Text>
          <Text style={s.headerSub}>{workouts.length} treino{workouts.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={s.createBtn} onPress={openCreateModal} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={s.createBtnText}>Novo Treino</Text>
        </TouchableOpacity>
      </View>

      <View style={s.filtersRow}>
        <TouchableOpacity style={[s.filterChipAuto, dayFilter === 'all' && s.filterChipActive]} onPress={() => setDayFilter('all')} activeOpacity={0.8}>
          <Text style={[s.filterChipText, dayFilter === 'all' && s.filterChipTextActive]}>Todos ({workouts.length})</Text>
        </TouchableOpacity>
        {hasToday && (
          <TouchableOpacity style={[s.filterChipAuto, s.filterChipToday, dayFilter === TODAY_KEY && s.filterChipActive]} onPress={() => setDayFilter(TODAY_KEY)} activeOpacity={0.8}>
            <Ionicons name="today-outline" size={12} color={dayFilter === TODAY_KEY ? colors.white : colors.primary} />
            <Text style={[s.filterChipText, { color: dayFilter === TODAY_KEY ? colors.white : colors.primary }]}>Hoje</Text>
          </TouchableOpacity>
        )}
        {DAYS.map(d => (
          <TouchableOpacity key={d.key} style={[s.filterChipDay, dayFilter === d.key && s.filterChipActive]} onPress={() => setDayFilter(d.key)} activeOpacity={0.8}>
            <Text style={[s.filterChipText, dayFilter === d.key && s.filterChipTextActive]}>{d.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['10'] }} />
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={colors.primary} />}
        >
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="barbell-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyText}>{dayFilter === 'all' ? 'Nenhum treino ainda' : `Nenhum treino para ${DAY_SHORT[dayFilter] ?? dayFilter}`}</Text>
              {dayFilter === 'all' && (
                <TouchableOpacity style={s.emptyBtn} onPress={openCreateModal} activeOpacity={0.8}>
                  <Text style={s.emptyBtnText}>Criar primeiro treino</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filtered.map(workout => {
              const isExpanded = expanded.has(workout.id)
              const isToday    = workout.days.includes(TODAY_KEY)
              const isOwn      = !workout.personal

              return (
                <View key={workout.id} style={[s.workoutCard, isToday && s.workoutCardToday, !workout.active && s.workoutCardInactive]}>
                  {isToday && workout.active && <View style={s.todayBadge}><Text style={s.todayBadgeText}>Hoje</Text></View>}

                  <View style={s.workoutCardTop}>
                    <TouchableOpacity style={s.workoutHeaderInner} onPress={() => toggleExpand(workout.id)} activeOpacity={0.8}>
                      <View style={[s.workoutIconBox, !workout.active && { opacity: 0.5 }]}>
                        <Ionicons name="barbell" size={20} color={workout.active ? colors.primary : colors.textDisabled} />
                      </View>
                      <View style={s.workoutInfo}>
                        <View style={s.nameRow}>
                          <Text style={[s.workoutName, !workout.active && { color: colors.textSecondary }]} numberOfLines={1}>{workout.name}</Text>
                          {isOwn && (
                            <View style={[s.activeBadge, workout.active ? s.activeBadgeOn : s.activeBadgeOff]}>
                              <Text style={[s.activeBadgeText, workout.active ? s.activeBadgeTextOn : s.activeBadgeTextOff]}>
                                {workout.active ? 'Ativo' : 'Inativo'}
                              </Text>
                            </View>
                          )}
                        </View>
                        {workout.personal ? (
                          <Text style={s.workoutBy}>Criado por: {workout.personal.name}{workout.personal.personalProfile?.cref ? ` · ${workout.personal.personalProfile.cref}` : ''}</Text>
                        ) : (
                          <Text style={[s.workoutBy, { color: workout.active ? colors.primary : colors.textDisabled }]}>Treino próprio</Text>
                        )}
                        <View style={s.daysRow}>
                          {workout.days.map(d => (
                            <View key={d} style={[s.dayBadge, d === TODAY_KEY && workout.active && s.dayBadgeToday]}>
                              <Text style={[s.dayBadgeText, d === TODAY_KEY && workout.active && s.dayBadgeTextToday]}>{DAY_SHORT[d] ?? d}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {/* Ações */}
                    <View style={s.workoutSideActions}>
                      {/* Botão iniciar treino */}
                      {workout.active && (
                        <TouchableOpacity
                          style={s.checkinBtn}
                          onPress={() => { setSessionWorkout({ id: workout.id, name: workout.name }); setSessionModal(true) }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="play-circle-outline" size={22} color={colors.success} />
                        </TouchableOpacity>
                      )}
                      {isOwn && (
                        <>
                          <TouchableOpacity style={s.workoutActionBtn} onPress={() => handleToggleActive(workout)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name={workout.active ? 'pause-circle-outline' : 'play-circle-outline'} size={16} color={workout.active ? colors.warning : colors.success} />
                          </TouchableOpacity>
                          {workout.active && (
                            <TouchableOpacity style={s.workoutActionBtn} onPress={() => openEditModal(workout)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity style={s.workoutActionBtn} onPress={() => handleDelete(workout.id, workout.name)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="trash-outline" size={16} color={colors.error} />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>

                  {isExpanded && workout.notes && (
                    <View style={s.notesBox}>
                      <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
                      <Text style={s.notesText}>{workout.notes}</Text>
                    </View>
                  )}

                  {isExpanded && (
                    <View style={s.exerciseList}>
                      <Text style={s.exerciseListTitle}>{workout.exercises.length} exercício{workout.exercises.length !== 1 ? 's' : ''}</Text>
                      {renderExercises(workout)}
                    </View>
                  )}

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

      <WorkoutFormModal visible={workoutModal} onClose={() => setWorkoutModal(false)} onSave={handleSave} editingWorkout={editingWorkout} />

      {/* Session modal */}
      {sessionWorkout && (
        <WorkoutSessionModal
          visible={sessionModal}
          workoutId={sessionWorkout.id}
          workoutName={sessionWorkout.name}
          onClose={() => setSessionModal(false)}
          onFinished={() => { setSessionModal(false); load(true) }}
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['5'], paddingTop: spacing['5'], paddingBottom: spacing['2'] },
  headerTitle: { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  headerSub:   { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing['1'] },
  createBtn:   { flexDirection: 'row', alignItems: 'center', gap: spacing['1'], backgroundColor: colors.primary, borderRadius: radii.lg, paddingHorizontal: spacing['3'], paddingVertical: spacing['2'] },
  createBtnText:{ fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.white },

  filtersRow:           { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing['5'], paddingVertical: spacing['3'], gap: spacing['2'] },
  filterChipAuto:       { height: 30, paddingHorizontal: spacing['3'], borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  filterChipDay:        { width: 46, height: 30, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  filterChipToday:      { borderColor: colors.primary },
  filterChipActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText:       { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  filterChipTextActive: { color: colors.white },

  list: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  empty:        { alignItems: 'center', marginTop: spacing['10'], gap: spacing['3'] },
  emptyText:    { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textDisabled, textAlign: 'center' },
  emptyBtn:     { paddingHorizontal: spacing['4'], paddingVertical: spacing['2'], borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.primary },
  emptyBtnText: { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.primary },

  workoutCard:         { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], gap: spacing['2'], ...shadows.sm },
  workoutCardToday:    { borderWidth: 1.5, borderColor: `${colors.primary}40` },
  workoutCardInactive: { opacity: 0.6 },
  workoutCardTop:      { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  workoutHeaderInner:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },

  todayBadge:     { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 2, marginBottom: spacing['1'] },
  todayBadgeText: { fontFamily: typography.family.bold, fontSize: 10, color: colors.white },

  workoutIconBox:  { width: 40, height: 40, borderRadius: radii.lg, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  workoutInfo:     { flex: 1 },
  nameRow:         { flexDirection: 'row', alignItems: 'center', gap: spacing['2'], flexWrap: 'wrap' },
  workoutName:     { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  activeBadge:     { borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 2 },
  activeBadgeOn:   { backgroundColor: `${colors.success}20` },
  activeBadgeOff:  { backgroundColor: colors.surfaceHigh },
  activeBadgeText: { fontFamily: typography.family.medium, fontSize: 10 },
  activeBadgeTextOn: { color: colors.success },
  activeBadgeTextOff:{ color: colors.textDisabled },
  workoutBy:       { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },

  // Ações laterais
  workoutSideActions:{ flexDirection: 'column', alignItems: 'center', gap: spacing['1'] },
  checkinBtn:        { width: 34, height: 34, borderRadius: radii.full, backgroundColor: `${colors.success}15`, alignItems: 'center', justifyContent: 'center' },
  workoutActions:    { flexDirection: 'row', gap: spacing['2'] },
  workoutActionBtn:  { width: 30, height: 30, borderRadius: radii.md, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },

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
  cardioIcon:        { width: 24, height: 24, borderRadius: radii.full, backgroundColor: `${colors.info}20`, alignItems: 'center', justifyContent: 'center' },

  groupBlock:       { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, marginBottom: spacing['2'], overflow: 'hidden', borderWidth: 1, borderColor: `${colors.primary}20` },
  groupBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing['3'], paddingVertical: spacing['1'], backgroundColor: `${colors.primary}10` },
  groupBlockLabel:  { fontFamily: typography.family.bold, fontSize: 10, color: colors.primary },
})
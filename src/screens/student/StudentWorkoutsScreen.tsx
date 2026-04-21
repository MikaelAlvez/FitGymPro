import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { workoutService } from '../../services/workout.service'
import type { Workout, Exercise } from '../../services/workout.service'
import { useAuth } from '../../contexts/AuthContext'
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
  const { user } = useAuth()

  const [workouts,   setWorkouts]   = useState<Workout[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dayFilter,  setDayFilter]  = useState('all')
  const [expanded,   setExpanded]   = useState<Set<string>>(new Set())

  // ─── Modal criar/editar ───────────────────
  const [workoutModal,   setWorkoutModal]   = useState(false)
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null)
  const [saving,         setSaving]         = useState(false)
  const [wName,     setWName]     = useState('')
  const [wDays,     setWDays]     = useState<string[]>([])
  const [wNotes,    setWNotes]    = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: '', sets: '', reps: '', order: 0 },
  ])

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

  const toggleDay = (day: string) =>
    setWDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])

  const addExercise = () =>
    setExercises(prev => [...prev, { name: '', sets: '', reps: '', order: prev.length }])

  const removeExercise = (index: number) => {
    if (exercises.length === 1) return
    setExercises(prev => prev.filter((_, i) => i !== index))
  }

  const updateExercise = (index: number, field: keyof Exercise, value: string) =>
    setExercises(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e))

  const resetForm = () => {
    setWName('')
    setWDays([])
    setWNotes('')
    setExercises([{ name: '', sets: '', reps: '', order: 0 }])
    setEditingWorkout(null)
  }

  const openCreateModal = () => {
    resetForm()
    setWorkoutModal(true)
  }

  const openEditModal = (workout: Workout) => {
    setEditingWorkout(workout)
    setWName(workout.name)
    setWDays(workout.days)
    setWNotes(workout.notes ?? '')
    setExercises(
      workout.exercises.length > 0
        ? workout.exercises.map(e => ({ name: e.name, sets: e.sets, reps: e.reps, order: e.order ?? 0 }))
        : [{ name: '', sets: '', reps: '', order: 0 }],
    )
    setWorkoutModal(true)
  }

  const handleSave = async () => {
    if (!wName.trim()) { Alert.alert('Atenção', 'Informe o nome do treino.'); return }
    if (wDays.length === 0) { Alert.alert('Atenção', 'Selecione ao menos um dia.'); return }
    if (exercises.some(e => !e.name.trim() || !e.sets.trim() || !e.reps.trim())) {
      Alert.alert('Atenção', 'Preencha todos os campos dos exercícios.')
      return
    }
    try {
      setSaving(true)
      const payload = {
        name:      wName.trim(),
        days:      wDays,
        notes:     wNotes.trim() || undefined,
        exercises: exercises.map((e, i) => ({ ...e, order: i })),
      }
      if (editingWorkout) {
        await workoutService.update(editingWorkout.id, payload)
        Alert.alert('Sucesso', 'Treino atualizado!')
      } else {
        // Aluno cria para si mesmo — sem studentId
        await workoutService.create({ ...payload, studentId: user!.id })
        Alert.alert('Sucesso', 'Treino criado!')
      }
      setWorkoutModal(false)
      resetForm()
      load(true)
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Excluir treino', `Deseja excluir "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try {
            await workoutService.delete(id)
            load(true)
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir.')
          }
        },
      },
    ])
  }

  const hasToday   = workouts.some(w => w.days.includes(TODAY_KEY))
  const myWorkouts = workouts.filter(w => !w.personal)

  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Meus Treinos</Text>
          <Text style={s.headerSub}>
            {workouts.length} treino{workouts.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {/* Botão criar */}
        <TouchableOpacity style={s.createBtn} onPress={openCreateModal} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={s.createBtnText}>Novo Treino</Text>
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <View style={s.filtersRow}>
        <TouchableOpacity
          style={[s.filterChipAuto, dayFilter === 'all' && s.filterChipActive]}
          onPress={() => setDayFilter('all')}
          activeOpacity={0.8}
        >
          <Text style={[s.filterChipText, dayFilter === 'all' && s.filterChipTextActive]}>
            Todos ({workouts.length})
          </Text>
        </TouchableOpacity>

        {hasToday && (
          <TouchableOpacity
            style={[s.filterChipAuto, s.filterChipToday, dayFilter === TODAY_KEY && s.filterChipActive]}
            onPress={() => setDayFilter(TODAY_KEY)}
            activeOpacity={0.8}
          >
            <Ionicons name="today-outline" size={12} color={dayFilter === TODAY_KEY ? colors.white : colors.primary} />
            <Text style={[s.filterChipText, { color: dayFilter === TODAY_KEY ? colors.white : colors.primary }]}>
              Hoje
            </Text>
          </TouchableOpacity>
        )}

        {DAYS.map(d => (
          <TouchableOpacity
            key={d.key}
            style={[s.filterChipDay, dayFilter === d.key && s.filterChipActive]}
            onPress={() => setDayFilter(d.key)}
            activeOpacity={0.8}
          >
            <Text style={[s.filterChipText, dayFilter === d.key && s.filterChipTextActive]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['10'] }} />
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={colors.primary} />
          }
        >
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="barbell-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyText}>
                {dayFilter === 'all' ? 'Nenhum treino ainda' : `Nenhum treino para ${DAY_SHORT[dayFilter] ?? dayFilter}`}
              </Text>
              {dayFilter === 'all' && (
                <TouchableOpacity style={s.emptyBtn} onPress={openCreateModal} activeOpacity={0.8}>
                  <Text style={s.emptyBtnText}>Criar primeiro treino</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filtered.map(workout => {
              const isExpanded  = expanded.has(workout.id)
              const isToday     = workout.days.includes(TODAY_KEY)
              const isOwn       = !workout.personal  // treino próprio do aluno

              return (
                <View key={workout.id} style={[s.workoutCard, isToday && s.workoutCardToday]}>

                  {isToday && (
                    <View style={s.todayBadge}>
                      <Text style={s.todayBadgeText}>Hoje</Text>
                    </View>
                  )}

                  <TouchableOpacity style={s.workoutHeader} onPress={() => toggleExpand(workout.id)} activeOpacity={0.8}>
                    <View style={s.workoutIconBox}>
                      <Ionicons name="barbell" size={20} color={colors.primary} />
                    </View>
                    <View style={s.workoutInfo}>
                      <Text style={s.workoutName}>{workout.name}</Text>
                      {/* Feito por personal ou próprio */}
                      {workout.personal ? (
                        <Text style={s.workoutBy}>
                          Criado por: {workout.personal.name}{workout.personal.personalProfile?.cref ? ` · ${workout.personal.personalProfile.cref}` : ''}
                        </Text>
                      ) : (
                        <Text style={[s.workoutBy, { color: colors.primary }]}>Treino próprio</Text>
                      )}
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
                    {/* Botões editar/excluir só em treinos próprios */}
                    {isOwn ? (
                      <View style={s.workoutActions}>
                        <TouchableOpacity
                          style={s.workoutActionBtn}
                          onPress={() => openEditModal(workout)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.workoutActionBtn}
                          onPress={() => handleDelete(workout.id, workout.name)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>

                  {isExpanded && workout.notes && (
                    <View style={s.notesBox}>
                      <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
                      <Text style={s.notesText}>{workout.notes}</Text>
                    </View>
                  )}

                  {isExpanded && (
                    <View style={s.exerciseList}>
                      <Text style={s.exerciseListTitle}>
                        {workout.exercises.length} exercício{workout.exercises.length !== 1 ? 's' : ''}
                      </Text>
                      {workout.exercises.map((ex, i) => (
                        <View key={ex.id ?? i} style={[s.exerciseRow, i < workout.exercises.length - 1 && s.exerciseDivider]}>
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

      {/* ── Modal criar/editar treino ── */}
      <Modal visible={workoutModal} transparent animationType="slide" onRequestClose={() => { setWorkoutModal(false); resetForm() }}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => { setWorkoutModal(false); resetForm() }} />
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{editingWorkout ? 'Editar treino' : 'Novo treino'}</Text>
            <TouchableOpacity onPress={() => { setWorkoutModal(false); resetForm() }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.sheetBody} showsVerticalScrollIndicator={false}>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Nome do treino *</Text>
              <TextInput style={s.input} value={wName} onChangeText={setWName} placeholder="Ex: Treino A — Peito" placeholderTextColor={colors.textDisabled} />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Dias da semana *</Text>
              <View style={s.daysSelector}>
                {DAYS.map(d => (
                  <TouchableOpacity
                    key={d.key}
                    style={[s.daySelectorItem, wDays.includes(d.key) && s.daySelectorItemActive]}
                    onPress={() => toggleDay(d.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.daySelectorText, wDays.includes(d.key) && s.daySelectorTextActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Exercícios *</Text>
              {exercises.map((ex, i) => (
                <View key={i} style={s.exerciseForm}>
                  <View style={s.exerciseFormHeader}>
                    <Text style={s.exerciseFormIndex}>#{i + 1}</Text>
                    <TouchableOpacity onPress={() => removeExercise(i)} disabled={exercises.length === 1}>
                      <Ionicons name="remove-circle-outline" size={20} color={exercises.length === 1 ? colors.textDisabled : colors.error} />
                    </TouchableOpacity>
                  </View>
                  <TextInput style={s.input} value={ex.name} onChangeText={v => updateExercise(i, 'name', v)} placeholder="Nome do exercício" placeholderTextColor={colors.textDisabled} />
                  <View style={s.setsRepsRow}>
                    <View style={s.setsRepsField}>
                      <Text style={s.setsRepsLabel}>Séries</Text>
                      <TextInput style={s.inputSmall} value={ex.sets} onChangeText={v => updateExercise(i, 'sets', v)} placeholder="4" placeholderTextColor={colors.textDisabled} keyboardType="numeric" />
                    </View>
                    <View style={s.setsRepsField}>
                      <Text style={s.setsRepsLabel}>Repetições</Text>
                      <TextInput style={s.inputSmall} value={ex.reps} onChangeText={v => updateExercise(i, 'reps', v)} placeholder="12" placeholderTextColor={colors.textDisabled} keyboardType="numeric" />
                    </View>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={s.addExerciseBtn} onPress={addExercise} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={s.addExerciseBtnText}>Adicionar exercício</Text>
              </TouchableOpacity>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Observações (opcional)</Text>
              <TextInput style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]} value={wNotes} onChangeText={setWNotes} placeholder="Ex: Descanso de 60s entre séries..." placeholderTextColor={colors.textDisabled} multiline maxLength={500} />
            </View>

            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
              {saving
                ? <ActivityIndicator color={colors.white} />
                : <Text style={s.saveBtnText}>{editingWorkout ? 'Salvar alterações' : 'Criar treino'}</Text>
              }
            </TouchableOpacity>

          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['5'], paddingTop: spacing['5'], paddingBottom: spacing['2'] },
  headerTitle: { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  headerSub:   { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing['1'] },

  createBtn:     { flexDirection: 'row', alignItems: 'center', gap: spacing['1'], backgroundColor: colors.primary, borderRadius: radii.lg, paddingHorizontal: spacing['3'], paddingVertical: spacing['2'] },
  createBtnText: { fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.white },

  filtersRow:           { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing['5'], paddingVertical: spacing['3'], gap: spacing['2'] },
  filterChipAuto:       { height: 30, paddingHorizontal: spacing['3'], borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  filterChipDay:        { width: 46, height: 30, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  filterChipToday:      { borderColor: colors.primary },
  filterChipActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText:       { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  filterChipTextActive: { color: colors.white },

  list: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  empty:      { alignItems: 'center', marginTop: spacing['10'], gap: spacing['3'] },
  emptyText:  { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textDisabled, textAlign: 'center' },
  emptyBtn:   { paddingHorizontal: spacing['4'], paddingVertical: spacing['2'], borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.primary },
  emptyBtnText:{ fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.primary },

  workoutCard:      { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], gap: spacing['2'], ...shadows.sm },
  workoutCardToday: { borderWidth: 1.5, borderColor: `${colors.primary}40` },

  todayBadge:     { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 2, marginBottom: spacing['1'] },
  todayBadgeText: { fontFamily: typography.family.bold, fontSize: 10, color: colors.white },

  workoutHeader:    { flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },
  workoutIconBox:   { width: 40, height: 40, borderRadius: radii.lg, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  workoutInfo:      { flex: 1 },
  workoutName:      { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  workoutBy:        { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  workoutActions:   { flexDirection: 'row', gap: spacing['2'] },
  workoutActionBtn: { width: 30, height: 30, borderRadius: radii.md, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },

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

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['6'], paddingVertical: spacing['4'], borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  sheetBody:   { padding: spacing['6'], gap: spacing['4'], paddingBottom: spacing['10'] },

  inputGroup:   { gap: spacing['2'] },
  inputLabel:   { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  input:        { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 52, paddingHorizontal: spacing['4'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  inputSmall:   { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 48, paddingHorizontal: spacing['3'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary, textAlign: 'center' },

  daysSelector:          { flexDirection: 'row', gap: spacing['2'], flexWrap: 'wrap' },
  daySelectorItem:       { paddingHorizontal: spacing['3'], paddingVertical: spacing['2'], borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceHigh },
  daySelectorItemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  daySelectorText:       { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  daySelectorTextActive: { color: colors.white },

  exerciseForm:       { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'], gap: spacing['2'], marginBottom: spacing['2'] },
  exerciseFormHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseFormIndex:  { fontFamily: typography.family.bold, fontSize: typography.size.sm, color: colors.primary },
  setsRepsRow:        { flexDirection: 'row', gap: spacing['3'] },
  setsRepsField:      { flex: 1, gap: spacing['1'] },
  setsRepsLabel:      { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },

  addExerciseBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], paddingVertical: spacing['3'], borderWidth: 1.5, borderColor: colors.primary, borderRadius: radii.lg, borderStyle: 'dashed' },
  addExerciseBtnText: { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.primary },

  saveBtn:     { backgroundColor: colors.primary, borderRadius: radii.lg, height: 52, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },
})
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, useNavigation } from '@react-navigation/native'
import Constants from 'expo-constants'
import { workoutService } from '../../services/workout.service'
import type { Workout, Exercise } from '../../services/workout.service'
import { colors, typography, spacing, radii, shadows } from '../../theme'
import { userService } from '../../services/user.service'

const getBaseUrl = () => {
  const host = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants.manifest as any)?.debuggerHost
  if (host) return `http://${host.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}

const DAYS = [
  { key: 'monday',    label: 'Seg' },
  { key: 'tuesday',   label: 'Ter' },
  { key: 'wednesday', label: 'Qua' },
  { key: 'thursday',  label: 'Qui' },
  { key: 'friday',    label: 'Sex' },
  { key: 'saturday',  label: 'Sáb' },
  { key: 'sunday',    label: 'Dom' },
]

const EXPERIENCE_LABEL: Record<string, string> = {
  beginner:     'Iniciante',
  intermediate: 'Intermediário',
  advanced:     'Avançado',
}

// ✅ active adicionado
interface StudentParam {
  id:     string
  name:   string
  avatar: string | null
  active: boolean
  studentProfile: {
    goal:       string
    experience: string
    weight:     string
    height:     string
  } | null
}

export function StudentDetailScreen() {
  const route      = useRoute<any>()
  const navigation = useNavigation<any>()
  const student    = route.params?.student as StudentParam

  const avatarUrl = student.avatar ? `${getBaseUrl()}${student.avatar}` : null
  const initials  = student.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()

  // ✅ Estado local de ativo/inativo
  const [isActive, setIsActive] = useState(student.active)

  const [workouts,        setWorkouts]        = useState<Workout[]>([])
  const [loadingWorkouts, setLoadingWorkouts] = useState(true)
  const [workoutModal,    setWorkoutModal]    = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [editingWorkout,  setEditingWorkout]  = useState<Workout | null>(null)

  const [wName,     setWName]     = useState('')
  const [wDays,     setWDays]     = useState<string[]>([])
  const [wNotes,    setWNotes]    = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: '', sets: '', reps: '', order: 0 },
  ])

  const loadWorkouts = useCallback(async () => {
    try {
      const data = await workoutService.listByStudent(student.id)
      setWorkouts(data)
    } catch {
      // silencia
    } finally {
      setLoadingWorkouts(false)
    }
  }, [student.id])

  useEffect(() => { loadWorkouts() }, [loadWorkouts])

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

  const openCreateModal = () => {
    resetForm()
    setWorkoutModal(true)
  }

  const handleSaveWorkout = async () => {
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
        Alert.alert('Sucesso', 'Treino atualizado com sucesso!')
      } else {
        await workoutService.create({ studentId: student.id, ...payload })
        Alert.alert('Sucesso', 'Treino criado com sucesso!')
      }
      setWorkoutModal(false)
      resetForm()
      loadWorkouts()
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível salvar o treino.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteWorkout = (id: string, name: string) => {
    Alert.alert('Excluir treino', `Deseja excluir "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try {
            await workoutService.delete(id)
            loadWorkouts()
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir.')
          }
        },
      },
    ])
  }

  // ✅ Toggle inativar/reativar
  const handleToggleActive = () => {
    const actionTitle = isActive ? 'Inativar aluno' : 'Reativar aluno'
    const actionMsg   = isActive
      ? `Deseja inativar ${student.name}? Ele deixará de aparecer na lista de ativos, mas seus dados serão mantidos.`
      : `Deseja reativar ${student.name}?`
    const actionBtn   = isActive ? 'Inativar' : 'Reativar'
    const actionStyle = isActive ? 'destructive' : 'default'

    Alert.alert(actionTitle, actionMsg, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text:  actionBtn,
        style: actionStyle as any,
        onPress: async () => {
          try {
            if (isActive) {
              await userService.deactivateStudent(student.id)
              setIsActive(false)
              Alert.alert('Pronto', `${student.name} foi inativado.`)
            } else {
              await userService.activateStudent(student.id)
              setIsActive(true)
              Alert.alert('Pronto', `${student.name} foi reativado.`)
            }
          } catch (err: any) {
            Alert.alert('Erro', err?.message ?? 'Não foi possível realizar a ação.')
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          {/* ✅ Título + badge de status */}
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Perfil do Aluno</Text>
            <View style={[s.statusBadge, isActive ? s.statusActive : s.statusInactive]}>
              <View style={[s.statusDot, isActive ? s.statusDotActive : s.statusDotInactive]} />
              <Text style={[s.statusText, isActive ? s.statusTextActive : s.statusTextInactive]}>
                {isActive ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
          </View>

          {/* ✅ Botão muda ícone/cor conforme status */}
          <TouchableOpacity
            style={[s.toggleBtn, isActive ? s.toggleBtnDeactivate : s.toggleBtnActivate]}
            onPress={handleToggleActive}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isActive ? 'person-remove-outline' : 'person-add-outline'}
              size={20}
              color={isActive ? colors.error : colors.success}
            />
          </TouchableOpacity>
        </View>

        {/* ── Card do aluno ── */}
        <View style={s.studentCard}>
          {avatarUrl
            ? <Image source={{ uri: avatarUrl }} style={s.avatar} />
            : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarInitial}>{initials}</Text>
              </View>
            )
          }
          <Text style={s.studentName}>{student.name}</Text>

          {student.studentProfile && (
            <View style={s.metricsRow}>
              <View style={s.metricItem}>
                <Text style={s.metricValue}>{student.studentProfile.weight ? `${student.studentProfile.weight} kg` : '—'}</Text>
                <Text style={s.metricLabel}>Peso</Text>
              </View>
              <View style={s.metricDivider} />
              <View style={s.metricItem}>
                <Text style={s.metricValue}>{student.studentProfile.height ? `${student.studentProfile.height} cm` : '—'}</Text>
                <Text style={s.metricLabel}>Altura</Text>
              </View>
              <View style={s.metricDivider} />
              <View style={s.metricItem}>
                <Text style={s.metricValue} numberOfLines={1}>{student.studentProfile.goal || '—'}</Text>
                <Text style={s.metricLabel}>Objetivo</Text>
              </View>
              <View style={s.metricDivider} />
              <View style={s.metricItem}>
                <Text style={s.metricValue}>
                  {student.studentProfile.experience
                    ? EXPERIENCE_LABEL[student.studentProfile.experience] ?? student.studentProfile.experience
                    : '—'}
                </Text>
                <Text style={s.metricLabel}>Nível</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Treinos ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Treinos</Text>
          <TouchableOpacity style={s.addBtn} onPress={openCreateModal} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={s.addBtnText}>Novo treino</Text>
          </TouchableOpacity>
        </View>

        {loadingWorkouts ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing['6'] }} />
        ) : workouts.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="barbell-outline" size={40} color={colors.textDisabled} />
            <Text style={s.emptyText}>Nenhum treino criado ainda</Text>
          </View>
        ) : (
          workouts.map(workout => (
            <View key={workout.id} style={s.workoutCard}>
              <View style={s.workoutHeader}>
                <View style={s.workoutIconBox}>
                  <Ionicons name="barbell" size={20} color={colors.primary} />
                </View>
                <View style={s.workoutInfo}>
                  <Text style={s.workoutName}>{workout.name}</Text>
                  <View style={s.daysRow}>
                    {DAYS.filter(d => workout.days.includes(d.key)).map(d => (
                      <View key={d.key} style={s.dayBadge}>
                        <Text style={s.dayBadgeText}>{d.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={s.workoutActions}>
                  <TouchableOpacity
                    onPress={() => openEditModal(workout)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={s.workoutActionBtn}
                  >
                    <Ionicons name="pencil-outline" size={17} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteWorkout(workout.id, workout.name)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={s.workoutActionBtn}
                  >
                    <Ionicons name="trash-outline" size={17} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>

              {workout.notes && (
                <View style={s.notesBox}>
                  <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
                  <Text style={s.notesText}>{workout.notes}</Text>
                </View>
              )}

              {workout.exercises.map((ex, i) => (
                <View key={ex.id ?? i} style={[s.exerciseRow, i < workout.exercises.length - 1 && s.exerciseDivider]}>
                  <View style={s.exerciseIndex}>
                    <Text style={s.exerciseIndexText}>{i + 1}</Text>
                  </View>
                  <Text style={s.exerciseName}>{ex.name}</Text>
                  <Text style={s.exerciseSets}>{ex.sets} × {ex.reps}</Text>
                </View>
              ))}
            </View>
          ))
        )}

      </ScrollView>

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
              <TextInput
                style={s.input}
                value={wName}
                onChangeText={setWName}
                placeholder="Ex: Treino A — Peito e Tríceps"
                placeholderTextColor={colors.textDisabled}
              />
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
                  <TextInput
                    style={s.input}
                    value={ex.name}
                    onChangeText={v => updateExercise(i, 'name', v)}
                    placeholder="Nome do exercício"
                    placeholderTextColor={colors.textDisabled}
                  />
                  <View style={s.setsRepsRow}>
                    <View style={s.setsRepsField}>
                      <Text style={s.setsRepsLabel}>Séries</Text>
                      <TextInput
                        style={s.inputSmall}
                        value={ex.sets}
                        onChangeText={v => updateExercise(i, 'sets', v)}
                        placeholder="4"
                        placeholderTextColor={colors.textDisabled}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={s.setsRepsField}>
                      <Text style={s.setsRepsLabel}>Repetições</Text>
                      <TextInput
                        style={s.inputSmall}
                        value={ex.reps}
                        onChangeText={v => updateExercise(i, 'reps', v)}
                        placeholder="12"
                        placeholderTextColor={colors.textDisabled}
                        keyboardType="numeric"
                      />
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
              <TextInput
                style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
                value={wNotes}
                onChangeText={setWNotes}
                placeholder="Ex: Descanso de 60s entre séries..."
                placeholderTextColor={colors.textDisabled}
                multiline
                maxLength={500}
              />
            </View>

            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSaveWorkout}
              disabled={saving}
              activeOpacity={0.8}
            >
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
  scroll: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing['4'] },
  backBtn:      { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 4 },
  headerTitle:  { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.textPrimary },

  // ✅ Badge de status no header
  statusBadge:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 2 },
  statusActive:       { backgroundColor: `${colors.success}20` },
  statusInactive:     { backgroundColor: colors.surfaceHigh },
  statusDot:          { width: 6, height: 6, borderRadius: 3 },
  statusDotActive:    { backgroundColor: colors.success },
  statusDotInactive:  { backgroundColor: colors.textDisabled },
  statusText:         { fontFamily: typography.family.medium, fontSize: 10 },
  statusTextActive:   { color: colors.success },
  statusTextInactive: { color: colors.textDisabled },

  // ✅ Botão toggle ativar/inativar
  toggleBtn:           { width: 40, height: 40, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  toggleBtnDeactivate: { backgroundColor: `${colors.error}15` },
  toggleBtnActivate:   { backgroundColor: `${colors.success}15` },

  studentCard:       { backgroundColor: colors.surface, borderRadius: radii['2xl'], padding: spacing['5'], alignItems: 'center', gap: spacing['3'], marginBottom: spacing['2'], ...shadows.sm },
  avatar:            { width: 80, height: 80, borderRadius: radii.full, borderWidth: 3, borderColor: colors.primary },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.primary },
  avatarInitial:     { fontFamily: typography.family.bold, fontSize: typography.size['2xl'], color: colors.white },
  studentName:       { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },

  metricsRow:    { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-around' },
  metricItem:    { alignItems: 'center', gap: 2, flex: 1 },
  metricValue:   { fontFamily: typography.family.bold, fontSize: typography.size.sm, color: colors.textPrimary, textAlign: 'center' },
  metricLabel:   { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },
  metricDivider: { width: 1, height: 32, backgroundColor: colors.border },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing['5'], marginBottom: spacing['3'] },
  sectionTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  addBtn:        { flexDirection: 'row', alignItems: 'center', gap: spacing['1'], backgroundColor: colors.primary, borderRadius: radii.lg, paddingHorizontal: spacing['3'], paddingVertical: spacing['2'] },
  addBtnText:    { fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.white },

  empty:     { alignItems: 'center', gap: spacing['3'], paddingVertical: spacing['8'] },
  emptyText: { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textDisabled },

  workoutCard:      { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], gap: spacing['3'], ...shadows.sm },
  workoutHeader:    { flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },
  workoutIconBox:   { width: 40, height: 40, borderRadius: radii.lg, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  workoutInfo:      { flex: 1 },
  workoutName:      { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  workoutActions:   { flexDirection: 'row', gap: spacing['2'] },
  workoutActionBtn: { width: 32, height: 32, borderRadius: radii.lg, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },

  daysRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['1'], marginTop: spacing['1'] },
  dayBadge:     { backgroundColor: `${colors.primary}20`, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 2 },
  dayBadgeText: { fontFamily: typography.family.medium, fontSize: 10, color: colors.primary },
  notesBox:     { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['2'], backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'] },
  notesText:    { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, flex: 1 },

  exerciseRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing['3'], paddingVertical: spacing['2'] },
  exerciseDivider:   { borderBottomWidth: 1, borderBottomColor: colors.divider },
  exerciseIndex:     { width: 24, height: 24, borderRadius: radii.full, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  exerciseIndexText: { fontFamily: typography.family.bold, fontSize: typography.size.xs, color: colors.primary },
  exerciseName:      { flex: 1, fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textPrimary },
  exerciseSets:      { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['6'], paddingVertical: spacing['4'], borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  sheetBody:   { padding: spacing['6'], gap: spacing['4'], paddingBottom: spacing['10'] },

  inputGroup: { gap: spacing['2'] },
  inputLabel: { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  input:      { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 52, paddingHorizontal: spacing['4'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  inputSmall: { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 48, paddingHorizontal: spacing['3'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary, textAlign: 'center' },

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
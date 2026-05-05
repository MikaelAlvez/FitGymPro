import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, useNavigation } from '@react-navigation/native'
import Constants from 'expo-constants'
import { workoutService } from '../../services/workout.service'
import type { Workout } from '../../services/workout.service'
import { colors, typography, spacing, radii, shadows } from '../../theme'
import { userService } from '../../services/user.service'
import { WorkoutFormModal } from '../../components/ui/WorkoutFormModal'
import type { WorkoutPayload } from '../../components/ui/WorkoutFormModal'
import { getBaseUrl } from '../../utils/getBaseUrl'

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

  const [isActive,        setIsActive]        = useState(student.active)
  const [workouts,        setWorkouts]        = useState<Workout[]>([])
  const [loadingWorkouts, setLoadingWorkouts] = useState(true)
  const [workoutModal,    setWorkoutModal]    = useState(false)
  const [editingWorkout,  setEditingWorkout]  = useState<Workout | null>(null)

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

  const openCreateModal = () => { setEditingWorkout(null); setWorkoutModal(true) }
  const openEditModal   = (workout: Workout) => { setEditingWorkout(workout); setWorkoutModal(true) }

  const handleSaveWorkout = async (payload: WorkoutPayload) => {
    if (editingWorkout) {
      await workoutService.update(editingWorkout.id, payload)
      Alert.alert('Sucesso', 'Treino atualizado com sucesso!')
    } else {
      await workoutService.create({ studentId: student.id, ...payload })
      Alert.alert('Sucesso', 'Treino criado com sucesso!')
    }
    setWorkoutModal(false)
    loadWorkouts()
  }

  const handleDeleteWorkout = (id: string, name: string) => {
    Alert.alert('Excluir treino', `Deseja excluir "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try { await workoutService.delete(id); loadWorkouts() }
          catch { Alert.alert('Erro', 'Não foi possível excluir.') }
        },
      },
    ])
  }

  const handleToggleActive = () => {
    const actionTitle = isActive ? 'Inativar aluno' : 'Reativar aluno'
    const actionMsg   = isActive
      ? `Deseja inativar ${student.name}?`
      : `Deseja reativar ${student.name}?`

    Alert.alert(actionTitle, actionMsg, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text:  isActive ? 'Inativar' : 'Reativar',
        style: isActive ? 'destructive' : 'default',
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

  // Renderiza exercícios com grupos e cardio
  const renderExercises = (workout: Workout) => {
    const items    = workout.exercises
    const rendered: React.ReactNode[] = []
    let i = 0

    while (i < items.length) {
      const ex = items[i]

      if (ex.type === 'cardio') {
        rendered.push(
          <View key={`cardio-${ex.id ?? i}`} style={[s.exerciseRow, i < items.length - 1 && s.exerciseDivider]}>
            <View style={s.cardioIcon}>
              <Ionicons name="bicycle" size={14} color={colors.info} />
            </View>
            <Text style={s.exerciseName}>{ex.name}</Text>
            <Text style={s.exerciseSets}>{ex.duration ?? '—'}</Text>
          </View>
        )
        i++
        continue
      }

      if (ex.groupId) {
        const groupId    = ex.groupId
        const groupLabel = ex.groupLabel ?? 'Grupo'
        const groupItems: typeof items = []
        while (i < items.length && items[i].groupId === groupId) {
          groupItems.push(items[i])
          i++
        }
        rendered.push(
          <View key={`group-${groupId}`} style={s.groupBlock}>
            <View style={s.groupBlockHeader}>
              <Ionicons name="git-merge-outline" size={12} color={colors.primary} />
              <Text style={s.groupBlockLabel}>{groupLabel}</Text>
            </View>
            {groupItems.map((gEx, gi) => (
              <View key={gEx.id ?? gi} style={[s.exerciseRow, gi < groupItems.length - 1 && s.exerciseDivider, { paddingHorizontal: spacing['3'] }]}>
                <View style={s.exerciseIndex}>
                  <Text style={s.exerciseIndexText}>{String.fromCharCode(65 + gi)}</Text>
                </View>
                <Text style={s.exerciseName}>{gEx.name}</Text>
                <Text style={s.exerciseSets}>{gEx.sets} × {gEx.reps}</Text>
              </View>
            ))}
          </View>
        )
        continue
      }

      rendered.push(
        <View key={ex.id ?? i} style={[s.exerciseRow, i < items.length - 1 && s.exerciseDivider]}>
          <View style={s.exerciseIndex}>
            <Text style={s.exerciseIndexText}>{i + 1}</Text>
          </View>
          <Text style={s.exerciseName}>{ex.name}</Text>
          <Text style={s.exerciseSets}>{ex.sets} × {ex.reps}</Text>
        </View>
      )
      i++
    }

    return rendered
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Perfil do Aluno</Text>
            <View style={[s.statusBadge, isActive ? s.statusActive : s.statusInactive]}>
              <View style={[s.statusDot, isActive ? s.statusDotActive : s.statusDotInactive]} />
              <Text style={[s.statusText, isActive ? s.statusTextActive : s.statusTextInactive]}>
                {isActive ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[s.toggleBtn, isActive ? s.toggleBtnDeactivate : s.toggleBtnActivate]}
            onPress={handleToggleActive}
            activeOpacity={0.8}
          >
            <Ionicons name={isActive ? 'person-remove-outline' : 'person-add-outline'} size={20} color={isActive ? colors.error : colors.success} />
          </TouchableOpacity>
        </View>

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
                  <TouchableOpacity onPress={() => openEditModal(workout)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={s.workoutActionBtn}>
                    <Ionicons name="pencil-outline" size={17} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteWorkout(workout.id, workout.name)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={s.workoutActionBtn}>
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

              {renderExercises(workout)}
            </View>
          ))
        )}

      </ScrollView>

      <WorkoutFormModal
        visible={workoutModal}
        onClose={() => setWorkoutModal(false)}
        onSave={handleSaveWorkout}
        editingWorkout={editingWorkout}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing['4'] },
  backBtn:      { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 4 },
  headerTitle:  { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.textPrimary },

  statusBadge:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 2 },
  statusActive:       { backgroundColor: `${colors.success}20` },
  statusInactive:     { backgroundColor: colors.surfaceHigh },
  statusDot:          { width: 6, height: 6, borderRadius: 3 },
  statusDotActive:    { backgroundColor: colors.success },
  statusDotInactive:  { backgroundColor: colors.textDisabled },
  statusText:         { fontFamily: typography.family.medium, fontSize: 10 },
  statusTextActive:   { color: colors.success },
  statusTextInactive: { color: colors.textDisabled },

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

  notesBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['2'], backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'] },
  notesText: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, flex: 1 },

  exerciseRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing['3'], paddingVertical: spacing['2'] },
  exerciseDivider:   { borderBottomWidth: 1, borderBottomColor: colors.divider },
  exerciseIndex:     { width: 24, height: 24, borderRadius: radii.full, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  exerciseIndexText: { fontFamily: typography.family.bold, fontSize: typography.size.xs, color: colors.primary },
  exerciseName:      { flex: 1, fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textPrimary },
  exerciseSets:      { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },
  cardioIcon:        { width: 24, height: 24, borderRadius: radii.full, backgroundColor: `${colors.info}20`, alignItems: 'center', justifyContent: 'center' },

  groupBlock:       { borderRadius: radii.lg, marginBottom: spacing['2'], overflow: 'hidden', borderWidth: 1, borderColor: `${colors.primary}20` },
  groupBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing['3'], paddingVertical: spacing['1'], backgroundColor: `${colors.primary}10` },
  groupBlockLabel:  { fontFamily: typography.family.bold, fontSize: 10, color: colors.primary },
})
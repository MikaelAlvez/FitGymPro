import React, { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, Modal, Alert,
  ActivityIndicator, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { useFocusEffect } from '@react-navigation/native'
import { useAuth }       from '../../contexts/AuthContext'
import { apiRequest }    from '../../services/api'
import { userService }   from '../../services/user.service'
import { workoutService } from '../../services/workout.service'
import type { StudentProfile } from '../../services/user.service'
import type { Workout } from '../../services/workout.service'
import { colors, typography, spacing, radii, shadows } from '../../theme'

const getBaseUrl = () => {
  const host = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants.manifest as any)?.debuggerHost
  if (host) return `http://${host.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}

// Dia da semana atual em inglês (mesmo formato do backend)
const TODAY_KEY = (() => {
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  return days[new Date().getDay()]
})()

const DAY_LABELS: Record<string, string> = {
  monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua',
  thursday: 'Qui', friday: 'Sex', saturday: 'Sáb', sunday: 'Dom',
}

function calcIMC(weight: string, height: string): string {
  const w = parseFloat(weight)
  const h = parseFloat(height) / 100
  if (!w || !h) return '—'
  return (w / (h * h)).toFixed(1)
}

function imcLabel(imc: string): { label: string; color: string } {
  const v = parseFloat(imc)
  if (isNaN(v)) return { label: '',               color: colors.textSecondary }
  if (v < 18.5) return { label: 'Abaixo do peso', color: '#F59E0B' }
  if (v < 24.9) return { label: 'Peso normal',    color: colors.success }
  if (v < 29.9) return { label: 'Sobrepeso',      color: '#F59E0B' }
  return             { label: 'Obesidade',         color: colors.error }
}

export function StudentHomeScreen() {
  const { user, signOut } = useAuth()
  const firstName = user?.name?.split(' ')[0] ?? 'Aluno'
  const avatarUrl = user?.avatar ? `${getBaseUrl()}${user.avatar}` : null
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const [profile,        setProfile]        = useState<StudentProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [menuVisible,    setMenuVisible]    = useState(false)

  // Treinos reais
  const [todayWorkout,   setTodayWorkout]   = useState<Workout | null>(null)
  const [loadingWorkout, setLoadingWorkout] = useState(true)
  const [doneExercises,  setDoneExercises]  = useState<Set<string>>(new Set())

  // Edição de métricas
  const [metricsModal,  setMetricsModal]  = useState(false)
  const [weightInput,   setWeightInput]   = useState('')
  const [heightInput,   setHeightInput]   = useState('')
  const [savingMetrics, setSavingMetrics] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [profileData, workoutsData] = await Promise.all([
        apiRequest<{ studentProfile: StudentProfile }>(
          '/auth/me/profile', { authenticated: true }
        ),
        workoutService.myWorkouts(),
      ])

      setProfile(profileData.studentProfile)

      // Filtra treino do dia atual
      const todayW = workoutsData.find(w => w.days.includes(TODAY_KEY)) ?? null
      setTodayWorkout(todayW)
      setDoneExercises(new Set())
    } catch {
      // silencia
    } finally {
      setLoadingProfile(false)
      setLoadingWorkout(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => { loadData() }, [loadData]),
  )

  const imc     = profile ? calcIMC(profile.weight, profile.height) : '—'
  const imcData = imcLabel(imc)
  const liveImc = calcIMC(weightInput, heightInput)

  const doneCount = doneExercises.size
  const totalExercises = todayWorkout?.exercises.length ?? 0
  const progress = totalExercises > 0 ? doneCount / totalExercises : 0

  const toggleExercise = (id: string) => {
    setDoneExercises(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const openMetricsModal = () => {
    setWeightInput(profile?.weight ?? '')
    setHeightInput(profile?.height ?? '')
    setMetricsModal(true)
  }

  const handleSaveMetrics = async () => {
    if (!weightInput || !heightInput) {
      Alert.alert('Atenção', 'Preencha peso e altura.')
      return
    }
    try {
      setSavingMetrics(true)
      const result = await userService.updateStudentMetrics({ weight: weightInput, height: heightInput })
      setProfile(prev => prev ? { ...prev, ...result.studentProfile } : result.studentProfile)
      setMetricsModal(false)
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar as métricas.')
    } finally {
      setSavingMetrics(false)
    }
  }

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut() },
    ])
    setMenuVisible(false)
  }

  const METRICS = [
    { label: 'Peso',     value: profile ? `${profile.weight} kg` : '—', icon: 'scale-outline'     as const },
    { label: 'Altura',   value: profile ? `${profile.height} cm` : '—', icon: 'resize-outline'    as const },
    { label: 'IMC',      value: imc,                                      icon: 'analytics-outline' as const },
    { label: 'Objetivo', value: profile?.goal ?? '—',                    icon: 'fitness-outline'   as const },
  ]

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {avatarUrl
              ? <Image source={{ uri: avatarUrl }} style={s.avatar} />
              : (
                <View style={s.avatarPlaceholder}>
                  <Text style={s.avatarInitial}>{firstName.charAt(0).toUpperCase()}</Text>
                </View>
              )
            }
            <View>
              <Text style={s.greeting}>Olá, {firstName} 💪</Text>
              <Text style={s.date}>{today}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.menuBtn} onPress={() => setMenuVisible(true)}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Métricas */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Minhas métricas</Text>
          <TouchableOpacity style={s.editBtn} onPress={openMetricsModal} activeOpacity={0.7}>
            <Ionicons name="pencil-outline" size={15} color={colors.primary} />
            <Text style={s.editBtnText}>Editar</Text>
          </TouchableOpacity>
        </View>

        {loadingProfile ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing['4'] }} />
        ) : (
          <>
            <View style={s.metricsGrid}>
              {METRICS.map(m => (
                <View key={m.label} style={s.metricCard}>
                  <Ionicons name={m.icon} size={20} color={colors.primary} />
                  <Text style={s.metricValue} numberOfLines={1}>{m.value}</Text>
                  <Text style={s.metricLabel}>{m.label}</Text>
                </View>
              ))}
            </View>
            {profile && (
              <Text style={[s.imcLabel, { color: imcData.color }]}>{imcData.label}</Text>
            )}
          </>
        )}

        {/* Treino de hoje */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Treino de hoje</Text>
          {todayWorkout && (
            <View style={s.progressBadge}>
              <Text style={s.progressBadgeText}>{doneCount}/{totalExercises}</Text>
            </View>
          )}
        </View>

        {loadingWorkout ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing['4'] }} />
        ) : !todayWorkout ? (
          <View style={s.emptyWorkout}>
            <Ionicons name="barbell-outline" size={36} color={colors.textDisabled} />
            <Text style={s.emptyWorkoutText}>Nenhum treino para hoje</Text>
            <Text style={s.emptyWorkoutSub}>Seu personal ainda não criou um treino para {DAY_LABELS[TODAY_KEY] ?? 'hoje'}</Text>
          </View>
        ) : (
          <View style={s.workoutCard}>
            <View style={s.workoutHeader}>
              <View style={s.workoutIconBox}>
                <Ionicons name="barbell" size={20} color={colors.primary} />
              </View>
              <View style={s.workoutInfo}>
                <Text style={s.workoutName}>{todayWorkout.name}</Text>
                {/* Dias do treino */}
                <View style={s.daysRow}>
                  {todayWorkout.days.map(d => (
                    <View key={d} style={[s.dayBadge, d === TODAY_KEY && s.dayBadgeToday]}>
                      <Text style={[s.dayBadgeText, d === TODAY_KEY && s.dayBadgeTextToday]}>
                        {DAY_LABELS[d] ?? d}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Notas */}
            {todayWorkout.notes && (
              <View style={s.notesBox}>
                <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
                <Text style={s.notesText}>{todayWorkout.notes}</Text>
              </View>
            )}

            {/* Barra de progresso */}
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
            </View>
            <Text style={s.progressText}>{Math.round(progress * 100)}% concluído</Text>

            {/* Exercícios */}
            <View style={s.exerciseList}>
              {todayWorkout.exercises.map((ex, i) => {
                const done = doneExercises.has(ex.id ?? String(i))
                return (
                  <TouchableOpacity
                    key={ex.id ?? i}
                    style={[s.exerciseRow, i < todayWorkout.exercises.length - 1 && s.exerciseDivider]}
                    onPress={() => toggleExercise(ex.id ?? String(i))}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={done ? colors.success : colors.border}
                    />
                    <View style={s.exerciseInfo}>
                      <Text style={[s.exerciseName, done && s.exerciseDone]}>{ex.name}</Text>
                      <Text style={s.exerciseSets}>{ex.sets} séries × {ex.reps} reps</Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Modal métricas */}
      <Modal visible={metricsModal} transparent animationType="slide" onRequestClose={() => setMetricsModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setMetricsModal(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Editar métricas</Text>
            <TouchableOpacity onPress={() => setMetricsModal(false)}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={s.sheetBody}>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Peso (kg)</Text>
              <TextInput
                style={s.input}
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="numeric"
                placeholder="Ex: 75.5"
                placeholderTextColor={colors.textDisabled}
              />
            </View>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Altura (cm)</Text>
              <TextInput
                style={s.input}
                value={heightInput}
                onChangeText={setHeightInput}
                keyboardType="numeric"
                placeholder="Ex: 175"
                placeholderTextColor={colors.textDisabled}
              />
            </View>
            {weightInput && heightInput ? (
              <View style={s.imcPreview}>
                <Ionicons name="analytics-outline" size={18} color={colors.primary} />
                <Text style={s.imcPreviewText}>
                  IMC calculado:{' '}
                  <Text style={{ color: imcLabel(liveImc).color, fontFamily: typography.family.bold }}>
                    {liveImc} — {imcLabel(liveImc).label}
                  </Text>
                </Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[s.saveBtn, savingMetrics && { opacity: 0.6 }]}
              onPress={handleSaveMetrics}
              disabled={savingMetrics}
              activeOpacity={0.8}
            >
              {savingMetrics
                ? <ActivityIndicator color={colors.white} />
                : <Text style={s.saveBtnText}>Salvar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Menu dropdown */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={s.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)} />
        <View style={s.menuBox}>
          <TouchableOpacity style={s.menuItem} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={s.menuItemTextDanger}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  header:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing['5'] },
  headerLeft:        { flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },
  avatar:            { width: 46, height: 46, borderRadius: radii.full, borderWidth: 2, borderColor: colors.primary },
  avatarPlaceholder: { width: 46, height: 46, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary },
  avatarInitial:     { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.white },
  greeting:          { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  date:              { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing['1'], textTransform: 'capitalize' },
  menuBtn:           { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing['5'], marginBottom: spacing['3'] },
  sectionTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },

  editBtn:     { flexDirection: 'row', alignItems: 'center', gap: spacing['1'] },
  editBtnText: { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.primary },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['3'], marginBottom: spacing['1'] },
  metricCard:  { width: '47%', backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], alignItems: 'center', gap: spacing['2'], ...shadows.sm },
  metricValue: { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.textPrimary },
  metricLabel: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },
  imcLabel:    { fontFamily: typography.family.medium, fontSize: typography.size.xs, textAlign: 'center', marginBottom: spacing['2'] },

  progressBadge:     { backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 2 },
  progressBadgeText: { fontFamily: typography.family.bold, fontSize: typography.size.xs, color: colors.white },

  emptyWorkout:    { alignItems: 'center', gap: spacing['2'], paddingVertical: spacing['6'], backgroundColor: colors.surface, borderRadius: radii.xl, ...shadows.sm },
  emptyWorkoutText:{ fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textSecondary },
  emptyWorkoutSub: { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textDisabled, textAlign: 'center', paddingHorizontal: spacing['4'] },

  workoutCard:    { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['5'], ...shadows.md },
  workoutHeader:  { flexDirection: 'row', alignItems: 'center', gap: spacing['3'], marginBottom: spacing['3'] },
  workoutIconBox: { width: 44, height: 44, borderRadius: radii.lg, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  workoutInfo:    { flex: 1 },
  workoutName:    { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },

  daysRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['1'], marginTop: spacing['1'] },
  dayBadge:          { backgroundColor: colors.surfaceHigh, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 2 },
  dayBadgeToday:     { backgroundColor: `${colors.primary}20` },
  dayBadgeText:      { fontFamily: typography.family.regular, fontSize: 10, color: colors.textSecondary },
  dayBadgeTextToday: { color: colors.primary, fontFamily: typography.family.bold },

  notesBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['2'], backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'], marginBottom: spacing['3'] },
  notesText: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, flex: 1 },

  progressBar:  { height: 6, backgroundColor: colors.surfaceHigh, borderRadius: radii.full, overflow: 'hidden', marginBottom: spacing['1'] },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radii.full },
  progressText: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, textAlign: 'right', marginBottom: spacing['4'] },

  exerciseList:    { gap: 0 },
  exerciseRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing['3'], paddingVertical: spacing['3'] },
  exerciseDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  exerciseInfo:    { flex: 1 },
  exerciseName:    { fontFamily: typography.family.medium, fontSize: typography.size.md, color: colors.textPrimary },
  exerciseDone:    { textDecorationLine: 'line-through', color: colors.textDisabled },
  exerciseSets:    { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },

  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:        { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], paddingBottom: spacing['8'] },
  sheetHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['6'], paddingVertical: spacing['4'], borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle:   { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  sheetBody:    { padding: spacing['6'], gap: spacing['4'] },
  inputGroup:   { gap: spacing['1'] },
  inputLabel:   { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  input:        { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 52, paddingHorizontal: spacing['4'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  imcPreview:   { flexDirection: 'row', alignItems: 'center', gap: spacing['2'], backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'] },
  imcPreviewText:{ fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, flex: 1 },
  saveBtn:      { backgroundColor: colors.primary, borderRadius: radii.lg, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: spacing['2'] },
  saveBtnText:  { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },

  menuOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  menuBox:            { position: 'absolute', top: 90, right: spacing['5'], backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, ...shadows.md, minWidth: 160 },
  menuItem:           { flexDirection: 'row', alignItems: 'center', gap: spacing['3'], paddingVertical: spacing['4'], paddingHorizontal: spacing['4'] },
  menuItemTextDanger: { fontFamily: typography.family.medium, fontSize: typography.size.md, color: colors.error },
})
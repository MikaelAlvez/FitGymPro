import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Modal, Image,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { useAuth }     from '../../contexts/AuthContext'
import { apiRequest }  from '../../services/api'
import { userService } from '../../services/user.service'
import type { StudentProfile } from '../../services/user.service'
import { colors, typography, spacing, radii, shadows } from '../../theme'

// ─── Config ──────────────────────────────────
const getBaseUrl = () => {
  const host = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants.manifest as any)?.debuggerHost
  if (host) return `http://${host.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}

// ─── Helpers ─────────────────────────────────
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

// ─── Mock treino ──────────────────────────────
const WORKOUT = {
  name:      'Treino A — Peito e Tríceps',
  personal:  'Personal Trainer',
  exercises: [
    { id: '1', name: 'Supino reto',      sets: '4x12', done: false },
    { id: '2', name: 'Crucifixo',        sets: '3x15', done: false },
    { id: '3', name: 'Supino inclinado', sets: '3x12', done: false },
    { id: '4', name: 'Tríceps pulley',   sets: '4x12', done: false },
    { id: '5', name: 'Tríceps francês',  sets: '3x12', done: false },
  ],
}

// ─── Screen ──────────────────────────────────
export function StudentHomeScreen() {
  const { user, signOut } = useAuth()
  const firstName = user?.name?.split(' ')[0] ?? 'Aluno'
  const avatarUrl = user?.avatar ? `${getBaseUrl()}${user.avatar}` : null
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const [profile,        setProfile]        = useState<StudentProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [exercises,      setExercises]      = useState(WORKOUT.exercises)
  const [menuVisible,    setMenuVisible]    = useState(false)

  // ─── Edição de métricas ───────────────────
  const [metricsModal,  setMetricsModal]  = useState(false)
  const [weightInput,   setWeightInput]   = useState('')
  const [heightInput,   setHeightInput]   = useState('')
  const [savingMetrics, setSavingMetrics] = useState(false)

  const doneCount = exercises.filter(e => e.done).length
  const progress  = exercises.length > 0 ? doneCount / exercises.length : 0

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest<{ studentProfile: StudentProfile }>(
          '/auth/me/profile',
          { authenticated: true },
        )
        setProfile(data.studentProfile)
      } catch {
        // silencia
      } finally {
        setLoadingProfile(false)
      }
    })()
  }, [])

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
      const result = await userService.updateStudentMetrics({
        weight: weightInput,
        height: heightInput,
      })
      setProfile(result.studentProfile)
      setMetricsModal(false)
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar as métricas.')
    } finally {
      setSavingMetrics(false)
    }
  }

  const imc      = profile ? calcIMC(profile.weight, profile.height) : '—'
  const imcInfo  = imcLabel(imc)
  const liveImc  = calcIMC(weightInput, heightInput)

  const METRICS = [
    { label: 'Peso',     value: profile ? `${profile.weight} kg` : '—', icon: 'scale-outline'     as const },
    { label: 'Altura',   value: profile ? `${profile.height} cm` : '—', icon: 'resize-outline'    as const },
    { label: 'IMC',      value: imc,                                      icon: 'analytics-outline' as const },
    { label: 'Objetivo', value: profile?.goal ?? '—',                    icon: 'fitness-outline'   as const },
  ]

  const toggleExercise = (id: string) =>
    setExercises(prev => prev.map(e => e.id === id ? { ...e, done: !e.done } : e))

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut() },
    ])
    setMenuVisible(false)
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={s.avatar} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarInitial}>{firstName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View>
              <Text style={s.greeting}>Olá, {firstName} 💪</Text>
              <Text style={s.date}>{today}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.notifBtn} onPress={() => setMenuVisible(true)}>
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
              <Text style={[s.imcLabel, { color: imcInfo.color }]}>
                {imcInfo.label}
              </Text>
            )}
          </>
        )}

        {/* Treino do dia */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Treino de hoje</Text>
          <View style={s.progressBadge}>
            <Text style={s.progressBadgeText}>{doneCount}/{exercises.length}</Text>
          </View>
        </View>

        <View style={s.workoutCard}>
          <View style={s.workoutHeader}>
            <View style={s.workoutIconBox}>
              <Ionicons name="barbell" size={20} color={colors.primary} />
            </View>
            <View style={s.workoutInfo}>
              <Text style={s.workoutName}>{WORKOUT.name}</Text>
              <Text style={s.workoutPersonal}>Personal: {WORKOUT.personal}</Text>
            </View>
          </View>

          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
          </View>
          <Text style={s.progressText}>{Math.round(progress * 100)}% concluído</Text>

          <View style={s.exerciseList}>
            {exercises.map((ex, i) => (
              <TouchableOpacity
                key={ex.id}
                style={[s.exerciseRow, i < exercises.length - 1 && s.exerciseDivider]}
                onPress={() => toggleExercise(ex.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={ex.done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={ex.done ? colors.success : colors.border}
                />
                <View style={s.exerciseInfo}>
                  <Text style={[s.exerciseName, ex.done && s.exerciseDone]}>{ex.name}</Text>
                  <Text style={s.exerciseSets}>{ex.sets}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Modal — Editar métricas */}
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

            <View style={s.metricInputGroup}>
              <Text style={s.metricInputLabel}>Peso (kg)</Text>
              <TextInput
                style={s.metricInput}
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="numeric"
                placeholder="Ex: 75.5"
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            <View style={s.metricInputGroup}>
              <Text style={s.metricInputLabel}>Altura (cm)</Text>
              <TextInput
                style={s.metricInput}
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

// ─── Styles ──────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  // Header
  header:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing['5'] },
  headerLeft:        { flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },
  avatar:            { width: 46, height: 46, borderRadius: radii.full, borderWidth: 2, borderColor: colors.primary },
  avatarPlaceholder: { width: 46, height: 46, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary },
  avatarInitial:     { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.white },
  greeting:          { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  date:              { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing['1'], textTransform: 'capitalize' },
  notifBtn:          { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing['5'], marginBottom: spacing['3'] },
  sectionTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },

  // Botão editar
  editBtn:     { flexDirection: 'row', alignItems: 'center', gap: spacing['1'] },
  editBtnText: { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.primary },

  // Métricas
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['3'], marginBottom: spacing['1'] },
  metricCard:  { width: '47%', backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], alignItems: 'center', gap: spacing['2'], ...shadows.sm },
  metricValue: { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.textPrimary },
  metricLabel: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },
  imcLabel:    { fontFamily: typography.family.medium, fontSize: typography.size.xs, textAlign: 'center', marginBottom: spacing['2'] },

  // Progress badge
  progressBadge:     { backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 2 },
  progressBadgeText: { fontFamily: typography.family.bold, fontSize: typography.size.xs, color: colors.white },

  // Workout
  workoutCard:     { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['5'], ...shadows.md },
  workoutHeader:   { flexDirection: 'row', alignItems: 'center', gap: spacing['3'], marginBottom: spacing['4'] },
  workoutIconBox:  { width: 44, height: 44, borderRadius: radii.lg, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  workoutInfo:     { flex: 1 },
  workoutName:     { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  workoutPersonal: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  progressBar:     { height: 6, backgroundColor: colors.surfaceHigh, borderRadius: radii.full, overflow: 'hidden', marginBottom: spacing['1'] },
  progressFill:    { height: '100%', backgroundColor: colors.primary, borderRadius: radii.full },
  progressText:    { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, textAlign: 'right', marginBottom: spacing['4'] },

  // Exercises
  exerciseList:    { gap: 0 },
  exerciseRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing['3'], paddingVertical: spacing['3'] },
  exerciseDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  exerciseInfo:    { flex: 1 },
  exerciseName:    { fontFamily: typography.family.medium, fontSize: typography.size.md, color: colors.textPrimary },
  exerciseDone:    { textDecorationLine: 'line-through', color: colors.textDisabled },
  exerciseSets:    { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },

  // Modal métricas
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], paddingBottom: spacing['8'] },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['6'], paddingVertical: spacing['4'], borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  sheetBody:   { padding: spacing['6'], gap: spacing['4'] },

  metricInputGroup: { gap: spacing['1'] },
  metricInputLabel: { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  metricInput:      { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 52, paddingHorizontal: spacing['4'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },

  imcPreview:     { flexDirection: 'row', alignItems: 'center', gap: spacing['2'], backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'] },
  imcPreviewText: { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, flex: 1 },

  saveBtn:     { backgroundColor: colors.primary, borderRadius: radii.lg, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: spacing['2'] },
  saveBtnText: { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },

  // Menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  menuBox:     { position: 'absolute', top: 90, right: spacing['5'], backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, ...shadows.md, minWidth: 160 },
  menuItem:    { flexDirection: 'row', alignItems: 'center', gap: spacing['3'], paddingVertical: spacing['4'], paddingHorizontal: spacing['4'] },
  menuItemTextDanger: { fontFamily: typography.family.medium, fontSize: typography.size.md, color: colors.error },
})
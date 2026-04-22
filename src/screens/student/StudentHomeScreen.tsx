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
import { useAuth }        from '../../contexts/AuthContext'
import { apiRequest }     from '../../services/api'
import { userService }    from '../../services/user.service'
import { workoutService } from '../../services/workout.service'
import type { StudentProfile } from '../../services/user.service'
import type { Workout, Exercise } from '../../services/workout.service'
import { colors, typography, spacing, radii, shadows } from '../../theme'

const getBaseUrl = () => {
  const host = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants.manifest as any)?.debuggerHost
  if (host) return `http://${host.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}

const TODAY_KEY = (() => {
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  return days[new Date().getDay()]
})()

const DAY_LABELS: Record<string, string> = {
  monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua',
  thursday: 'Qui', friday: 'Sex', saturday: 'Sáb', sunday: 'Dom',
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

// Tipo do personal vinculado
interface LinkedPersonal {
  id:     string
  name:   string
  avatar: string | null
  city:   string | null
  state:  string | null
  personalProfile: {
    cref:        string
    classFormat: string
  } | null
}

const FORMAT_LABEL: Record<string, string> = {
  presential: 'Presencial',
  online:     'Online',
  hybrid:     'Híbrido',
}

export function StudentHomeScreen() {
  const { user, signOut } = useAuth()
  const firstName = user?.name?.split(' ')[0] ?? 'Aluno'
  const avatarUrl = user?.avatar ? `${getBaseUrl()}${user.avatar}` : null
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  // ─── Perfil e métricas ────────────────────
  const [profile,        setProfile]        = useState<StudentProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [metricsModal,   setMetricsModal]   = useState(false)
  const [weightInput,    setWeightInput]    = useState('')
  const [heightInput,    setHeightInput]    = useState('')
  const [savingMetrics,  setSavingMetrics]  = useState(false)

  // ─── Personal vinculado ───────────────────
  const [personal, setPersonal] = useState<LinkedPersonal | null>(null)

  // ─── Treinos de hoje ──────────────────────
  const [todayWorkouts,   setTodayWorkouts]   = useState<Workout[]>([])
  const [loadingWorkout,  setLoadingWorkout]  = useState(true)
  const [doneExercises,   setDoneExercises]   = useState<Set<string>>(new Set())
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null)

  // ─── Menu ─────────────────────────────────
  const [menuVisible, setMenuVisible] = useState(false)

  // ─── Modal criar treino ───────────────────
  const [workoutModal, setWorkoutModal] = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [wName,     setWName]     = useState('')
  const [wDays,     setWDays]     = useState<string[]>([])
  const [wNotes,    setWNotes]    = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: '', sets: '', reps: '', order: 0 },
  ])

  // ─── Load ─────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [profileData, workoutsData] = await Promise.all([
        apiRequest<{
          studentProfile: StudentProfile
          personalId?:    string
          personal?:      LinkedPersonal
        }>('/auth/me/profile', { authenticated: true }),
        workoutService.myWorkouts(),
      ])

      setProfile(profileData.studentProfile)

      // Personal vinculado — vem no /auth/me/profile
      setPersonal(profileData.personal ?? null)

      const todayList = workoutsData.filter(w => w.days.includes(TODAY_KEY) && w.active)
      setTodayWorkouts(todayList)
      setDoneExercises(new Set())
      setExpandedWorkout(null)
    } catch {
      // silencia
    } finally {
      setLoadingProfile(false)
      setLoadingWorkout(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { loadData() }, [loadData]))

  // ─── Métricas ─────────────────────────────
  const imc     = profile ? calcIMC(profile.weight, profile.height) : '—'
  const imcData = imcLabel(imc)
  const liveImc = calcIMC(weightInput, heightInput)

  const openMetricsModal = () => {
    setWeightInput(profile?.weight ?? '')
    setHeightInput(profile?.height ?? '')
    setMetricsModal(true)
  }

  const handleSaveMetrics = async () => {
    if (!weightInput || !heightInput) { Alert.alert('Atenção', 'Preencha peso e altura.'); return }
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

  // ─── Treinos de hoje ──────────────────────
  const totalExercises = todayWorkouts.reduce((acc, w) => acc + w.exercises.length, 0)
  const doneCount      = doneExercises.size
  const totalProgress  = totalExercises > 0 ? doneCount / totalExercises : 0

  const toggleExercise = (id: string) => {
    setDoneExercises(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleWorkout = (id: string) =>
    setExpandedWorkout(prev => prev === id ? null : id)

  // ─── Modal criar treino ───────────────────
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

  const resetWorkoutForm = () => {
    setWName(''); setWDays([]); setWNotes('')
    setExercises([{ name: '', sets: '', reps: '', order: 0 }])
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
      await workoutService.create({
        studentId: user!.id,
        name:      wName.trim(),
        days:      wDays,
        notes:     wNotes.trim() || undefined,
        exercises: exercises.map((e, i) => ({ ...e, order: i })),
      })
      Alert.alert('Sucesso', 'Treino criado!')
      setWorkoutModal(false)
      resetWorkoutForm()
      loadData()
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível salvar.')
    } finally {
      setSaving(false)
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

        {/* Card do personal vinculado */}
        {personal && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Meu Personal</Text>
            </View>
            <View style={s.personalCard}>
              {/* Avatar */}
              {personal.avatar
                ? <Image source={{ uri: `${getBaseUrl()}${personal.avatar}` }} style={s.personalAvatar} />
                : (
                  <View style={s.personalAvatarPlaceholder}>
                    <Text style={s.personalAvatarInitial}>
                      {personal.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )
              }
              {/* Info */}
              <View style={s.personalInfo}>
                <Text style={s.personalName}>{personal.name}</Text>
                {personal.personalProfile?.cref && (
                  <Text style={s.personalCref}>CREF: {personal.personalProfile.cref}</Text>
                )}
                <View style={s.personalTags}>
                  {personal.personalProfile?.classFormat && (
                    <View style={s.personalTag}>
                      <Ionicons name="location-outline" size={11} color={colors.primary} />
                      <Text style={s.personalTagText}>
                        {FORMAT_LABEL[personal.personalProfile.classFormat] ?? personal.personalProfile.classFormat}
                      </Text>
                    </View>
                  )}
                  {(personal.city || personal.state) && (
                    <View style={s.personalTag}>
                      <Ionicons name="map-outline" size={11} color={colors.textSecondary} />
                      <Text style={s.personalTagText}>
                        {[personal.city, personal.state].filter(Boolean).join(' - ')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {/* Badge vinculado */}
              <View style={s.linkedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={s.linkedBadgeText}>Vinculado</Text>
              </View>
            </View>
          </>
        )}

        {/* Treinos de hoje */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Treinos de hoje</Text>
          <View style={s.sectionActions}>
            {todayWorkouts.length > 0 && (
              <View style={s.progressBadge}>
                <Text style={s.progressBadgeText}>{doneCount}/{totalExercises}</Text>
              </View>
            )}
            <TouchableOpacity
              style={s.createBtn}
              onPress={() => { resetWorkoutForm(); setWorkoutModal(true) }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color={colors.white} />
              <Text style={s.createBtnText}>Novo Treino</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loadingWorkout ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing['4'] }} />
        ) : todayWorkouts.length === 0 ? (
          <View style={s.emptyWorkout}>
            <Ionicons name="barbell-outline" size={36} color={colors.textDisabled} />
            <Text style={s.emptyWorkoutText}>Nenhum treino para hoje</Text>
            <Text style={s.emptyWorkoutSub}>
              Crie um treino ou aguarde seu personal para {DAY_LABELS[TODAY_KEY] ?? 'hoje'}
            </Text>
          </View>
        ) : (
          <>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${totalProgress * 100}%` as any }]} />
            </View>
            <Text style={s.progressText}>{doneCount}/{totalExercises} exercícios concluídos</Text>

            {todayWorkouts.map(workout => {
              const isOpen     = expandedWorkout === workout.id
              const wDoneCount = workout.exercises.filter(ex => doneExercises.has(ex.id ?? '')).length
              const wTotal     = workout.exercises.length
              const wProgress  = wTotal > 0 ? wDoneCount / wTotal : 0

              return (
                <View key={workout.id} style={[s.workoutCard, isOpen && s.workoutCardOpen]}>
                  <TouchableOpacity style={s.workoutHeader} onPress={() => toggleWorkout(workout.id)} activeOpacity={0.8}>
                    <View style={s.workoutIconBox}>
                      <Ionicons name="barbell" size={20} color={colors.primary} />
                    </View>
                    <View style={s.workoutInfo}>
                      <Text style={s.workoutName}>{workout.name}</Text>
                      {workout.personal ? (
                        <Text style={s.workoutBy}>
                          Por: {workout.personal.name}
                          {workout.personal.personalProfile?.cref ? ` · ${workout.personal.personalProfile.cref}` : ''}
                        </Text>
                      ) : (
                        <Text style={[s.workoutBy, { color: colors.primary }]}>Treino próprio</Text>
                      )}
                    </View>
                    <View style={s.workoutMeta}>
                      <Text style={s.workoutMetaText}>{wDoneCount}/{wTotal}</Text>
                      <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>

                  <View style={s.progressBarSm}>
                    <View style={[s.progressFillSm, { width: `${wProgress * 100}%` as any }]} />
                  </View>

                  {isOpen && (
                    <View style={s.exerciseList}>
                      {workout.notes && (
                        <View style={s.notesBox}>
                          <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
                          <Text style={s.notesText}>{workout.notes}</Text>
                        </View>
                      )}
                      {workout.exercises.map((ex, i) => {
                        const done = doneExercises.has(ex.id ?? String(i))
                        return (
                          <TouchableOpacity
                            key={ex.id ?? i}
                            style={[s.exerciseRow, i < workout.exercises.length - 1 && s.exerciseDivider]}
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
                  )}
                </View>
              )
            })}
          </>
        )}

      </ScrollView>

      {/* ── Modal métricas ── */}
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
              <TextInput style={s.input} value={weightInput} onChangeText={setWeightInput} keyboardType="numeric" placeholder="Ex: 75.5" placeholderTextColor={colors.textDisabled} />
            </View>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Altura (cm)</Text>
              <TextInput style={s.input} value={heightInput} onChangeText={setHeightInput} keyboardType="numeric" placeholder="Ex: 175" placeholderTextColor={colors.textDisabled} />
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
            <TouchableOpacity style={[s.saveBtn, savingMetrics && { opacity: 0.6 }]} onPress={handleSaveMetrics} disabled={savingMetrics} activeOpacity={0.8}>
              {savingMetrics ? <ActivityIndicator color={colors.white} /> : <Text style={s.saveBtnText}>Salvar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal criar treino ── */}
      <Modal visible={workoutModal} transparent animationType="slide" onRequestClose={() => { setWorkoutModal(false); resetWorkoutForm() }}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => { setWorkoutModal(false); resetWorkoutForm() }} />
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Novo treino</Text>
            <TouchableOpacity onPress={() => { setWorkoutModal(false); resetWorkoutForm() }}>
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
                  <TouchableOpacity key={d.key} style={[s.daySelectorItem, wDays.includes(d.key) && s.daySelectorItemActive]} onPress={() => toggleDay(d.key)} activeOpacity={0.8}>
                    <Text style={[s.daySelectorText, wDays.includes(d.key) && s.daySelectorTextActive]}>{d.label}</Text>
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
              <TextInput style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]} value={wNotes} onChangeText={setWNotes} placeholder="Ex: Descanso de 60s..." placeholderTextColor={colors.textDisabled} multiline maxLength={500} />
            </View>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveWorkout} disabled={saving} activeOpacity={0.8}>
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={s.saveBtnText}>Criar treino</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Menu dropdown ── */}
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

  sectionHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing['5'], marginBottom: spacing['3'] },
  sectionTitle:   { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },

  editBtn:     { flexDirection: 'row', alignItems: 'center', gap: spacing['1'] },
  editBtnText: { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.primary },

  createBtn:     { flexDirection: 'row', alignItems: 'center', gap: spacing['1'], backgroundColor: colors.primary, borderRadius: radii.lg, paddingHorizontal: spacing['3'], paddingVertical: spacing['2'] },
  createBtnText: { fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.white },

  // Card do personal
  personalCard:             { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], gap: spacing['3'], borderWidth: 1.5, borderColor: `${colors.success}30`, ...shadows.sm },
  personalAvatar:           { width: 52, height: 52, borderRadius: radii.full, borderWidth: 2, borderColor: colors.success },
  personalAvatarPlaceholder:{ width: 52, height: 52, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.success },
  personalAvatarInitial:    { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.white },
  personalInfo:             { flex: 1 },
  personalName:             { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  personalCref:             { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  personalTags:             { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['1'], marginTop: spacing['2'] },
  personalTag:              { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.surfaceHigh, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 3 },
  personalTagText:          { fontFamily: typography.family.regular, fontSize: 10, color: colors.textSecondary },
  linkedBadge:              { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${colors.success}20`, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: spacing['1'] },
  linkedBadgeText:          { fontFamily: typography.family.medium, fontSize: typography.size.xs, color: colors.success },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['3'], marginBottom: spacing['1'] },
  metricCard:  { width: '47%', backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], alignItems: 'center', gap: spacing['2'], ...shadows.sm },
  metricValue: { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.textPrimary },
  metricLabel: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },
  imcLabel:    { fontFamily: typography.family.medium, fontSize: typography.size.xs, textAlign: 'center', marginBottom: spacing['2'] },

  progressBadge:     { backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 2 },
  progressBadgeText: { fontFamily: typography.family.bold, fontSize: typography.size.xs, color: colors.white },

  emptyWorkout:     { alignItems: 'center', gap: spacing['2'], paddingVertical: spacing['6'], backgroundColor: colors.surface, borderRadius: radii.xl, ...shadows.sm },
  emptyWorkoutText: { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textSecondary },
  emptyWorkoutSub:  { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textDisabled, textAlign: 'center', paddingHorizontal: spacing['4'] },

  progressBar:  { height: 6, backgroundColor: colors.surfaceHigh, borderRadius: radii.full, overflow: 'hidden', marginBottom: spacing['1'] },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radii.full },
  progressText: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, textAlign: 'right', marginBottom: spacing['3'] },

  workoutCard:     { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], ...shadows.sm },
  workoutCardOpen: { borderWidth: 1.5, borderColor: `${colors.primary}40` },
  workoutHeader:   { flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },
  workoutIconBox:  { width: 40, height: 40, borderRadius: radii.lg, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  workoutInfo:     { flex: 1 },
  workoutName:     { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  workoutBy:       { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  workoutMeta:     { alignItems: 'flex-end', gap: 4 },
  workoutMetaText: { fontFamily: typography.family.bold, fontSize: typography.size.xs, color: colors.primary },

  progressBarSm:  { height: 4, backgroundColor: colors.surfaceHigh, borderRadius: radii.full, overflow: 'hidden', marginTop: spacing['2'] },
  progressFillSm: { height: '100%', backgroundColor: colors.primary, borderRadius: radii.full },

  exerciseList:    { marginTop: spacing['3'], gap: 0 },
  exerciseRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing['3'], paddingVertical: spacing['3'] },
  exerciseDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  exerciseInfo:    { flex: 1 },
  exerciseName:    { fontFamily: typography.family.medium, fontSize: typography.size.md, color: colors.textPrimary },
  exerciseDone:    { textDecorationLine: 'line-through', color: colors.textDisabled },
  exerciseSets:    { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },

  notesBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['2'], backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'], marginBottom: spacing['2'] },
  notesText: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, flex: 1 },

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['6'], paddingVertical: spacing['4'], borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  sheetBody:   { padding: spacing['6'], gap: spacing['4'], paddingBottom: spacing['10'] },
  inputGroup:  { gap: spacing['2'] },
  inputLabel:  { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  input:       { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 52, paddingHorizontal: spacing['4'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  inputSmall:  { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 48, paddingHorizontal: spacing['3'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary, textAlign: 'center' },
  imcPreview:  { flexDirection: 'row', alignItems: 'center', gap: spacing['2'], backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'] },
  imcPreviewText: { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, flex: 1 },
  saveBtn:     { backgroundColor: colors.primary, borderRadius: radii.lg, height: 52, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },

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

  menuOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  menuBox:            { position: 'absolute', top: 90, right: spacing['5'], backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, ...shadows.md, minWidth: 160 },
  menuItem:           { flexDirection: 'row', alignItems: 'center', gap: spacing['3'], paddingVertical: spacing['4'], paddingHorizontal: spacing['4'] },
  menuItemTextDanger: { fontFamily: typography.family.medium, fontSize: typography.size.md, color: colors.error },
})
import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, Modal, Alert,
  ActivityIndicator, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { useFocusEffect } from '@react-navigation/native'
import { Audio } from 'expo-av'
import { useAuth }        from '../../contexts/AuthContext'
import { apiRequest }     from '../../services/api'
import { userService }    from '../../services/user.service'
import { workoutService } from '../../services/workout.service'
import { sessionService } from '../../services/session.service'
import type { StudentProfile } from '../../services/user.service'
import type { Workout, Exercise } from '../../services/workout.service'
import { WorkoutFormModal }    from '../../components/ui/WorkoutFormModal'
import { WorkoutSessionModal } from '../../components/ui/WorkoutSessionModal'
import type { WorkoutPayload } from '../../components/ui/WorkoutFormModal'
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

const restTimeToSeconds = (restTime: string | undefined): number => {
  if (!restTime) return 0
  const parts = restTime.split(':')
  const mins  = parseInt(parts[0] ?? '0', 10)
  const secs  = parseInt(parts[1] ?? '0', 10)
  return mins * 60 + secs
}

const formatCountdown = (secs: number): string => {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const formatLoad = (load: string): string => {
  if (!load.trim()) return ''
  return /^\d+(\.\d+)?$/.test(load.trim()) ? `${load.trim()}kg` : load.trim()
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

interface LinkedPersonal {
  id:     string
  name:   string
  avatar: string | null
  city:   string | null
  state:  string | null
  personalProfile: { cref: string; classFormat: string } | null
}

const FORMAT_LABEL: Record<string, string> = {
  presential: 'Presencial',
  online:     'Online',
  hybrid:     'Híbrido',
}

// Parse drop sets
interface DropSetEntry { reps: string; load: string }
const parseDropSets = (dropSets?: string): DropSetEntry[] => {
  if (!dropSets) return []
  try { return JSON.parse(dropSets) } catch { return [] }
}

// Cronômetro de descanso com beep
function RestButton({ restTime, enabled }: { restTime: string | undefined; enabled: boolean }) {
  const totalSecs = restTimeToSeconds(restTime)
  const [countdown, setCountdown] = useState(0)
  const [running,   setRunning]   = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const playBeep = async () => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true })
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
        { shouldPlay: true, volume: 1.0 },
      )
      sound.setOnPlaybackStatusUpdate(status => {
        if ('didJustFinish' in status && status.didJustFinish) sound.unloadAsync()
      })
    } catch { /* silencia */ }
  }

  const start = () => {
    if (!enabled) {
      Alert.alert('Atenção', 'Inicie o treino primeiro para usar o cronômetro de descanso.')
      return
    }
    if (totalSecs === 0) return
    if (running) {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      setRunning(false)
      setCountdown(0)
      return
    }
    setCountdown(totalSecs)
    setRunning(true)
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          setRunning(false)
          playBeep()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  if (!restTime || totalSecs === 0) return null
  return (
    <TouchableOpacity
      style={[s.restBtn, running && s.restBtnRunning, !enabled && s.restBtnDisabled]}
      onPress={start}
      activeOpacity={0.8}
    >
      <Ionicons
        name={running ? 'pause-circle-outline' : 'timer-outline'}
        size={13}
        color={!enabled ? colors.textDisabled : running ? colors.white : colors.primary}
      />
      <Text style={[s.restBtnText, running && s.restBtnTextRunning, !enabled && s.restBtnTextDisabled]}>
        {running ? formatCountdown(countdown) : formatCountdown(totalSecs)}
      </Text>
    </TouchableOpacity>
  )
}

export function StudentHomeScreen() {
  const { user, signOut } = useAuth()
  const firstName = user?.name?.split(' ')[0] ?? 'Aluno'
  const avatarUrl = user?.avatar ? `${getBaseUrl()}${user.avatar}` : null
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  const [profile,        setProfile]        = useState<StudentProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [metricsModal,   setMetricsModal]   = useState(false)
  const [weightInput,    setWeightInput]    = useState('')
  const [heightInput,    setHeightInput]    = useState('')
  const [savingMetrics,  setSavingMetrics]  = useState(false)
  const [personal,       setPersonal]       = useState<LinkedPersonal | null>(null)
  const [todayWorkouts,  setTodayWorkouts]  = useState<Workout[]>([])
  const [loadingWorkout, setLoadingWorkout] = useState(true)
  const [doneExercises,  setDoneExercises]  = useState<Set<string>>(new Set())
  const [expandedWorkout,setExpandedWorkout]= useState<string | null>(null)

  // Controla quais exercícios estão expandidos (mostram séries)
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set())

  // Séries marcadas: chave = `${exerciseId}-${serieIndex}`
  const [doneSeries, setDoneSeries] = useState<Set<string>>(new Set())

  const [menuVisible,    setMenuVisible]    = useState(false)
  const [workoutModal,   setWorkoutModal]   = useState(false)
  const [activeSessionId,        setActiveSessionId]        = useState<string | null>(null)
  const [activeSessionWorkoutId, setActiveSessionWorkoutId] = useState<string | null>(null)
  const [sessionModal,   setSessionModal]   = useState(false)
  const [sessionWorkout, setSessionWorkout] = useState<{ id: string; name: string } | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [profileData, workoutsData, activeSession] = await Promise.all([
        apiRequest<{ studentProfile: StudentProfile; personalId?: string; personal?: LinkedPersonal }>(
          '/auth/me/profile', { authenticated: true }
        ),
        workoutService.myWorkouts(),
        sessionService.getActive().catch(() => null),
      ])
      setProfile(profileData.studentProfile)
      setPersonal(profileData.personal ?? null)
      setTodayWorkouts(workoutsData.filter(w => w.days.includes(TODAY_KEY) && w.active))
      setActiveSessionWorkoutId(activeSession?.workoutId ?? null)
      setActiveSessionId(activeSession?.id ?? null)
      setExpandedWorkout(null)
      setExpandedExercises(new Set())
      setDoneSeries(new Set())

      const todayList = workoutsData.filter(w => w.days.includes(TODAY_KEY) && w.active)
      if (todayList.length > 0) {
        const allDone = await Promise.all(
          todayList.map(w => sessionService.getTodayDone(w.id).catch(() => []))
        )
        const merged = new Set(allDone.flat())
        setDoneExercises(merged)
      } else {
        setDoneExercises(new Set())
      }
    } catch {
      // silencia
    } finally {
      setLoadingProfile(false)
      setLoadingWorkout(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { loadData() }, [loadData]))

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

  const totalExercises = todayWorkouts.reduce((acc, w) => acc + w.exercises.length, 0)
  const doneCount      = doneExercises.size
  const totalProgress  = totalExercises > 0 ? doneCount / totalExercises : 0

  const toggleExercise = async (id: string) => {
    setDoneExercises(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
    const sessionId = activeSessionId
    if (sessionId) {
      try {
        await sessionService.toggleExerciseDone(sessionId, id)
      } catch {
        setDoneExercises(prev => {
          const n = new Set(prev)
          n.has(id) ? n.delete(id) : n.add(id)
          return n
        })
      }
    }
  }

  // Toggle exercício expandido (mostra séries)
  const toggleExpandExercise = (exId: string) => {
    setExpandedExercises(prev => {
      const n = new Set(prev)
      n.has(exId) ? n.delete(exId) : n.add(exId)
      return n
    })
  }

  // Toggle série individual
  const toggleSerie = (exId: string, serieIdx: number, totalSeries: number) => {
    const key = `${exId}-${serieIdx}`
    setDoneSeries(prev => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)

      // Se todas as séries do exercício estão marcadas, marca o exercício como done
      const allDone = Array.from({ length: totalSeries }, (_, i) =>
        i === serieIdx ? !prev.has(key) : n.has(`${exId}-${i}`)
      ).every(Boolean)

      if (allDone && !doneExercises.has(exId)) {
        toggleExercise(exId)
      } else if (!allDone && doneExercises.has(exId)) {
        toggleExercise(exId)
      }

      return n
    })
  }

  const toggleWorkout = (id: string) =>
    setExpandedWorkout(prev => prev === id ? null : id)

  const handleSaveWorkout = async (payload: WorkoutPayload) => {
    await workoutService.create({ studentId: user!.id, ...payload })
    Alert.alert('Sucesso', 'Treino criado!')
    setWorkoutModal(false)
    loadData()
  }

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut() },
    ])
    setMenuVisible(false)
  }

  // Renderiza as séries de um exercício expandido
  const renderSeries = (ex: Exercise, workoutId: string) => {
    const exId    = ex.id ?? ex.name
    const enabled = activeSessionWorkoutId === workoutId
    const isDrop  = ex.isDrop ?? false

    if (isDrop) {
      // ── Drop set: cada série tem reps e carga diferentes
      const entries = parseDropSets(ex.dropSets)
      if (entries.length === 0) return null

      return (
        <View style={s.seriesContainer}>
          <View style={s.dropSetBanner}>
            <Ionicons name="trending-down-outline" size={12} color={colors.warning} />
            <Text style={s.dropSetBannerText}>Drop Set — {entries.length} séries</Text>
          </View>
          {entries.map((entry, di) => {
            const key  = `${exId}-${di}`
            const done = doneSeries.has(key)
            return (
              <TouchableOpacity
                key={di}
                style={[s.serieRow, done && s.serieRowDone]}
                onPress={() => toggleSerie(exId, di, entries.length)}
                activeOpacity={0.7}
              >
                <View style={[s.serieBadge, done && s.serieBadgeDone]}>
                  {done
                    ? <Ionicons name="checkmark" size={12} color={colors.white} />
                    : <Text style={s.serieBadgeText}>S{di + 1}</Text>
                  }
                </View>
                <View style={s.serieInfo}>
                  <Text style={[s.serieReps, done && s.serieTextDone]}>
                    {entry.reps || '—'} reps
                  </Text>
                  {entry.load ? (
                    <View style={s.serieLoadChip}>
                      <Ionicons name="barbell-outline" size={10} color={colors.textSecondary} />
                      <Text style={s.serieLoadText}>{formatLoad(entry.load)}</Text>
                    </View>
                  ) : null}
                </View>
                {done && (
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      )
    }

    // ── Exercício normal: N séries iguais
    const totalSeries = parseInt(ex.sets) || 1
    return (
      <View style={s.seriesContainer}>
        {Array.from({ length: totalSeries }, (_, si) => {
          const key  = `${exId}-${si}`
          const done = doneSeries.has(key)
          return (
            <TouchableOpacity
              key={si}
              style={[s.serieRow, done && s.serieRowDone]}
              onPress={() => toggleSerie(exId, si, totalSeries)}
              activeOpacity={0.7}
            >
              <View style={[s.serieBadge, done && s.serieBadgeDone]}>
                {done
                  ? <Ionicons name="checkmark" size={12} color={colors.white} />
                  : <Text style={s.serieBadgeText}>S{si + 1}</Text>
                }
              </View>
              <View style={s.serieInfo}>
                <Text style={[s.serieReps, done && s.serieTextDone]}>
                  {ex.reps || '—'} reps
                </Text>
                {ex.load ? (
                  <View style={s.serieLoadChip}>
                    <Ionicons name="barbell-outline" size={10} color={colors.textSecondary} />
                    <Text style={s.serieLoadText}>{formatLoad(ex.load)}</Text>
                  </View>
                ) : null}
              </View>
              {done && (
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    )
  }

  const renderExerciseItem = (
    ex: Exercise,
    key: string | number,
    index: number,
    total: number,
    workoutId: string,
    labelPrefix?: string,
  ) => {
    const exId      = ex.id ?? String(index)
    const done      = doneExercises.has(exId)
    const enabled   = activeSessionWorkoutId === workoutId
    const isLast    = index === total - 1
    const isExpanded = expandedExercises.has(exId)
    const isDrop    = ex.isDrop ?? false

    // Conta séries feitas
    const totalSeries = isDrop
      ? parseDropSets(ex.dropSets).length
      : (parseInt(ex.sets) || 1)
    const doneSeriesCount = Array.from({ length: totalSeries }, (_, i) =>
      doneSeries.has(`${exId}-${i}`)
    ).filter(Boolean).length

    return (
      <View key={key}>
        <View style={[s.exerciseRow, !isLast && !isExpanded && s.exerciseDivider]}>
          {/* Checkbox do exercício */}
          <TouchableOpacity onPress={() => toggleExercise(exId)} activeOpacity={0.7}>
            <Ionicons
              name={done ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={done ? colors.success : colors.border}
            />
          </TouchableOpacity>

          <View style={s.exerciseInfo}>
            <Text style={[s.exerciseName, done && s.exerciseDone]}>
              {labelPrefix ? `${labelPrefix}  ` : ''}{ex.name}
            </Text>
            <View style={s.exerciseMeta}>
              {ex.type !== 'cardio' && !isDrop && (
                <Text style={s.exerciseMetaText}>{ex.sets} × {ex.reps}</Text>
              )}
              {ex.type !== 'cardio' && isDrop && (
                <View style={s.metaChip}>
                  <Ionicons name="trending-down-outline" size={10} color={colors.warning} />
                  <Text style={[s.exerciseMetaText, { color: colors.warning }]}>
                    Drop · {ex.sets} séries
                  </Text>
                </View>
              )}
              {ex.type === 'cardio' && ex.duration && (
                <View style={s.metaChip}>
                  <Ionicons name="bicycle" size={10} color={colors.info} />
                  <Text style={[s.exerciseMetaText, { color: colors.info }]}>{ex.duration}</Text>
                </View>
              )}
              {ex.load && !isDrop ? (
                <View style={s.metaChip}>
                  <Ionicons name="barbell-outline" size={10} color={colors.textSecondary} />
                  <Text style={s.exerciseMetaText}>{formatLoad(ex.load)}</Text>
                </View>
              ) : null}
              {/* Progresso de séries */}
              {ex.type !== 'cardio' && doneSeriesCount > 0 && (
                <View style={s.metaChip}>
                  <Ionicons name="checkmark-circle" size={10} color={colors.success} />
                  <Text style={[s.exerciseMetaText, { color: colors.success }]}>
                    {doneSeriesCount}/{totalSeries}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={s.exerciseActions}>
            {ex.type !== 'cardio' && (
              <RestButton restTime={ex.restTime} enabled={enabled} />
            )}
            {/* Botão expandir séries */}
            {ex.type !== 'cardio' && (
              <TouchableOpacity
                style={s.expandSeriesBtn}
                onPress={() => toggleExpandExercise(exId)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Séries expandidas */}
        {isExpanded && ex.type !== 'cardio' && renderSeries(ex, workoutId)}
      </View>
    )
  }

  const renderExercises = (workout: Workout) => {
    const items    = workout.exercises
    const rendered: React.ReactNode[] = []
    let i = 0

    while (i < items.length) {
      const ex = items[i]

      if (ex.type === 'cardio') {
        rendered.push(renderExerciseItem(ex, `cardio-${ex.id ?? i}`, i, items.length, workout.id))
        i++; continue
      }

      if (ex.groupId) {
        const groupId    = ex.groupId
        const groupLabel = ex.groupLabel ?? 'Grupo'
        const groupItems: typeof items = []
        while (i < items.length && items[i].groupId === groupId) { groupItems.push(items[i]); i++ }
        rendered.push(
          <View key={`group-${groupId}`} style={s.groupBlock}>
            <View style={s.groupBlockHeader}>
              <Ionicons name="git-merge-outline" size={12} color={colors.primary} />
              <Text style={s.groupBlockLabel}>{groupLabel}</Text>
            </View>
            {groupItems.map((gEx, gi) =>
              renderExerciseItem(gEx, gEx.id ?? gi, gi, groupItems.length, workout.id, String.fromCharCode(65 + gi))
            )}
          </View>
        )
        continue
      }

      rendered.push(renderExerciseItem(ex, ex.id ?? i, i, items.length, workout.id))
      i++
    }

    return rendered
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
              : <View style={s.avatarPlaceholder}><Text style={s.avatarInitial}>{firstName.charAt(0).toUpperCase()}</Text></View>
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
            {profile && <Text style={[s.imcLabel, { color: imcData.color }]}>{imcData.label}</Text>}
          </>
        )}

        {/* Card personal */}
        {personal && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Meu Personal</Text>
            </View>
            <View style={s.personalCard}>
              {personal.avatar
                ? <Image source={{ uri: `${getBaseUrl()}${personal.avatar}` }} style={s.personalAvatar} />
                : <View style={s.personalAvatarPlaceholder}><Text style={s.personalAvatarInitial}>{personal.name.charAt(0).toUpperCase()}</Text></View>
              }
              <View style={s.personalInfo}>
                <Text style={s.personalName}>{personal.name}</Text>
                {personal.personalProfile?.cref && <Text style={s.personalCref}>CREF: {personal.personalProfile.cref}</Text>}
                <View style={s.personalTags}>
                  {personal.personalProfile?.classFormat && (
                    <View style={s.personalTag}>
                      <Ionicons name="location-outline" size={11} color={colors.primary} />
                      <Text style={s.personalTagText}>{FORMAT_LABEL[personal.personalProfile.classFormat] ?? personal.personalProfile.classFormat}</Text>
                    </View>
                  )}
                  {(personal.city || personal.state) && (
                    <View style={s.personalTag}>
                      <Ionicons name="map-outline" size={11} color={colors.textSecondary} />
                      <Text style={s.personalTagText}>{[personal.city, personal.state].filter(Boolean).join(' - ')}</Text>
                    </View>
                  )}
                </View>
              </View>
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
            <TouchableOpacity style={s.createBtn} onPress={() => setWorkoutModal(true)} activeOpacity={0.8}>
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
            <Text style={s.emptyWorkoutSub}>Crie um treino ou aguarde seu personal para {DAY_LABELS[TODAY_KEY] ?? 'hoje'}</Text>
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
              const isActive   = activeSessionWorkoutId === workout.id

              return (
                <View key={workout.id} style={[s.workoutCard, isOpen && s.workoutCardOpen, isActive && s.workoutCardActive]}>
                  {isActive && (
                    <View style={s.activeBadge}>
                      <View style={s.activeDot} />
                      <Text style={s.activeBadgeText}>Em andamento</Text>
                    </View>
                  )}

                  <View style={s.workoutCardTop}>
                    <TouchableOpacity style={s.workoutHeader} onPress={() => toggleWorkout(workout.id)} activeOpacity={0.8}>
                      <View style={s.workoutIconBox}>
                        <Ionicons name="barbell" size={20} color={isActive ? colors.success : colors.primary} />
                      </View>
                      <View style={s.workoutInfo}>
                        <Text style={s.workoutName}>{workout.name}</Text>
                        {workout.personal ? (
                          <Text style={s.workoutBy}>Por: {workout.personal.name}{workout.personal.personalProfile?.cref ? ` · ${workout.personal.personalProfile.cref}` : ''}</Text>
                        ) : (
                          <Text style={[s.workoutBy, { color: colors.primary }]}>Treino próprio</Text>
                        )}
                      </View>
                      <View style={s.workoutMeta}>
                        <Text style={s.workoutMetaText}>{wDoneCount}/{wTotal}</Text>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[s.checkinBtn, isActive && s.checkinBtnActive]}
                      onPress={() => { setSessionWorkout({ id: workout.id, name: workout.name }); setSessionModal(true) }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={isActive ? 'timer-outline' : 'play-circle'} size={15} color={colors.white} />
                      <Text style={s.checkinBtnText}>{isActive ? 'Ver' : 'Iniciar'}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={s.progressBarSm}>
                    <View style={[
                      s.progressFillSm,
                      { width: `${wProgress * 100}%` as any, backgroundColor: isActive ? colors.success : colors.primary },
                    ]} />
                  </View>

                  {isOpen && (
                    <View style={s.exerciseList}>
                      {workout.notes && (
                        <View style={s.notesBox}>
                          <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
                          <Text style={s.notesText}>{workout.notes}</Text>
                        </View>
                      )}
                      {!isActive && workout.exercises.some(e => e.restTime) && (
                        <View style={s.restHint}>
                          <Ionicons name="information-circle-outline" size={13} color={colors.textDisabled} />
                          <Text style={s.restHintText}>Inicie o treino para usar o cronômetro de descanso</Text>
                        </View>
                      )}
                      {renderExercises(workout)}
                    </View>
                  )}
                </View>
              )
            })}
          </>
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

      <WorkoutFormModal visible={workoutModal} onClose={() => setWorkoutModal(false)} onSave={handleSaveWorkout} />

      {sessionWorkout && (
        <WorkoutSessionModal
          visible={sessionModal}
          workoutId={sessionWorkout.id}
          workoutName={sessionWorkout.name}
          onClose={() => setSessionModal(false)}
          onCheckinDone={(sessionId) => {  
            setActiveSessionWorkoutId(sessionWorkout.id)
            setActiveSessionId(sessionId)
          }}
          onFinished={() => {
            setSessionModal(false)
            setActiveSessionWorkoutId(null)
            setActiveSessionId(null)
            loadData()
          }}
        />
      )}

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
  editBtn:        { flexDirection: 'row', alignItems: 'center', gap: spacing['1'] },
  editBtnText:    { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.primary },
  createBtn:      { flexDirection: 'row', alignItems: 'center', gap: spacing['1'], backgroundColor: colors.primary, borderRadius: radii.lg, paddingHorizontal: spacing['3'], paddingVertical: spacing['2'] },
  createBtnText:  { fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.white },

  personalCard:              { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], gap: spacing['3'], borderWidth: 1.5, borderColor: `${colors.success}30`, ...shadows.sm },
  personalAvatar:            { width: 52, height: 52, borderRadius: radii.full, borderWidth: 2, borderColor: colors.success },
  personalAvatarPlaceholder: { width: 52, height: 52, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.success },
  personalAvatarInitial:     { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.white },
  personalInfo:              { flex: 1 },
  personalName:              { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  personalCref:              { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  personalTags:              { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['1'], marginTop: spacing['2'] },
  personalTag:               { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.surfaceHigh, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 3 },
  personalTagText:           { fontFamily: typography.family.regular, fontSize: 10, color: colors.textSecondary },
  linkedBadge:               { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${colors.success}20`, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: spacing['1'] },
  linkedBadgeText:           { fontFamily: typography.family.medium, fontSize: typography.size.xs, color: colors.success },

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

  workoutCard:       { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], ...shadows.sm },
  workoutCardOpen:   { borderWidth: 1.5, borderColor: `${colors.primary}40` },
  workoutCardActive: { borderWidth: 1.5, borderColor: `${colors.success}50` },
  workoutCardTop:    { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  workoutHeader:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing['3'] },
  workoutIconBox:    { width: 40, height: 40, borderRadius: radii.lg, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  workoutInfo:       { flex: 1 },
  workoutName:       { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  workoutBy:         { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  workoutMeta:       { alignItems: 'flex-end', gap: 4 },
  workoutMetaText:   { fontFamily: typography.family.bold, fontSize: typography.size.xs, color: colors.primary },

  activeBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: `${colors.success}15`, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 2, marginBottom: spacing['1'] },
  activeDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  activeBadgeText: { fontFamily: typography.family.medium, fontSize: 10, color: colors.success },

  checkinBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.success, borderRadius: radii.lg, paddingHorizontal: spacing['2'], paddingVertical: spacing['1'] },
  checkinBtnActive: { backgroundColor: colors.primary },
  checkinBtnText:   { fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.white },

  progressBarSm:  { height: 4, backgroundColor: colors.surfaceHigh, borderRadius: radii.full, overflow: 'hidden', marginTop: spacing['2'] },
  progressFillSm: { height: '100%', borderRadius: radii.full },

  exerciseList:    { marginTop: spacing['3'], gap: 0 },
  exerciseRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing['2'], paddingVertical: spacing['3'] },
  exerciseDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  exerciseInfo:    { flex: 1 },
  exerciseName:    { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textPrimary },
  exerciseDone:    { textDecorationLine: 'line-through', color: colors.textDisabled },
  exerciseMeta:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing['1'], marginTop: 2 },
  exerciseMetaText:{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },
  metaChip:        { flexDirection: 'row', alignItems: 'center', gap: 2 },

  // Ações do exercício (rest + expand)
  exerciseActions:  { flexDirection: 'row', alignItems: 'center', gap: spacing['1'] },
  expandSeriesBtn:  { width: 28, height: 28, borderRadius: radii.md, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },

  // Séries
  seriesContainer: { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, marginBottom: spacing['2'], overflow: 'hidden' },
  serieRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing['2'], paddingVertical: spacing['2'], paddingHorizontal: spacing['3'], borderBottomWidth: 1, borderBottomColor: colors.divider },
  serieRowDone:    { backgroundColor: `${colors.success}08` },
  serieBadge:      { width: 26, height: 26, borderRadius: radii.md, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  serieBadgeDone:  { backgroundColor: colors.success },
  serieBadgeText:  { fontFamily: typography.family.bold, fontSize: 10, color: colors.textSecondary },
  serieInfo:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  serieReps:       { fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.textPrimary },
  serieTextDone:   { color: colors.textDisabled, textDecorationLine: 'line-through' },
  serieLoadChip:   { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.surface, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 2 },
  serieLoadText:   { fontFamily: typography.family.regular, fontSize: 10, color: colors.textSecondary },

  // Drop set banner
  dropSetBanner:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing['3'], paddingVertical: spacing['2'], backgroundColor: `${colors.warning}15`, borderBottomWidth: 1, borderBottomColor: `${colors.warning}20` },
  dropSetBannerText: { fontFamily: typography.family.semiBold, fontSize: 10, color: colors.warning },

  restBtn:             { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${colors.primary}15`, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 4, minWidth: 60 },
  restBtnRunning:      { backgroundColor: colors.primary },
  restBtnDisabled:     { backgroundColor: colors.surfaceHigh },
  restBtnText:         { fontFamily: typography.family.bold, fontSize: 10, color: colors.primary },
  restBtnTextRunning:  { color: colors.white },
  restBtnTextDisabled: { color: colors.textDisabled },

  restHint:     { flexDirection: 'row', alignItems: 'center', gap: spacing['1'], backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['2'], marginBottom: spacing['2'] },
  restHintText: { fontFamily: typography.family.regular, fontSize: 10, color: colors.textDisabled, flex: 1 },

  notesBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['2'], backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'], marginBottom: spacing['2'] },
  notesText: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, flex: 1 },

  groupBlock:       { borderRadius: radii.lg, marginBottom: spacing['2'], overflow: 'hidden', borderWidth: 1, borderColor: `${colors.primary}20` },
  groupBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing['3'], paddingVertical: spacing['1'], backgroundColor: `${colors.primary}10` },
  groupBlockLabel:  { fontFamily: typography.family.bold, fontSize: 10, color: colors.primary },

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['6'], paddingVertical: spacing['4'], borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  sheetBody:   { padding: spacing['6'], gap: spacing['4'], paddingBottom: spacing['10'] },
  inputGroup:  { gap: spacing['2'] },
  inputLabel:  { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  input:       { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 52, paddingHorizontal: spacing['4'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  imcPreview:  { flexDirection: 'row', alignItems: 'center', gap: spacing['2'], backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'] },
  imcPreviewText: { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, flex: 1 },
  saveBtn:     { backgroundColor: colors.primary, borderRadius: radii.lg, height: 52, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },

  menuOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  menuBox:            { position: 'absolute', top: 90, right: spacing['5'], backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, ...shadows.md, minWidth: 160 },
  menuItem:           { flexDirection: 'row', alignItems: 'center', gap: spacing['3'], paddingVertical: spacing['4'], paddingHorizontal: spacing['4'] },
  menuItemTextDanger: { fontFamily: typography.family.medium, fontSize: typography.size.md, color: colors.error },
})
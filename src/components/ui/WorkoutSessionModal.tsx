import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as Location  from 'expo-location'
import * as Notifications from 'expo-notifications'
import { sessionService } from '../../services/session.service'
import type { WorkoutSession } from '../../services/session.service'
import { colors, typography, spacing, radii } from '../../theme'

// Configurar notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:   true,
    shouldPlaySound:   false,
    shouldSetBadge:    false,
    shouldShowBanner:  true,
    shouldShowList:    true,
  }),
})

interface Props {
  visible:    boolean
  workoutId:  string
  workoutName:string
  onClose:    () => void
  onFinished: () => void
}

type Phase = 'checkin' | 'running' | 'checkout'

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export function WorkoutSessionModal({ visible, workoutId, workoutName, onClose, onFinished }: Props) {
  const [phase,    setPhase]    = useState<Phase>('checkin')
  const [session,  setSession]  = useState<WorkoutSession | null>(null)
  const [elapsed,  setElapsed]  = useState(0)
  const [loading,  setLoading]  = useState(false)

  // Campos do form
  const [caption,   setCaption]   = useState('')
  const [notes,     setNotes]     = useState('')
  const [location,  setLocation]  = useState('')
  const [photoUri,  setPhotoUri]  = useState<string | null>(null)
  const [loadingLoc,setLoadingLoc]= useState(false)

  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const notifIdRef   = useRef<string | null>(null)

  // Verifica sessão ativa ao abrir
  useEffect(() => {
    if (!visible) return
    ;(async () => {
      try {
        const active = await sessionService.getActive()
        if (active && active.workoutId === workoutId) {
          setSession(active)
          const elapsed = Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000)
          setElapsed(elapsed)
          setPhase('running')
          startTimer(elapsed)
        } else {
          setPhase('checkin')
          resetForm()
        }
      } catch {
        setPhase('checkin')
      }
    })()
  }, [visible])

  // Limpa timer ao fechar
  useEffect(() => {
    if (!visible) {
      stopTimer()
    }
  }, [visible])

  const startTimer = (initial = 0) => {
    setElapsed(initial)
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1
        updateNotification(next)
        return next
      })
    }, 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    cancelNotification()
  }

  // Notificação persistente com cronômetro
  const scheduleNotification = async (workoutName: string) => {
    const { status } = await Notifications.requestPermissionsAsync()
    if (status !== 'granted') return

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🏋️ ${workoutName}`,
        body:  'Treino em andamento — 00:00',
        sticky: true,
        data:  { type: 'workout_session' },
      },
      trigger: null,
    })
    notifIdRef.current = id
  }

  const updateNotification = async (seconds: number) => {
    if (!notifIdRef.current) return
    await Notifications.scheduleNotificationAsync({
      identifier: notifIdRef.current,
      content: {
        title: `🏋️ ${workoutName}`,
        body:  `Treino em andamento — ${formatTime(seconds)}`,
        sticky: true,
        data:  { type: 'workout_session' },
      },
      trigger: null,
    })
  }

  const cancelNotification = async () => {
    if (notifIdRef.current) {
      await Notifications.dismissNotificationAsync(notifIdRef.current)
      notifIdRef.current = null
    }
  }

  const resetForm = () => {
    setCaption(''); setNotes(''); setLocation(''); setPhotoUri(null)
  }

  // localização
  const handleGetLocation = async () => {
    try {
      setLoadingLoc(true)
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Habilite a localização nas configurações.')
        return
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const [addr] = await Location.reverseGeocodeAsync(loc.coords)
      const label = [addr.street, addr.district, addr.city, addr.region]
        .filter(Boolean).join(', ')
      setLocation(label)
    } catch {
      Alert.alert('Erro', 'Não foi possível obter a localização.')
    } finally {
      setLoadingLoc(false)
    }
  }

  // foto
  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Habilite a câmera nas configurações.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality:    0.7,
      base64:     false,
    })
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  // Checkin
  const handleCheckin = async () => {
    if (!caption.trim()) { Alert.alert('Atenção', 'Informe uma legenda.'); return }
    try {
      setLoading(true)
      const s = await sessionService.checkin({
        workoutId,
        caption: caption.trim(),
        notes:   notes.trim() || undefined,
        location: location || undefined,
        photoStart: photoUri ?? undefined,
      })
      setSession(s)
      setPhase('running')
      resetForm()
      startTimer()
      await scheduleNotification(workoutName)
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível iniciar o treino.')
    } finally {
      setLoading(false)
    }
  }

  // Checkout
  const handleCheckout = async () => {
    if (!caption.trim()) { Alert.alert('Atenção', 'Informe uma legenda.'); return }
    if (!session) return
    try {
      setLoading(true)
      await sessionService.checkout(session.id, {
        caption:  caption.trim(),
        notes:    notes.trim() || undefined,
        location: location || undefined,
        photoEnd: photoUri ?? undefined,
      })
      stopTimer()
      onFinished()
      onClose()
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível finalizar o treino.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (phase === 'running') {
      Alert.alert(
        'Treino em andamento',
        'Deseja sair? O cronômetro continuará rodando.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sair', onPress: onClose },
        ],
      )
      return
    }
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={handleClose} />
      <View style={s.sheet}>
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>
            {phase === 'checkin'  ? 'Iniciar Treino'    :
             phase === 'running'  ? 'Treino em Andamento':
                                    'Finalizar Treino'}
          </Text>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Cronômetro — fase running */}
          {phase === 'running' && (
            <View style={s.timerSection}>
              <View style={s.timerCard}>
                <Ionicons name="timer-outline" size={32} color={colors.primary} />
                <Text style={s.timerText}>{formatTime(elapsed)}</Text>
                <Text style={s.timerLabel}>{workoutName}</Text>
              </View>
              <View style={s.runningActions}>
                <TouchableOpacity
                  style={s.checkoutBtn}
                  onPress={() => { setPhase('checkout'); resetForm() }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-done-circle" size={20} color={colors.white} />
                  <Text style={s.checkoutBtnText}>Finalizar Treino</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Form checkin / checkout */}
          {phase !== 'running' && (
            <>
              {/* Foto */}
              <TouchableOpacity style={s.photoBtn} onPress={handlePickPhoto} activeOpacity={0.8}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={s.photoPreview} />
                ) : (
                  <View style={s.photoPlaceholder}>
                    <Ionicons name="camera-outline" size={28} color={colors.textSecondary} />
                    <Text style={s.photoPlaceholderText}>
                      {phase === 'checkin' ? 'Foto de início (opcional)' : 'Foto de fim (opcional)'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Legenda */}
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Legenda *</Text>
                <TextInput
                  style={s.input}
                  value={caption}
                  onChangeText={setCaption}
                  placeholder={phase === 'checkin' ? 'Ex: Dia de peito e tríceps 💪' : 'Ex: Treino concluído! 🔥'}
                  placeholderTextColor={colors.textDisabled}
                  maxLength={150}
                />
                <Text style={s.charCount}>{caption.length}/150</Text>
              </View>

              {/* Observação */}
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Observação (opcional)</Text>
                <TextInput
                  style={[s.input, { minHeight: 72, textAlignVertical: 'top' }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Ex: Aumentei a carga no supino..."
                  placeholderTextColor={colors.textDisabled}
                  multiline
                  maxLength={300}
                />
              </View>

              {/* Localização */}
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Localização (opcional)</Text>
                <View style={s.locationRow}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Ex: Academia FitGym..."
                    placeholderTextColor={colors.textDisabled}
                  />
                  <TouchableOpacity style={s.locationBtn} onPress={handleGetLocation} disabled={loadingLoc}>
                    {loadingLoc
                      ? <ActivityIndicator size="small" color={colors.primary} />
                      : <Ionicons name="location-outline" size={20} color={colors.primary} />
                    }
                  </TouchableOpacity>
                </View>
              </View>

              {/* Botão ação */}
              <TouchableOpacity
                style={[
                  phase === 'checkin' ? s.startBtn : s.finishBtn,
                  loading && { opacity: 0.6 },
                ]}
                onPress={phase === 'checkin' ? handleCheckin : handleCheckout}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Ionicons
                      name={phase === 'checkin' ? 'play-circle' : 'checkmark-done-circle'}
                      size={20}
                      color={colors.white}
                    />
                    <Text style={s.actionBtnText}>
                      {phase === 'checkin' ? 'Iniciar Treino' : 'Concluir Treino'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], maxHeight: '88%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['6'], paddingVertical: spacing['4'], borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  body:        { padding: spacing['6'], gap: spacing['4'], paddingBottom: spacing['10'] },

  // Cronômetro
  timerSection:  { gap: spacing['4'] },
  timerCard:     { backgroundColor: colors.surfaceHigh, borderRadius: radii['2xl'], padding: spacing['8'], alignItems: 'center', gap: spacing['2'], borderWidth: 1.5, borderColor: `${colors.primary}30` },
  timerText:     { fontFamily: typography.family.bold, fontSize: 48, color: colors.primary, letterSpacing: 2 },
  timerLabel:    { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  runningActions:{ gap: spacing['3'] },
  checkoutBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], backgroundColor: colors.success, borderRadius: radii.lg, height: 52 },
  checkoutBtnText:{ fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },

  // Foto
  photoBtn:         { borderRadius: radii.xl, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed' },
  photoPreview:     { width: '100%', height: 180, resizeMode: 'cover' },
  photoPlaceholder: { height: 120, alignItems: 'center', justifyContent: 'center', gap: spacing['2'] },
  photoPlaceholderText: { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textDisabled },

  // Form
  inputGroup:  { gap: spacing['1'] },
  inputLabel:  { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  input:       { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 52, paddingHorizontal: spacing['4'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  charCount:   { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textDisabled, textAlign: 'right' },

  locationRow: { flexDirection: 'row', gap: spacing['2'], alignItems: 'center' },
  locationBtn: { width: 52, height: 52, borderRadius: radii.lg, backgroundColor: colors.surfaceHigh, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },

  startBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], backgroundColor: colors.primary, borderRadius: radii.lg, height: 52 },
  finishBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], backgroundColor: colors.success, borderRadius: radii.lg, height: 52 },
  actionBtnText: { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },
})
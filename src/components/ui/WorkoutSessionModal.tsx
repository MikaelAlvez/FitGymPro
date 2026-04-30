import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native'
import { Ionicons }           from '@expo/vector-icons'
import * as ImagePicker       from 'expo-image-picker'
import * as Location          from 'expo-location'
import Constants              from 'expo-constants'
import { sessionService }     from '../../services/session.service'
import { groupService }       from '../../services/group.service'
import { uploadSessionPhoto } from '../../services/upload.service'
import type { WorkoutSession } from '../../services/session.service'
import { colors, typography, spacing, radii } from '../../theme'

const isExpoGo = Constants.appOwnership === 'expo'

interface ActiveChallenge {
  id:            string
  title:         string
  goal:          number
  myCheckins:    number
  totalCheckins: number
  endDate:       string
}

interface ActiveChallengeGroup {
  groupId:    string
  groupName:  string
  groupCode:  string
  challenges: ActiveChallenge[]
}

interface Props {
  visible:     boolean
  workoutId:   string
  workoutName: string
  onClose:     () => void
  onFinished:  () => void
  onCheckinDone?:   (sessionId: string) => void  
}

type Phase = 'checkin' | 'running' | 'checkout'

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

const formatDaysLeft = (endDate: string) => {
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
  if (diff <= 0) return 'Último dia'
  if (diff === 1) return '1 dia restante'
  return `${diff} dias restantes`
}

export function WorkoutSessionModal({ visible, workoutId, workoutName, onClose, onFinished, onCheckinDone }: Props) {
  const [phase,      setPhase]      = useState<Phase>('checkin')
  const [session,    setSession]    = useState<WorkoutSession | null>(null)
  const [elapsed,    setElapsed]    = useState(0)
  const [loading,    setLoading]    = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [caption,    setCaption]    = useState('')
  const [notes,      setNotes]      = useState('')
  const [notesEnd,   setNotesEnd]   = useState('')
  const [location,   setLocation]   = useState('')
  const [photoUri,   setPhotoUri]   = useState<string | null>(null)
  const [loadingLoc, setLoadingLoc] = useState(false)

  // Grupos com desafios ativos
  const [activeGroups,     setActiveGroups]     = useState<ActiveChallengeGroup[]>([])
  const [selectedChallenges, setSelectedChallenges] = useState<Set<string>>(new Set())
  const [loadingGroups,    setLoadingGroups]    = useState(false)

  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const notifIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!visible) return
    ;(async () => {
      try {
        const active = await sessionService.getActive()
        if (active && active.workoutId === workoutId) {
          setSession(active)
          const secs = Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000)
          setElapsed(secs)
          setPhase('running')
          startTimer(secs)
        } else {
          setPhase('checkin')
          resetForm()
        }
      } catch {
        setPhase('checkin')
        resetForm()
      }
    })()
  }, [visible])

  useEffect(() => {
    if (!visible) stopTimer()
  }, [visible])

  // Carrega grupos com desafios ativos quando fase muda para checkout
  useEffect(() => {
    if (phase !== 'checkout') return
    ;(async () => {
      setLoadingGroups(true)
      try {
        const groups = await groupService.getActiveChallenges()
        setActiveGroups(groups)
        setSelectedChallenges(new Set()) // limpa seleção ao abrir
      } catch {
        setActiveGroups([])
      } finally {
        setLoadingGroups(false)
      }
    })()
  }, [phase])

  const toggleChallenge = (challengeId: string) => {
    setSelectedChallenges(prev => {
      const next = new Set(prev)
      if (next.has(challengeId)) {
        next.delete(challengeId)
      } else {
        next.add(challengeId)
      }
      return next
    })
  }

  const startTimer = (initial = 0) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setElapsed(initial)
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1
        if (!isExpoGo) updateNotification(next)
        return next
      })
    }, 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    cancelNotification()
  }

  const scheduleNotification = async () => {
    if (isExpoGo) return
    try {
      const Notifications = await import('expo-notifications')
      const { status } = await Notifications.requestPermissionsAsync()
      if (status !== 'granted') return
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: `🏋️ ${workoutName}`, body: 'Treino em andamento — 00:00', data: { type: 'workout_session' } },
        trigger: null,
      })
      notifIdRef.current = id
    } catch { /* silencia */ }
  }

  const updateNotification = async (seconds: number) => {
    if (isExpoGo || !notifIdRef.current) return
    try {
      const Notifications = await import('expo-notifications')
      await Notifications.scheduleNotificationAsync({
        identifier: notifIdRef.current,
        content: { title: `🏋️ ${workoutName}`, body: `Treino em andamento — ${formatTime(seconds)}`, data: { type: 'workout_session' } },
        trigger: null,
      })
    } catch { /* silencia */ }
  }

  const cancelNotification = async () => {
    if (isExpoGo || !notifIdRef.current) return
    try {
      const Notifications = await import('expo-notifications')
      await Notifications.dismissNotificationAsync(notifIdRef.current)
      notifIdRef.current = null
    } catch { /* silencia */ }
  }

  const resetForm = () => {
    setCaption(''); setNotes(''); setNotesEnd(''); setLocation(''); setPhotoUri(null)
    setSelectedChallenges(new Set())
  }

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permissão negada', 'Habilite a câmera nas configurações.'); return }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 })
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri)
  }

  const handleGetLocation = async () => {
    try {
      setLoadingLoc(true)
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') { Alert.alert('Permissão negada', 'Habilite a localização nas configurações.'); return }
      const loc    = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const [addr] = await Location.reverseGeocodeAsync(loc.coords)
      setLocation([addr.street, addr.district, addr.city, addr.region].filter(Boolean).join(', '))
    } catch { Alert.alert('Erro', 'Não foi possível obter a localização.') }
    finally { setLoadingLoc(false) }
  }

  const handleCheckin = async () => {
    if (!caption.trim()) { Alert.alert('Atenção', 'Informe uma legenda.'); return }
    try {
      setLoading(true)
      let photoUrl: string | undefined
      if (photoUri) { setUploading(true); photoUrl = await uploadSessionPhoto(photoUri); setUploading(false) }
      const s = await sessionService.checkin({
        workoutId,
        caption:    caption.trim(),
        notes:      notes.trim() || undefined,
        location:   location || undefined,
        photoStart: photoUrl,
      })
      setSession(s)
      setPhase('running')
      resetForm()
      startTimer()
      await scheduleNotification()
      onCheckinDone?.(s.id) 
    } catch (err: any) {
      setUploading(false)
      Alert.alert('Erro', err?.message ?? 'Não foi possível iniciar o treino.')
    } finally { setLoading(false) }
  }

  const handleCheckout = async () => {
    if (!caption.trim()) { Alert.alert('Atenção', 'Informe uma legenda.'); return }
    if (!session) return
    try {
      setLoading(true)
      let photoUrl: string | undefined
      if (photoUri) { setUploading(true); photoUrl = await uploadSessionPhoto(photoUri); setUploading(false) }

      await sessionService.checkout(session.id, {
        caption:  caption.trim(),
        notes:    notes.trim() || undefined,
        notesEnd: notesEnd.trim() || undefined,
        location: location || undefined,
        photoEnd: photoUrl,
      })

      // Faz checkin nos desafios selecionados
      if (selectedChallenges.size > 0) {
        const checkinPromises: Promise<any>[] = []

        for (const group of activeGroups) {
          for (const challenge of group.challenges) {
            if (selectedChallenges.has(challenge.id)) {
              checkinPromises.push(
                groupService.checkin(group.groupId, challenge.id, {
                  sessionId: session.id,
                  note: `Treino: ${workoutName}`,
                }).catch(() => null) // silencia erro individual para não bloquear o checkout
              )
            }
          }
        }

        await Promise.all(checkinPromises)
      }

      stopTimer()
      onFinished()
      onClose()
    } catch (err: any) {
      setUploading(false)
      Alert.alert('Erro', err?.message ?? 'Não foi possível finalizar o treino.')
    } finally { setLoading(false) }
  }

  const handleClose = () => {
    if (phase === 'running') {
      Alert.alert('Treino em andamento', 'Deseja sair? O cronômetro continuará rodando.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', onPress: onClose },
      ])
      return
    }
    onClose()
  }

  const isProcessing = loading || uploading

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={handleClose} />
      <View style={s.sheet}>
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>
            {phase === 'checkin' ? 'Iniciar Treino' : phase === 'running' ? 'Treino em Andamento' : 'Finalizar Treino'}
          </Text>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ─── Fase running ─── */}
          {phase === 'running' && (
            <View style={s.timerSection}>
              <View style={s.timerCard}>
                <Ionicons name="timer-outline" size={32} color={colors.primary} />
                <Text style={s.timerText}>{formatTime(elapsed)}</Text>
                <Text style={s.timerLabel}>{workoutName}</Text>
              </View>
              <TouchableOpacity
                style={s.checkoutBtn}
                onPress={() => { setPhase('checkout'); resetForm() }}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-done-circle" size={20} color={colors.white} />
                <Text style={s.checkoutBtnText}>Finalizar Treino</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── Fases checkin / checkout ─── */}
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

              {uploading && (
                <View style={s.uploadingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={s.uploadingText}>Enviando foto...</Text>
                </View>
              )}

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

              {/* Observação de início */}
              {phase === 'checkin' && (
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
              )}

              {/* Observação de fim */}
              {phase === 'checkout' && (
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Observação final (opcional)</Text>
                  <TextInput
                    style={[s.input, { minHeight: 72, textAlignVertical: 'top' }]}
                    value={notesEnd}
                    onChangeText={setNotesEnd}
                    placeholder="Ex: Senti bem os músculos, ótimo treino!"
                    placeholderTextColor={colors.textDisabled}
                    multiline
                    maxLength={300}
                  />
                </View>
              )}

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

              {/* Seleção de grupos/desafios — só no checkout */}
              {phase === 'checkout' && (
                <View style={s.groupsSection}>
                  <View style={s.groupsSectionHeader}>
                    <Ionicons name="trophy-outline" size={16} color={colors.primary} />
                    <Text style={s.groupsSectionTitle}>Contabilizar em desafios</Text>
                  </View>
                  <Text style={s.groupsSectionSub}>
                    Selecione os desafios que este treino deve contar
                  </Text>

                  {loadingGroups ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['3'] }} />
                  ) : activeGroups.length === 0 ? (
                    <View style={s.noGroupsBox}>
                      <Text style={s.noGroupsText}>Nenhum desafio ativo nos seus grupos</Text>
                    </View>
                  ) : (
                    <View style={s.groupsList}>
                      {activeGroups.map(group => (
                        <View key={group.groupId} style={s.groupBlock}>
                          {/* Nome do grupo */}
                          <View style={s.groupBlockHeader}>
                            <View style={s.groupCodeDot} />
                            <Text style={s.groupBlockName}>{group.groupName}</Text>
                            <Text style={s.groupBlockCode}>{group.groupCode}</Text>
                          </View>

                          {/* Desafios do grupo */}
                          {group.challenges.map(challenge => {
                            const selected = selectedChallenges.has(challenge.id)
                            const pct      = Math.min((challenge.myCheckins / challenge.goal) * 100, 100)
                            const daysLeft = formatDaysLeft(challenge.endDate)

                            return (
                              <TouchableOpacity
                                key={challenge.id}
                                style={[s.challengeOption, selected && s.challengeOptionSelected]}
                                onPress={() => toggleChallenge(challenge.id)}
                                activeOpacity={0.8}
                              >
                                {/* Checkbox */}
                                <View style={[s.checkbox, selected && s.checkboxSelected]}>
                                  {selected && <Ionicons name="checkmark" size={14} color={colors.white} />}
                                </View>

                                <View style={s.challengeOptionInfo}>
                                  <Text style={[s.challengeOptionTitle, selected && { color: colors.primary }]}>
                                    {challenge.title}
                                  </Text>
                                  <View style={s.challengeOptionMeta}>
                                    <Text style={s.challengeOptionProgress}>
                                      {challenge.myCheckins}/{challenge.goal} treinos
                                    </Text>
                                    <Text style={s.challengeOptionDays}>{daysLeft}</Text>
                                  </View>
                                  {/* Mini barra de progresso */}
                                  <View style={s.miniProgressBar}>
                                    <View style={[s.miniProgressFill, {
                                      width: `${pct}%` as any,
                                      backgroundColor: pct >= 100 ? colors.success : selected ? colors.primary : colors.textDisabled,
                                    }]} />
                                  </View>
                                </View>
                              </TouchableOpacity>
                            )
                          })}
                        </View>
                      ))}
                    </View>
                  )}

                  {selectedChallenges.size > 0 && (
                    <View style={s.selectedSummary}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={s.selectedSummaryText}>
                        {selectedChallenges.size} desafio{selectedChallenges.size !== 1 ? 's' : ''} selecionado{selectedChallenges.size !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Botão ação */}
              <TouchableOpacity
                style={[phase === 'checkin' ? s.startBtn : s.finishBtn, isProcessing && { opacity: 0.6 }]}
                onPress={phase === 'checkin' ? handleCheckin : handleCheckout}
                disabled={isProcessing}
                activeOpacity={0.8}
              >
                {isProcessing ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Ionicons
                      name={phase === 'checkin' ? 'play-circle' : 'checkmark-done-circle'}
                      size={20}
                      color={colors.white}
                    />
                    <Text style={s.actionBtnText}>
                      {phase === 'checkin'
                        ? 'Iniciar Treino'
                        : selectedChallenges.size > 0
                          ? `Concluir + ${selectedChallenges.size} desafio${selectedChallenges.size !== 1 ? 's' : ''}`
                          : 'Concluir Treino'
                      }
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
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], maxHeight: '92%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['6'], paddingVertical: spacing['4'], borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  body:        { padding: spacing['6'], gap: spacing['4'], paddingBottom: spacing['10'] },

  timerSection:    { gap: spacing['3'] },
  timerCard: { backgroundColor: colors.surfaceHigh, borderRadius: radii['2xl'], paddingVertical: spacing['10'], paddingHorizontal: spacing['8'], alignItems: 'center', gap: spacing['3'], borderWidth: 1.5, borderColor: `${colors.primary}30` },
  timerText: { fontFamily: typography.family.bold, fontSize: 72, color: colors.primary, letterSpacing: 4 },
  timerLabel:      { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  checkoutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], backgroundColor: colors.success, borderRadius: radii.lg, height: 52 },
  checkoutBtnText: { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },

  photoBtn:             { borderRadius: radii.xl, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed' },
  photoPreview:         { width: '100%', height: 180, resizeMode: 'cover' },
  photoPlaceholder:     { height: 120, alignItems: 'center', justifyContent: 'center', gap: spacing['2'] },
  photoPlaceholderText: { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textDisabled },

  uploadingRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing['2'], justifyContent: 'center' },
  uploadingText: { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary },

  inputGroup: { gap: spacing['1'] },
  inputLabel: { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  input:      { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 52, paddingHorizontal: spacing['4'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  charCount:  { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textDisabled, textAlign: 'right' },

  locationRow: { flexDirection: 'row', gap: spacing['2'], alignItems: 'center' },
  locationBtn: { width: 52, height: 52, borderRadius: radii.lg, backgroundColor: colors.surfaceHigh, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },

  // Seção de grupos/desafios
  groupsSection:       { backgroundColor: colors.surfaceHigh, borderRadius: radii.xl, padding: spacing['4'], gap: spacing['3'], borderWidth: 1.5, borderColor: `${colors.primary}20` },
  groupsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  groupsSectionTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.textPrimary },
  groupsSectionSub:    { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: -spacing['2'] },

  noGroupsBox:  { paddingVertical: spacing['3'], alignItems: 'center' },
  noGroupsText: { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textDisabled },

  groupsList:  { gap: spacing['3'] },
  groupBlock:  { gap: spacing['2'] },
  groupBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  groupCodeDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  groupBlockName:   { fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.textPrimary, flex: 1 },
  groupBlockCode:   { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textDisabled, letterSpacing: 1 },

  challengeOption:         { flexDirection: 'row', alignItems: 'center', gap: spacing['3'], backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing['3'], borderWidth: 1.5, borderColor: colors.border },
  challengeOptionSelected: { borderColor: colors.primary, backgroundColor: `${colors.primary}08` },

  checkbox:         { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },

  challengeOptionInfo:     { flex: 1, gap: 3 },
  challengeOptionTitle:    { fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.textPrimary },
  challengeOptionMeta:     { flexDirection: 'row', justifyContent: 'space-between' },
  challengeOptionProgress: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },
  challengeOptionDays:     { fontFamily: typography.family.medium, fontSize: typography.size.xs, color: '#F59E0B' },

  miniProgressBar:  { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  miniProgressFill: { height: '100%', borderRadius: 2 },

  selectedSummary:     { flexDirection: 'row', alignItems: 'center', gap: spacing['1'], justifyContent: 'center' },
  selectedSummaryText: { fontFamily: typography.family.medium, fontSize: typography.size.xs, color: colors.success },

  startBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], backgroundColor: colors.primary, borderRadius: radii.lg, height: 52 },
  finishBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], backgroundColor: colors.success, borderRadius: radii.lg, height: 52 },
  actionBtnText: { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },
})
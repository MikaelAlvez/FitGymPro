import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, Alert,
  Modal, TextInput, ScrollView, Dimensions, StatusBar,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import Constants from 'expo-constants'
import { sessionService } from '../../services/session.service'
import type { WorkoutSession } from '../../services/session.service'
import { colors, typography, spacing, radii, shadows } from '../../theme'

const getBaseUrl = () => {
  const host = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants.manifest as any)?.debuggerHost
  if (host) return `http://${host.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}

const SCREEN_WIDTH  = Dimensions.get('window').width
const SCREEN_HEIGHT = Dimensions.get('window').height
const PHOTO_WIDTH   = SCREEN_WIDTH - spacing['5'] * 2 - spacing['4'] * 2

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

const formatTime = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

interface SessionCardProps {
  item:        WorkoutSession
  onEdit:      (s: WorkoutSession) => void
  onDelete:    (s: WorkoutSession) => void
  onOpenPhoto: (url: string, label: string) => void
}

function SessionCard({ item, onEdit, onDelete, onOpenPhoto }: SessionCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0)

  const photoStartUrl = item.photoStart ? `${getBaseUrl()}${item.photoStart}` : null
  const photoEndUrl   = item.photoEnd   ? `${getBaseUrl()}${item.photoEnd}`   : null
  const hasPhotos     = !!(photoStartUrl || photoEndUrl)
  const hasBothPhotos = !!(photoStartUrl && photoEndUrl)

  const photos: { url: string; caption: string; notes: string | null; icon: string }[] = []
  if (photoStartUrl) photos.push({
    url:     photoStartUrl,
    caption: item.caption,
    notes:   item.notes,
    icon:    'log-in-outline',
  })
  if (photoEndUrl) photos.push({
    url:     photoEndUrl,
    caption: item.captionEnd ?? item.caption,
    notes:   item.notesEnd ?? null,
    icon:    'log-out-outline',
  })

  const currentPhoto   = photos[photoIndex]
  const currentCaption = currentPhoto?.caption ?? item.caption
  const currentNotes   = currentPhoto?.notes   ?? null

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x     = e.nativeEvent.contentOffset.x
    const index = Math.round(x / PHOTO_WIDTH)
    setPhotoIndex(Math.min(Math.max(index, 0), photos.length - 1))
  }

  return (
    <View style={s.card}>

      {/* ─── Header ─── */}
      <View style={s.cardHeader}>
        <View style={s.cardIconBox}>
          <Ionicons name="barbell" size={18} color={colors.primary} />
        </View>
        <View style={s.cardHeaderInfo}>
          <Text style={s.cardWorkoutName}>{item.workout?.name ?? 'Treino'}</Text>
          <Text style={s.cardDate}>{formatDate(item.startedAt)}</Text>
        </View>
        <View style={s.headerActions}>
          <View style={s.completedBadge}>
            <Ionicons name="checkmark-circle" size={13} color={colors.success} />
            <Text style={s.completedBadgeText}>Concluído</Text>
          </View>
          <TouchableOpacity style={s.actionBtn} onPress={() => onEdit(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => onDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Fotos carrossel ─── */}
      {hasPhotos && (
        <View style={s.photosContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={PHOTO_WIDTH + spacing['2']}
            contentContainerStyle={s.photosScroll}
            onMomentumScrollEnd={handleScroll}
          >
            {photos.map((p, i) => (
              <TouchableOpacity
                key={i}
                style={s.photoBox}
                activeOpacity={0.92}
                onPress={() => onOpenPhoto(p.url, p.caption)}
              >
                <Image source={{ uri: p.url }} style={s.photo} />
                <View style={s.photoLabel}>
                  <Ionicons name={p.icon as any} size={12} color={colors.white} />
                  <Text style={s.photoLabelText} numberOfLines={1}>{p.caption}</Text>
                </View>
                <View style={s.photoZoomIcon}>
                  <Ionicons name="expand-outline" size={16} color={colors.white} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {hasBothPhotos && (
            <View style={s.dotsRow}>
              {photos.map((_, i) => (
                <View key={i} style={[s.dot, i === photoIndex && s.dotActive]} />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Legenda dinâmica */}
      <Text style={s.caption}>{currentCaption}</Text>

      {/* Observação dinâmica */}
      {currentNotes && (
        <View style={s.notesBox}>
          <Ionicons name="chatbubble-outline" size={13} color={colors.textSecondary} />
          <Text style={s.notesText}>{currentNotes}</Text>
        </View>
      )}

      {/* ─── Stats ─── */}
      <View style={s.statsRow}>
        <View style={s.statItem}>
          <Ionicons name="time-outline" size={14} color={colors.primary} />
          <Text style={s.statValue}>{item.duration ? formatDuration(item.duration) : '—'}</Text>
          <Text style={s.statLabel}>Duração</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Ionicons name="log-in-outline" size={14} color={colors.success} />
          <Text style={s.statValue}>{formatTime(item.startedAt)}</Text>
          <Text style={s.statLabel}>Check-in</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Ionicons name="log-out-outline" size={14} color={colors.error} />
          <Text style={s.statValue}>{item.finishedAt ? formatTime(item.finishedAt) : '—'}</Text>
          <Text style={s.statLabel}>Check-out</Text>
        </View>
      </View>

      {/* ─── Localização ─── */}
      {item.location && (
        <View style={s.locationRow}>
          <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
          <Text style={s.locationText} numberOfLines={1}>{item.location}</Text>
        </View>
      )}
    </View>
  )
}

export function StudentFeedScreen() {
  const [sessions,    setSessions]    = useState<WorkoutSession[]>([])
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)

  const [editModal,     setEditModal]     = useState(false)
  const [editing,       setEditing]       = useState<WorkoutSession | null>(null)
  const [editCaption,   setEditCaption]   = useState('')
  const [editNotes,     setEditNotes]     = useState('')
  const [editCaptionEnd,setEditCaptionEnd]= useState('')
  const [editNotesEnd,  setEditNotesEnd]  = useState('')
  const [editLocation,  setEditLocation]  = useState('')
  const [saving,        setSaving]        = useState(false)

  const [photoModal,    setPhotoModal]    = useState(false)
  const [photoFullUrl,  setPhotoFullUrl]  = useState<string | null>(null)
  const [photoFullLabel,setPhotoFullLabel]= useState('')

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await sessionService.getHistory()
      setSessions(data)
    } catch {
      // silencia
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const openPhoto = (url: string, label: string) => {
    setPhotoFullUrl(url)
    setPhotoFullLabel(label)
    setPhotoModal(true)
  }

  const openEditModal = (session: WorkoutSession) => {
    setEditing(session)
    setEditCaption(session.caption)
    setEditNotes(session.notes ?? '')
    setEditCaptionEnd(session.captionEnd ?? '')
    setEditNotesEnd(session.notesEnd ?? '')
    setEditLocation(session.location ?? '')
    setEditModal(true)
  }

  const handleSave = async () => {
    if (!editing) return
    if (!editCaption.trim()) { Alert.alert('Atenção', 'A legenda de início é obrigatória.'); return }
    try {
      setSaving(true)
      await sessionService.update(editing.id, {
        caption:    editCaption.trim(),
        captionEnd: editCaptionEnd.trim() || null,
        notes:      editNotes.trim() || null,
        notesEnd:   editNotesEnd.trim() || null,
        location:   editLocation.trim() || null,
      })
      setEditModal(false)
      load(true)
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as alterações.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (session: WorkoutSession) => {
    Alert.alert(
      'Excluir registro',
      `Deseja excluir o registro de "${session.workout?.name ?? 'Treino'}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: async () => {
            try {
              await sessionService.remove(session.id)
              load(true)
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir o registro.')
            }
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView style={s.safe}>

      <View style={s.header}>
        <Text style={s.headerTitle}>Meu Feed</Text>
        <Text style={s.headerSub}>
          {sessions.length} treino{sessions.length !== 1 ? 's' : ''} registrado{sessions.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['10'] }} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <SessionCard
              item={item}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onOpenPhoto={openPhoto}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true) }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="fitness-outline" size={52} color={colors.textDisabled} />
              <Text style={s.emptyTitle}>Nenhum treino registrado</Text>
              <Text style={s.emptyText}>Faça check-in em um treino para começar seu histórico</Text>
            </View>
          }
        />
      )}

      {/* ─── Modal foto tela cheia ─── */}
      <Modal
        visible={photoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoModal(false)}
        statusBarTranslucent
      >
        <View style={s.photoModalBg}>
          <StatusBar backgroundColor="rgba(0,0,0,0.95)" barStyle="light-content" />
          <TouchableOpacity style={s.photoModalClose} onPress={() => setPhotoModal(false)}>
            <Ionicons name="close-circle" size={36} color={colors.white} />
          </TouchableOpacity>
          <Text style={s.photoModalLabel}>{photoFullLabel}</Text>
          {photoFullUrl && (
            <Image source={{ uri: photoFullUrl }} style={s.photoModalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* ─── Modal edição ─── */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setEditModal(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Editar registro</Text>
            <TouchableOpacity onPress={() => setEditModal(false)}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.sheetBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Seção Check-in */}
            <View style={s.editSectionHeader}>
              <Ionicons name="log-in-outline" size={15} color={colors.success} />
              <Text style={s.editSectionTitle}>Check-in</Text>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Legenda *</Text>
              <TextInput
                style={s.input}
                value={editCaption}
                onChangeText={setEditCaption}
                placeholder="Ex: Dia de peito e tríceps 💪"
                placeholderTextColor={colors.textDisabled}
                maxLength={150}
              />
              <Text style={s.charCount}>{editCaption.length}/150</Text>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Observação (opcional)</Text>
              <TextInput
                style={[s.input, { minHeight: 72, textAlignVertical: 'top' }]}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Ex: Aumentei a carga no supino..."
                placeholderTextColor={colors.textDisabled}
                multiline
                maxLength={300}
              />
            </View>

            {/* Seção Check-out — só se sessão finalizada */}
            {editing?.finishedAt && (
              <>
                <View style={s.editSectionHeader}>
                  <Ionicons name="log-out-outline" size={15} color={colors.error} />
                  <Text style={s.editSectionTitle}>Check-out</Text>
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Legenda</Text>
                  <TextInput
                    style={s.input}
                    value={editCaptionEnd}
                    onChangeText={setEditCaptionEnd}
                    placeholder="Ex: Treino concluído! 🔥"
                    placeholderTextColor={colors.textDisabled}
                    maxLength={150}
                  />
                  <Text style={s.charCount}>{editCaptionEnd.length}/150</Text>
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Observação (opcional)</Text>
                  <TextInput
                    style={[s.input, { minHeight: 72, textAlignVertical: 'top' }]}
                    value={editNotesEnd}
                    onChangeText={setEditNotesEnd}
                    placeholder="Ex: Senti bem os músculos, ótimo treino!"
                    placeholderTextColor={colors.textDisabled}
                    multiline
                    maxLength={300}
                  />
                </View>
              </>
            )}

            {/* Localização */}
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Localização (opcional)</Text>
              <TextInput
                style={s.input}
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder="Ex: Academia FitGym..."
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color={colors.white} />
                : <Text style={s.saveBtnText}>Salvar alterações</Text>
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

  header:      { paddingHorizontal: spacing['5'], paddingTop: spacing['5'], paddingBottom: spacing['3'] },
  headerTitle: { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  headerSub:   { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing['1'] },

  list: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  card: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['4'], gap: spacing['3'], ...shadows.sm },

  cardHeader:         { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  cardIconBox:        { width: 40, height: 40, borderRadius: radii.lg, backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
  cardHeaderInfo:     { flex: 1 },
  cardWorkoutName:    { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  cardDate:           { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  headerActions:      { flexDirection: 'row', alignItems: 'center', gap: spacing['1'] },
  completedBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${colors.success}15`, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 3 },
  completedBadgeText: { fontFamily: typography.family.medium, fontSize: 10, color: colors.success },
  actionBtn:          { width: 30, height: 30, borderRadius: radii.md, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },

  photosContainer: { gap: spacing['2'] },
  photosScroll:    { gap: spacing['2'] },
  photoBox:        { width: PHOTO_WIDTH, borderRadius: radii.lg, overflow: 'hidden', marginRight: spacing['2'] },
  photo:           { width: '100%', height: 200, resizeMode: 'cover' },
  photoLabel:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: spacing['2'], paddingHorizontal: spacing['3'], flexDirection: 'row', alignItems: 'center', gap: 4 },
  photoLabelText:  { fontFamily: typography.family.medium, fontSize: 12, color: colors.white, flex: 1 },
  photoZoomIcon:   { position: 'absolute', top: spacing['2'], right: spacing['2'], backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: radii.full, padding: 4 },
  dotsRow:         { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing['1'] },
  dot:             { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive:       { width: 18, height: 6, borderRadius: 3, backgroundColor: colors.primary },

  photoModalBg:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  photoModalClose: { position: 'absolute', top: 48, right: spacing['4'], zIndex: 10 },
  photoModalLabel: { position: 'absolute', top: 56, left: 0, right: 0, textAlign: 'center', fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.white, zIndex: 10, paddingHorizontal: spacing['10'] },
  photoModalImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.75 },

  caption:   { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  notesBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['2'], backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'] },
  notesText: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, flex: 1 },

  statsRow:    { flexDirection: 'row', backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'] },
  statItem:    { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 2 },
  statValue:   { fontFamily: typography.family.bold, fontSize: typography.size.sm, color: colors.textPrimary },
  statLabel:   { fontFamily: typography.family.regular, fontSize: 10, color: colors.textSecondary },

  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing['1'] },
  locationText: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, flex: 1 },

  empty:      { alignItems: 'center', marginTop: spacing['12'], gap: spacing['3'], paddingHorizontal: spacing['8'] },
  emptyTitle: { fontFamily: typography.family.semiBold, fontSize: typography.size.lg, color: colors.textSecondary },
  emptyText:  { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textDisabled, textAlign: 'center' },

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['6'], paddingVertical: spacing['4'], borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  sheetBody:   { padding: spacing['6'], gap: spacing['4'], paddingBottom: spacing['10'] },

  editSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing['2'], paddingBottom: spacing['1'], borderBottomWidth: 1, borderBottomColor: colors.border },
  editSectionTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.textPrimary },

  inputGroup:  { gap: spacing['1'] },
  inputLabel:  { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  input:       { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 52, paddingHorizontal: spacing['4'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  charCount:   { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textDisabled, textAlign: 'right' },
  saveBtn:     { backgroundColor: colors.primary, borderRadius: radii.lg, height: 52, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },
})
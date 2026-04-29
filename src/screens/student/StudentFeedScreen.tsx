import React, { useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, Alert,
  Modal, TextInput, ScrollView, Dimensions, StatusBar,
  NativeSyntheticEvent, NativeScrollEvent, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import Constants from 'expo-constants'
import { sessionService } from '../../services/session.service'
import type { WorkoutSession } from '../../services/session.service'
import { friendService } from '../../services/friend.service'
import type { FeedSession, FriendUser, SessionComment } from '../../services/friend.service'
import { useAuth } from '../../contexts/AuthContext'
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

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
})

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', {
  hour: '2-digit', minute: '2-digit',
})

const formatCommentTime = (iso: string) => {
  const d    = new Date(iso)
  const now  = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60)   return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400)return `${Math.floor(diff / 3600)}h`
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

// ─── SessionCard ──────────────────────────────
interface SessionCardProps {
  item:       FeedSession
  myUserId:   string
  onEdit:     (s: WorkoutSession) => void
  onDelete:   (s: WorkoutSession) => void
  onOpenPhoto:(url: string, label: string) => void
  onLike:     (sessionId: string) => void
  onComment:  (session: FeedSession) => void
}

function SessionCard({ item, myUserId, onEdit, onDelete, onOpenPhoto, onLike, onComment }: SessionCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const isOwn = item.studentId === myUserId

  const photoStartUrl = item.photoStart ? `${getBaseUrl()}${item.photoStart}` : null
  const photoEndUrl   = item.photoEnd   ? `${getBaseUrl()}${item.photoEnd}`   : null
  const hasPhotos     = !!(photoStartUrl || photoEndUrl)
  const hasBothPhotos = !!(photoStartUrl && photoEndUrl)

  const photos: { url: string; caption: string; notes: string | null; icon: string }[] = []
  if (photoStartUrl) photos.push({ url: photoStartUrl, caption: item.caption, notes: item.notes, icon: 'log-in-outline' })
  if (photoEndUrl)   photos.push({ url: photoEndUrl, caption: item.captionEnd ?? item.caption, notes: item.notesEnd ?? null, icon: 'log-out-outline' })

  const currentPhoto   = photos[photoIndex]
  const currentCaption = currentPhoto?.caption ?? item.caption
  const currentNotes   = currentPhoto?.notes   ?? null

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x     = e.nativeEvent.contentOffset.x
    const index = Math.round(x / PHOTO_WIDTH)
    setPhotoIndex(Math.min(Math.max(index, 0), photos.length - 1))
  }

  const studentAvatarUrl = item.student?.avatar ? `${getBaseUrl()}${item.student.avatar}` : null

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.cardHeader}>
        {!isOwn ? (
          <>
            {studentAvatarUrl
              ? <Image source={{ uri: studentAvatarUrl }} style={s.friendAvatar} />
              : (
                <View style={s.friendAvatarPlaceholder}>
                  <Text style={s.friendAvatarInitial}>{item.student.name.charAt(0).toUpperCase()}</Text>
                </View>
              )
            }
            <View style={s.cardHeaderInfo}>
              <Text style={s.friendName}>{item.student.name}</Text>
              <Text style={s.cardWorkoutName}>{item.workout?.name ?? 'Treino'}</Text>
              <Text style={s.cardDate}>{formatDate(item.startedAt)}</Text>
            </View>
          </>
        ) : (
          <>
            <View style={s.cardIconBox}>
              <Ionicons name="barbell" size={18} color={colors.primary} />
            </View>
            <View style={s.cardHeaderInfo}>
              <Text style={s.cardWorkoutName}>{item.workout?.name ?? 'Treino'}</Text>
              <Text style={s.cardDate}>{formatDate(item.startedAt)}</Text>
            </View>
          </>
        )}

        <View style={s.headerActions}>
          <View style={s.completedBadge}>
            <Ionicons name="checkmark-circle" size={13} color={colors.success} />
            <Text style={s.completedBadgeText}>Concluído</Text>
          </View>
          {isOwn && (
            <>
              <TouchableOpacity style={s.actionBtn} onPress={() => onEdit(item as any)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="pencil-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={() => onDelete(item as any)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Fotos */}
      {hasPhotos && (
        <View style={s.photosContainer}>
          <ScrollView
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            decelerationRate="fast" snapToInterval={PHOTO_WIDTH + spacing['2']}
            contentContainerStyle={s.photosScroll} onMomentumScrollEnd={handleScroll}
          >
            {photos.map((p, i) => (
              <TouchableOpacity key={i} style={s.photoBox} activeOpacity={0.92} onPress={() => onOpenPhoto(p.url, p.caption)}>
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
              {photos.map((_, i) => <View key={i} style={[s.dot, i === photoIndex && s.dotActive]} />)}
            </View>
          )}
        </View>
      )}

      <Text style={s.caption}>{currentCaption}</Text>

      {currentNotes && (
        <View style={s.notesBox}>
          <Ionicons name="chatbubble-outline" size={13} color={colors.textSecondary} />
          <Text style={s.notesText}>{currentNotes}</Text>
        </View>
      )}

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

      {item.location && (
        <View style={s.locationRow}>
          <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
          <Text style={s.locationText} numberOfLines={1}>{item.location}</Text>
        </View>
      )}

      {/* Ações — like e comentário */}
      <View style={s.actionsRow}>
        <TouchableOpacity style={s.actionRowBtn} onPress={() => onLike(item.id)} activeOpacity={0.7}>
          <Ionicons
            name={item.likedByMe ? 'heart' : 'heart-outline'}
            size={20}
            color={item.likedByMe ? colors.error : colors.textSecondary}
          />
          <Text style={[s.actionRowText, item.likedByMe && { color: colors.error }]}>
            {item.likeCount > 0 ? item.likeCount : ''} {item.likeCount === 1 ? 'curtida' : item.likeCount > 1 ? 'curtidas' : 'Curtir'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionRowBtn} onPress={() => onComment(item)} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={19} color={colors.textSecondary} />
          <Text style={s.actionRowText}>
            {item.commentCount > 0 ? `${item.commentCount} comentário${item.commentCount !== 1 ? 's' : ''}` : 'Comentar'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Preview de até 2 comentários */}
      {item.comments.length > 0 && (
        <View style={s.commentsPreview}>
          {item.comments.slice(-2).map(c => (
            <View key={c.id} style={s.commentRow}>
              <Text style={s.commentAuthor}>{c.user.name} </Text>
              <Text style={s.commentText}>{c.text}</Text>
            </View>
          ))}
          {item.comments.length > 2 && (
            <TouchableOpacity onPress={() => onComment(item)}>
              <Text style={s.seeAllComments}>Ver todos os {item.comments.length} comentários</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

// ─── Main Screen ──────────────────────────────
export function StudentFeedScreen() {
  const navigation     = useNavigation<any>()
  const { user }       = useAuth()
  const myUserId       = user?.id ?? ''

  // Tabs: feed | friends
  const [activeTab, setActiveTab] = useState<'feed' | 'friends'>('feed')

  const [sessions,     setSessions]     = useState<FeedSession[]>([])
  const [friends,      setFriends]      = useState<FriendUser[]>([])
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  // Edit modal
  const [editModal,      setEditModal]      = useState(false)
  const [editing,        setEditing]        = useState<WorkoutSession | null>(null)
  const [editCaption,    setEditCaption]     = useState('')
  const [editNotes,      setEditNotes]       = useState('')
  const [editCaptionEnd, setEditCaptionEnd]  = useState('')
  const [editNotesEnd,   setEditNotesEnd]    = useState('')
  const [editLocation,   setEditLocation]    = useState('')
  const [saving,         setSaving]          = useState(false)

  // Photo modal
  const [photoModal,     setPhotoModal]     = useState(false)
  const [photoFullUrl,   setPhotoFullUrl]   = useState<string | null>(null)
  const [photoFullLabel, setPhotoFullLabel] = useState('')

  // Comment modal
  const [commentModal,   setCommentModal]   = useState(false)
  const [commentSession, setCommentSession] = useState<FeedSession | null>(null)
  const [commentText,    setCommentText]    = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [deletingComment,setDeletingComment]= useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [feedData, friendsData, pending] = await Promise.all([
        friendService.getFeed(),
        friendService.listFriends(),
        friendService.listPendingRequests().catch(() => []),
      ])
      setSessions(feedData)
      setFriends(friendsData)
      setPendingCount(pending.length)
    } catch {
      // silencia
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  // Toggle like otimista
  const handleLike = useCallback(async (sessionId: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId
      ? {
          ...s,
          likedByMe: !s.likedByMe,
          likeCount: s.likedByMe ? s.likeCount - 1 : s.likeCount + 1,
        }
      : s
    ))
    try {
      await friendService.toggleLike(sessionId)
    } catch {
      // Reverte em caso de erro
      setSessions(prev => prev.map(s => s.id === sessionId
        ? { ...s, likedByMe: !s.likedByMe, likeCount: s.likedByMe ? s.likeCount - 1 : s.likeCount + 1 }
        : s
      ))
    }
  }, [])

  // Abrir modal de comentários
  const handleComment = useCallback((session: FeedSession) => {
    setCommentSession(session)
    setCommentText('')
    setCommentModal(true)
  }, [])

  // Enviar comentário
  const handleSendComment = async () => {
    if (!commentSession || !commentText.trim()) return
    try {
      setSendingComment(true)
      const newComment = await friendService.addComment(commentSession.id, commentText.trim())
      setSessions(prev => prev.map(s => s.id === commentSession.id
        ? { ...s, comments: [...s.comments, newComment], commentCount: s.commentCount + 1 }
        : s
      ))
      setCommentSession(prev => prev ? { ...prev, comments: [...prev.comments, newComment] } : null)
      setCommentText('')
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar o comentário.')
    } finally {
      setSendingComment(false)
    }
  }

  // Deletar comentário
  const handleDeleteComment = async (comment: SessionComment) => {
    Alert.alert('Excluir comentário', 'Deseja excluir este comentário?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try {
            setDeletingComment(comment.id)
            await friendService.deleteComment(comment.id)
            setSessions(prev => prev.map(s => s.id === commentSession?.id
              ? { ...s, comments: s.comments.filter(c => c.id !== comment.id), commentCount: s.commentCount - 1 }
              : s
            ))
            setCommentSession(prev => prev
              ? { ...prev, comments: prev.comments.filter(c => c.id !== comment.id) }
              : null
            )
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir o comentário.')
          } finally {
            setDeletingComment(null)
          }
        },
      },
    ])
  }

  const openEditModal = (session: WorkoutSession) => {
    setEditing(session)
    setEditCaption(session.caption)
    setEditNotes(session.notes ?? '')
    setEditCaptionEnd((session as any).captionEnd ?? '')
    setEditNotesEnd((session as any).notesEnd ?? '')
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
      `Deseja excluir o registro de "${(session as any).workout?.name ?? 'Treino'}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: async () => {
            try {
              await sessionService.remove(session.id)
              load(true)
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir.')
            }
          },
        },
      ],
    )
  }

  const handleUnfriend = (friend: FriendUser) => {
    Alert.alert(
      'Remover amigo',
      `Deseja remover ${friend.name} da sua lista de amigos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover', style: 'destructive',
          onPress: async () => {
            try {
              await friendService.unfriend(friend.id)
              setFriends(prev => prev.filter(f => f.id !== friend.id))
            } catch {
              Alert.alert('Erro', 'Não foi possível remover o amigo.')
            }
          },
        },
      ],
    )
  }

  const friendAvatarUrl = (f: FriendUser) =>
    f.avatar ? `${getBaseUrl()}${f.avatar}` : null

  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Comunidade</Text>
          <Text style={s.headerSub}>
            {activeTab === 'feed'
              ? `${sessions.length} treino${sessions.length !== 1 ? 's' : ''}`
              : `${friends.length} amigo${friends.length !== 1 ? 's' : ''}`
            }
          </Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.headerBtn} onPress={() => navigation.navigate('CommunitySearch')}>
            <Ionicons name="person-add-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.headerBtn} onPress={() => navigation.navigate('FriendRequests')}>
            <Ionicons name="people-outline" size={22} color={colors.textPrimary} />
            {pendingCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs Feed / Amigos */}
      <View style={s.tabsRow}>
        <TouchableOpacity
          style={[s.tab, activeTab === 'feed' && s.tabActive]}
          onPress={() => setActiveTab('feed')}
          activeOpacity={0.8}
        >
          <Ionicons name="trophy-outline" size={16} color={activeTab === 'feed' ? colors.primary : colors.textSecondary} />
          <Text style={[s.tabText, activeTab === 'feed' && s.tabTextActive]}>Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, activeTab === 'friends' && s.tabActive]}
          onPress={() => setActiveTab('friends')}
          activeOpacity={0.8}
        >
          <Ionicons name="people-outline" size={16} color={activeTab === 'friends' ? colors.primary : colors.textSecondary} />
          <Text style={[s.tabText, activeTab === 'friends' && s.tabTextActive]}>Amigos</Text>
          {friends.length > 0 && (
            <View style={s.tabBadge}>
              <Text style={s.tabBadgeText}>{friends.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['10'] }} />
      ) : activeTab === 'feed' ? (
        // ─── ABA FEED ───
        <FlatList
          data={sessions}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <SessionCard
              item={item}
              myUserId={myUserId}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onOpenPhoto={(url, label) => { setPhotoFullUrl(url); setPhotoFullLabel(label); setPhotoModal(true) }}
              onLike={handleLike}
              onComment={handleComment}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="fitness-outline" size={52} color={colors.textDisabled} />
              <Text style={s.emptyTitle}>Nenhum treino no feed</Text>
              <Text style={s.emptyText}>Adicione amigos para ver os treinos deles aqui</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('CommunitySearch')} activeOpacity={0.8}>
                <Ionicons name="person-add-outline" size={16} color={colors.white} />
                <Text style={s.emptyBtnText}>Buscar amigos</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        // ─── ABA AMIGOS ───
        <FlatList
          data={friends}
          keyExtractor={i => i.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={colors.primary} />
          }
          renderItem={({ item }) => {
            const avatarUrl = friendAvatarUrl(item)
            return (
              <View style={s.friendCard}>
                {avatarUrl
                  ? <Image source={{ uri: avatarUrl }} style={s.friendCardAvatar} />
                  : (
                    <View style={s.friendCardAvatarPlaceholder}>
                      <Text style={s.friendCardAvatarInitial}>{item.name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )
                }
                <View style={s.friendCardInfo}>
                  <Text style={s.friendCardName}>{item.name}</Text>
                  <Text style={s.friendCardRole}>
                    {item.role === 'PERSONAL' ? 'Personal Trainer' : 'Aluno'}
                  </Text>
                  <Text style={s.friendCardCode}>{item.userCode}</Text>
                </View>
                <TouchableOpacity
                  style={s.unfriendBtn}
                  onPress={() => handleUnfriend(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="person-remove-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            )
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={52} color={colors.textDisabled} />
              <Text style={s.emptyTitle}>Nenhum amigo ainda</Text>
              <Text style={s.emptyText}>Busque por código para adicionar amigos</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('CommunitySearch')} activeOpacity={0.8}>
                <Ionicons name="person-add-outline" size={16} color={colors.white} />
                <Text style={s.emptyBtnText}>Buscar amigos</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Modal foto */}
      <Modal visible={photoModal} transparent animationType="fade" onRequestClose={() => setPhotoModal(false)} statusBarTranslucent>
        <View style={s.photoModalBg}>
          <StatusBar backgroundColor="rgba(0,0,0,0.95)" barStyle="light-content" />
          <TouchableOpacity style={s.photoModalClose} onPress={() => setPhotoModal(false)}>
            <Ionicons name="close-circle" size={36} color={colors.white} />
          </TouchableOpacity>
          <Text style={s.photoModalLabel}>{photoFullLabel}</Text>
          {photoFullUrl && <Image source={{ uri: photoFullUrl }} style={s.photoModalImage} resizeMode="contain" />}
        </View>
      </Modal>

      {/* Modal edição */}
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
            <View style={s.editSectionHeader}>
              <Ionicons name="log-in-outline" size={15} color={colors.success} />
              <Text style={s.editSectionTitle}>Check-in</Text>
            </View>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Legenda *</Text>
              <TextInput style={s.input} value={editCaption} onChangeText={setEditCaption} placeholder="Ex: Dia de peito e tríceps 💪" placeholderTextColor={colors.textDisabled} maxLength={150} />
              <Text style={s.charCount}>{editCaption.length}/150</Text>
            </View>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Observação (opcional)</Text>
              <TextInput style={[s.input, { minHeight: 72, textAlignVertical: 'top' }]} value={editNotes} onChangeText={setEditNotes} placeholder="Ex: Aumentei a carga no supino..." placeholderTextColor={colors.textDisabled} multiline maxLength={300} />
            </View>
            {editing?.finishedAt && (
              <>
                <View style={s.editSectionHeader}>
                  <Ionicons name="log-out-outline" size={15} color={colors.error} />
                  <Text style={s.editSectionTitle}>Check-out</Text>
                </View>
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Legenda</Text>
                  <TextInput style={s.input} value={editCaptionEnd} onChangeText={setEditCaptionEnd} placeholder="Ex: Treino concluído! 🔥" placeholderTextColor={colors.textDisabled} maxLength={150} />
                  <Text style={s.charCount}>{editCaptionEnd.length}/150</Text>
                </View>
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Observação (opcional)</Text>
                  <TextInput style={[s.input, { minHeight: 72, textAlignVertical: 'top' }]} value={editNotesEnd} onChangeText={setEditNotesEnd} placeholder="Ex: Senti bem os músculos!" placeholderTextColor={colors.textDisabled} multiline maxLength={300} />
                </View>
              </>
            )}
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Localização (opcional)</Text>
              <TextInput style={s.input} value={editLocation} onChangeText={setEditLocation} placeholder="Ex: Academia FitGym..." placeholderTextColor={colors.textDisabled} />
            </View>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={s.saveBtnText}>Salvar alterações</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal comentários */}
      <Modal visible={commentModal} transparent animationType="slide" onRequestClose={() => setCommentModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setCommentModal(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.commentSheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>
              Comentários {commentSession && commentSession.comments.length > 0 && `(${commentSession.comments.length})`}
            </Text>
            <TouchableOpacity onPress={() => setCommentModal(false)}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={commentSession?.comments ?? []}
            keyExtractor={c => c.id}
            style={s.commentList}
            contentContainerStyle={{ padding: spacing['4'], gap: spacing['3'] }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: spacing['8'] }}>
                <Ionicons name="chatbubble-outline" size={36} color={colors.textDisabled} />
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textDisabled, marginTop: spacing['2'] }}>
                  Seja o primeiro a comentar
                </Text>
              </View>
            }
            renderItem={({ item: c }) => {
              const cAvatarUrl = c.user.avatar ? `${getBaseUrl()}${c.user.avatar}` : null
              const isMyComment = c.userId === myUserId
              return (
                <View style={s.commentItem}>
                  {cAvatarUrl
                    ? <Image source={{ uri: cAvatarUrl }} style={s.commentAvatar} />
                    : (
                      <View style={s.commentAvatarPlaceholder}>
                        <Text style={s.commentAvatarInitial}>{c.user.name.charAt(0).toUpperCase()}</Text>
                      </View>
                    )
                  }
                  <View style={s.commentContent}>
                    <View style={s.commentHeader}>
                      <Text style={s.commentAuthorName}>{c.user.name}</Text>
                      <Text style={s.commentTime}>{formatCommentTime(c.createdAt)}</Text>
                    </View>
                    <Text style={s.commentBody}>{c.text}</Text>
                  </View>
                  {isMyComment && (
                    <TouchableOpacity
                      onPress={() => handleDeleteComment(c)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      disabled={deletingComment === c.id}
                    >
                      {deletingComment === c.id
                        ? <ActivityIndicator size="small" color={colors.error} />
                        : <Ionicons name="trash-outline" size={15} color={colors.error} />
                      }
                    </TouchableOpacity>
                  )}
                </View>
              )
            }}
          />

          {/* Input de comentário */}
          <View style={s.commentInputRow}>
            <TextInput
              style={s.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Adicione um comentário..."
              placeholderTextColor={colors.textDisabled}
              multiline
              maxLength={300}
            />
            <TouchableOpacity
              style={[s.commentSendBtn, (!commentText.trim() || sendingComment) && { opacity: 0.4 }]}
              onPress={handleSendComment}
              disabled={!commentText.trim() || sendingComment}
              activeOpacity={0.8}
            >
              {sendingComment
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Ionicons name="send" size={18} color={colors.white} />
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },

  header:      { paddingHorizontal: spacing['5'], paddingTop: spacing['5'], paddingBottom: spacing['2'], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  headerSub:   { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing['1'] },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  headerBtn:   { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  badge:       { position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText:   { fontFamily: typography.family.bold, fontSize: 9, color: colors.white },

  // Tabs
  tabsRow:         { flexDirection: 'row', paddingHorizontal: spacing['5'], paddingBottom: spacing['3'], gap: spacing['3'] },
  tab:             { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], paddingVertical: spacing['3'], borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  tabActive:       { backgroundColor: `${colors.primary}15`, borderColor: colors.primary },
  tabText:         { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  tabTextActive:   { color: colors.primary, fontFamily: typography.family.semiBold },
  tabBadge:        { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText:    { fontFamily: typography.family.bold, fontSize: 10, color: colors.white },

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

  friendAvatar:            { width: 40, height: 40, borderRadius: radii.full, borderWidth: 2, borderColor: colors.primary },
  friendAvatarPlaceholder: { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  friendAvatarInitial:     { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },
  friendName:              { fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.primary },

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

  // Like e comentário
  actionsRow:    { flexDirection: 'row', gap: spacing['4'], paddingTop: spacing['1'], borderTopWidth: 1, borderTopColor: colors.divider },
  actionRowBtn:  { flexDirection: 'row', alignItems: 'center', gap: spacing['1'] },
  actionRowText: { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },

  commentsPreview: { gap: spacing['1'] },
  commentRow:      { flexDirection: 'row', flexWrap: 'wrap' },
  commentAuthor:   { fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.textPrimary },
  commentText:     { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, flex: 1 },
  seeAllComments:  { fontFamily: typography.family.medium, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },

  // Amigos
  friendCard:                  { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], gap: spacing['3'], ...shadows.sm },
  friendCardAvatar:            { width: 52, height: 52, borderRadius: radii.full, borderWidth: 2, borderColor: colors.primary },
  friendCardAvatarPlaceholder: { width: 52, height: 52, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary },
  friendCardAvatarInitial:     { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.white },
  friendCardInfo:              { flex: 1 },
  friendCardName:              { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  friendCardRole:              { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  friendCardCode:              { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textDisabled, letterSpacing: 1, marginTop: 2 },
  unfriendBtn:                 { width: 36, height: 36, borderRadius: radii.full, backgroundColor: `${colors.error}10`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${colors.error}30` },

  photoModalBg:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  photoModalClose: { position: 'absolute', top: 48, right: spacing['4'], zIndex: 10 },
  photoModalLabel: { position: 'absolute', top: 56, left: 0, right: 0, textAlign: 'center', fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.white, zIndex: 10, paddingHorizontal: spacing['10'] },
  photoModalImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.75 },

  empty:       { alignItems: 'center', marginTop: spacing['12'], gap: spacing['3'], paddingHorizontal: spacing['8'] },
  emptyTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.lg, color: colors.textSecondary },
  emptyText:   { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textDisabled, textAlign: 'center' },
  emptyBtn:    { flexDirection: 'row', alignItems: 'center', gap: spacing['2'], backgroundColor: colors.primary, borderRadius: radii.lg, paddingHorizontal: spacing['5'], paddingVertical: spacing['3'], marginTop: spacing['2'] },
  emptyBtnText:{ fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.white },

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

  // Modal comentários
  commentSheet:            { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], maxHeight: '75%' },
  commentList:             { maxHeight: 350 },
  commentItem:             { flexDirection: 'row', alignItems: 'flex-start', gap: spacing['3'] },
  commentAvatar:           { width: 36, height: 36, borderRadius: radii.full, borderWidth: 1.5, borderColor: colors.primary },
  commentAvatarPlaceholder:{ width: 36, height: 36, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  commentAvatarInitial:    { fontFamily: typography.family.bold, fontSize: typography.size.sm, color: colors.white },
  commentContent:          { flex: 1, backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'], gap: 2 },
  commentHeader:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commentAuthorName:       { fontFamily: typography.family.semiBold, fontSize: typography.size.sm, color: colors.textPrimary },
  commentTime:             { fontFamily: typography.family.regular, fontSize: 10, color: colors.textDisabled },
  commentBody:             { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary },
  commentInputRow:         { flexDirection: 'row', alignItems: 'flex-end', gap: spacing['2'], padding: spacing['4'], borderTopWidth: 1, borderTopColor: colors.border },
  commentInput:            { flex: 1, backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing['4'], paddingVertical: spacing['3'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary, maxHeight: 100 },
  commentSendBtn:          { width: 44, height: 44, borderRadius: radii.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
})
import React, { useState, useCallback, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Alert, ActivityIndicator, Modal, TextInput,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { personalRequestService } from '../../services/personal-request.service'
import type { PersonalItem } from '../../services/personal-request.service'
import { userService } from '../../services/user.service'
import { colors, typography, spacing, radii, shadows } from '../../theme'

const getBaseUrl = () => {
  const host = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants.manifest as any)?.debuggerHost
  if (host) return `http://${host.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}

const FORMAT_LABEL: Record<string, string> = {
  presential: 'Presencial',
  online:     'Online',
  hybrid:     'Híbrido',
}

const FORMAT_FILTERS = [
  { key: '',           label: 'Todos'      },
  { key: 'presential', label: 'Presencial' },
  { key: 'online',     label: 'Online'     },
  { key: 'hybrid',     label: 'Híbrido'    },
]

const STATUS_CONFIG = {
  PENDING:  { label: 'Aguardando', color: '#F59E0B',      icon: 'time-outline'     as const },
  ACCEPTED: { label: 'Aceito',     color: colors.success, icon: 'checkmark-circle' as const },
  REJECTED: { label: 'Recusado',   color: colors.error,   icon: 'close-circle'     as const },
}

// Detecta se é um código no formato XXX-XXXXXX
const isUserCode = (text: string) => /^[A-Z]{2,3}-[A-Z0-9]{4,6}$/i.test(text.trim())

export function StudentPersonalsScreen() {
  const [personals,  setPersonals]  = useState<PersonalItem[]>([])
  const [filtered,   setFiltered]   = useState<PersonalItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [msgModal,   setMsgModal]   = useState(false)
  const [selected,   setSelected]   = useState<PersonalItem | null>(null)
  const [message,    setMessage]    = useState('')
  const [sending,    setSending]    = useState(false)

  const [search,       setSearch]       = useState('')
  const [formatFilter, setFormatFilter] = useState('')

  // Estado para busca por código
  const [codeResult,     setCodeResult]     = useState<PersonalItem | null>(null)
  const [searchingCode,  setSearchingCode]  = useState(false)
  const [isCodeSearch,   setIsCodeSearch]   = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await personalRequestService.listPersonals()
      setPersonals(data)
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os personais.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Filtro local combinado
  useEffect(() => {
    if (isCodeSearch) return
    let result = personals
    if (formatFilter) {
      result = result.filter(p => p.personalProfile?.classFormat === formatFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.personalProfile?.cref?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.state?.toLowerCase().includes(q) ||
        (p.personalProfile?.classFormat &&
          FORMAT_LABEL[p.personalProfile.classFormat]?.toLowerCase().includes(q))
      )
    }
    setFiltered(result)
  }, [search, formatFilter, personals, isCodeSearch])

  // Busca por código quando padrão é detectado
  const handleSearch = async (v: string) => {
    setSearch(v)
    setCodeResult(null)

    if (isUserCode(v)) {
      setIsCodeSearch(true)
      setSearchingCode(true)
      try {
        const result = await userService.searchByCode(v.trim().toUpperCase())
        if (result.role !== 'PERSONAL') {
          Alert.alert('Atenção', 'Esse código pertence a um aluno, não a um personal.')
          setIsCodeSearch(false)
          return
        }
        // Converte resultado para PersonalItem compatível
        const personalItem: PersonalItem = {
          id:              result.id,
          name:            result.name,
          avatar:          result.avatar,
          city:            result.city,
          state:           result.state,
          userCode:        result.userCode,
          requestStatus:   personals.find(p => p.id === result.id)?.requestStatus ?? null, // ✅ null em vez de undefined
          personalProfile: result.personalProfile
            ? {
                cref:        result.personalProfile.cref,
                classFormat: result.personalProfile.classFormat,
                course:      '', 
              }
            : null,  
        }
        setCodeResult(personalItem)
      } catch {
        Alert.alert('Não encontrado', 'Nenhum personal com esse código.')
        setIsCodeSearch(false)
      } finally {
        setSearchingCode(false)
      }
    } else {
      setIsCodeSearch(false)
    }
  }

  const clearSearch = () => {
    setSearch('')
    setCodeResult(null)
    setIsCodeSearch(false)
  }

  const onRefresh = () => {
    setRefreshing(true)
    load(true)
  }

  const handleOpenRequest = (personal: PersonalItem) => {
    if (personal.requestStatus === 'PENDING') {
      Alert.alert('Aguardando', 'Sua solicitação está sendo analisada pelo personal.')
      return
    }
    if (personal.requestStatus === 'ACCEPTED') {
      Alert.alert(
        'Desvincular personal',
        `Deseja se desvincular de ${personal.name}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desvincular', style: 'destructive',
            onPress: async () => {
              try {
                await personalRequestService.unlinkPersonal()
                Alert.alert('Desvinculado', 'Você foi desvinculado do personal com sucesso.')
                load(true)
              } catch (err: any) {
                Alert.alert('Erro', err?.message ?? 'Não foi possível desvincular.')
              }
            },
          },
        ],
      )
      return
    }

    const hasPending  = personals.some(p => p.id !== personal.id && p.requestStatus === 'PENDING')
    const hasAccepted = personals.some(p => p.id !== personal.id && p.requestStatus === 'ACCEPTED')

    if (hasAccepted) {
      Alert.alert('Já vinculado', 'Você já possui um personal. Para solicitar outro, desvincule-se primeiro.')
      return
    }
    if (hasPending) {
      Alert.alert('Solicitação pendente', 'Você já possui uma solicitação pendente.')
      return
    }

    setSelected(personal)
    setMessage('')
    setMsgModal(true)
  }

  const handleSendRequest = async () => {
    if (!selected) return
    try {
      setSending(true)
      await personalRequestService.sendRequest(selected.id, message || undefined)
      setMsgModal(false)
      Alert.alert('Solicitação enviada!', `${selected.name} será notificado.`)
      load(true)
      clearSearch()
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível enviar a solicitação.')
    } finally {
      setSending(false)
    }
  }

  const displayList = isCodeSearch
    ? (codeResult ? [codeResult] : [])
    : filtered

  const renderPersonal = ({ item }: { item: PersonalItem }) => {
    const avatarUrl   = item.avatar ? `${getBaseUrl()}${item.avatar}` : null
    const status      = item.requestStatus ? STATUS_CONFIG[item.requestStatus] : null
    const formatLabel = item.personalProfile?.classFormat
      ? FORMAT_LABEL[item.personalProfile.classFormat] ?? item.personalProfile.classFormat
      : null

    return (
      <TouchableOpacity style={s.card} onPress={() => handleOpenRequest(item)} activeOpacity={0.8}>
        {avatarUrl
          ? <Image source={{ uri: avatarUrl }} style={s.avatar} />
          : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarInitial}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
          )
        }
        <View style={s.info}>
          <Text style={s.name}>{item.name}</Text>
          {item.personalProfile?.cref && (
            <Text style={s.cref}>CREF: {item.personalProfile.cref}</Text>
          )}
          {/* Mostrar código se disponível */}
          {item.userCode && (
            <Text style={s.userCode}>{item.userCode}</Text>
          )}
          <View style={s.tags}>
            {formatLabel && (
              <View style={s.tag}>
                <Ionicons name="location-outline" size={11} color={colors.primary} />
                <Text style={s.tagText}>{formatLabel}</Text>
              </View>
            )}
            {(item.city || item.state) && (
              <View style={s.tag}>
                <Ionicons name="map-outline" size={11} color={colors.textSecondary} />
                <Text style={s.tagText}>{[item.city, item.state].filter(Boolean).join(' - ')}</Text>
              </View>
            )}
          </View>
        </View>
        {status ? (
          <View style={[s.statusBadge, { backgroundColor: `${status.color}20` }]}>
            <Ionicons name={status.icon} size={14} color={status.color} />
            <Text style={[s.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        ) : (
          <View style={s.requestBtn}>
            <Ionicons name="person-add-outline" size={18} color={colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Personal Trainers</Text>
        <Text style={s.headerSub}>
          {displayList.length} personal{displayList.length !== 1 ? 'is' : ''} encontrado{displayList.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons
            name={isCodeSearch ? 'qr-code-outline' : 'search-outline'}
            size={18}
            color={isCodeSearch ? colors.primary : colors.textSecondary}
          />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={handleSearch}
            placeholder="Nome, CREF, cidade ou código PER-XXXXXX"
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {searchingCode && <ActivityIndicator size="small" color={colors.primary} />}
          {search.length > 0 && !searchingCode && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Badge indicando busca por código */}
      {isCodeSearch && (
        <View style={s.codeBadgeRow}>
          <View style={s.codeBadge}>
            <Ionicons name="qr-code-outline" size={13} color={colors.primary} />
            <Text style={s.codeBadgeText}>Buscando por código</Text>
          </View>
        </View>
      )}

      {/* Filtros — ocultos durante busca por código */}
      {!isCodeSearch && (
        <View style={s.filtersRow}>
          {FORMAT_FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[s.filterChip, formatFilter === f.key && s.filterChipActive]}
              onPress={() => setFormatFilter(f.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.filterChipText, formatFilter === f.key && s.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['10'] }} />
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={i => i.id}
          renderItem={renderPersonal}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyText}>
                {isCodeSearch && !searchingCode
                  ? 'Nenhum personal encontrado com esse código'
                  : search || formatFilter
                    ? 'Nenhum personal encontrado'
                    : 'Nenhum personal disponível'}
              </Text>
              {(search || formatFilter) && !isCodeSearch && (
                <TouchableOpacity onPress={clearSearch} style={s.clearFiltersBtn}>
                  <Text style={s.clearFiltersBtnText}>Limpar filtros</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      <Modal visible={msgModal} transparent animationType="slide" onRequestClose={() => setMsgModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setMsgModal(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Solicitar personal</Text>
            <TouchableOpacity onPress={() => setMsgModal(false)}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={s.sheetBody}>
            {selected && (
              <View style={s.selectedInfo}>
                <View style={s.selectedAvatar}>
                  <Text style={s.selectedAvatarText}>{selected.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={s.selectedName}>{selected.name}</Text>
                  {selected.personalProfile?.cref && (
                    <Text style={s.selectedCref}>CREF: {selected.personalProfile.cref}</Text>
                  )}
                </View>
              </View>
            )}
            <Text style={s.msgLabel}>Mensagem (opcional)</Text>
            <TextInput
              style={s.msgInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Ex: Quero focar em hipertrofia..."
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={3}
              maxLength={300}
            />
            <Text style={s.msgCount}>{message.length}/300</Text>
            <TouchableOpacity
              style={[s.sendBtn, sending && { opacity: 0.6 }]}
              onPress={handleSendRequest}
              disabled={sending}
              activeOpacity={0.8}
            >
              {sending
                ? <ActivityIndicator color={colors.white} />
                : <Text style={s.sendBtnText}>Enviar solicitação</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },

  header:      { paddingHorizontal: spacing['5'], paddingTop: spacing['5'], paddingBottom: spacing['2'] },
  headerTitle: { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  headerSub:   { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing['1'] },

  searchRow:   { paddingHorizontal: spacing['5'], paddingTop: spacing['3'], paddingBottom: spacing['2'] },
  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 48, paddingHorizontal: spacing['4'], gap: spacing['2'] },
  searchInput: { flex: 1, fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },

  // ✅ Badge de busca por código
  codeBadgeRow: { paddingHorizontal: spacing['5'], paddingBottom: spacing['2'] },
  codeBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: `${colors.primary}15`, borderRadius: radii.full, paddingHorizontal: spacing['3'], paddingVertical: spacing['1'] },
  codeBadgeText:{ fontFamily: typography.family.medium, fontSize: typography.size.xs, color: colors.primary },

  filtersRow:           { flexDirection: 'row', paddingHorizontal: spacing['5'], paddingBottom: spacing['3'], gap: spacing['2'] },
  filterChip:           { paddingHorizontal: spacing['3'], paddingVertical: spacing['2'], borderRadius: radii.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  filterChipActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText:       { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  filterChipTextActive: { color: colors.white },

  list: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  card:              { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], gap: spacing['3'], ...shadows.sm },
  avatar:            { width: 52, height: 52, borderRadius: radii.full, borderWidth: 2, borderColor: colors.primary },
  avatarPlaceholder: { width: 52, height: 52, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary },
  avatarInitial:     { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.white },

  info:     { flex: 1 },
  name:     { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  cref:     { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: 2 },
  userCode: { fontFamily: typography.family.bold, fontSize: typography.size.xs, color: colors.primary, letterSpacing: 1, marginTop: 1 },
  tags:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['1'], marginTop: spacing['2'] },
  tag:      { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.surfaceHigh, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 3 },
  tagText:  { fontFamily: typography.family.regular, fontSize: 10, color: colors.textSecondary },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: spacing['1'] },
  statusText:  { fontFamily: typography.family.medium, fontSize: typography.size.xs },
  requestBtn:  { width: 36, height: 36, borderRadius: radii.full, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },

  empty:               { alignItems: 'center', marginTop: spacing['10'], gap: spacing['3'] },
  emptyText:           { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textDisabled },
  clearFiltersBtn:     { paddingHorizontal: spacing['4'], paddingVertical: spacing['2'], borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.primary },
  clearFiltersBtnText: { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.primary },

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], paddingBottom: spacing['8'] },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['6'], paddingVertical: spacing['4'], borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  sheetBody:   { padding: spacing['6'], gap: spacing['4'] },

  selectedInfo:       { flexDirection: 'row', alignItems: 'center', gap: spacing['3'], backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'] },
  selectedAvatar:     { width: 44, height: 44, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  selectedAvatarText: { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.white },
  selectedName:       { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  selectedCref:       { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },

  msgLabel: { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  msgInput: { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, padding: spacing['4'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary, minHeight: 90, textAlignVertical: 'top' },
  msgCount: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textDisabled, textAlign: 'right', marginTop: -spacing['2'] },

  sendBtn:     { backgroundColor: colors.primary, borderRadius: radii.lg, height: 52, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },
})
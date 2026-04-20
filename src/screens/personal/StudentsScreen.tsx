import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import Constants from 'expo-constants'
import { apiRequest } from '../../services/api'
import { colors, typography, spacing, radii, shadows } from '../../theme'

const getBaseUrl = () => {
  const host = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? (Constants.manifest as any)?.debuggerHost
  if (host) return `http://${host.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}

interface Student {
  id:     string
  name:   string
  avatar: string | null
  active: boolean
  city:   string | null
  state:  string | null
  studentProfile: {
    goal:       string
    experience: string
    weight:     string
    height:     string
  } | null
}

const EXPERIENCE_LABEL: Record<string, string> = {
  beginner:     'Iniciante',
  intermediate: 'Intermediário',
  advanced:     'Avançado',
}

const STATUS_FILTERS = [
  { key: 'all',      label: 'Todos'    },
  { key: 'active',   label: 'Ativos'   },
  { key: 'inactive', label: 'Inativos' },
]

export function StudentsScreen() {
  const navigation = useNavigation<any>()

  const [students,      setStudents]      = useState<Student[]>([])
  const [filtered,      setFiltered]      = useState<Student[]>([])
  const [loading,       setLoading]       = useState(true)
  const [refreshing,    setRefreshing]    = useState(false)
  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState('all')

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await apiRequest<Student[]>('/user/my-students', { authenticated: true })
      setStudents(data)
    } catch {
      // silencia
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => { load() }, [load]),
  )

  // Filtro combinado: busca + status
  const applyFilters = useCallback((
    list: Student[],
    q: string,
    status: string,
  ) => {
    let result = list

    if (status === 'active')   result = result.filter(s => s.active)
    if (status === 'inactive') result = result.filter(s => !s.active)

    if (q.trim()) {
      const lower = q.toLowerCase()
      result = result.filter(s =>
        s.name.toLowerCase().includes(lower) ||
        s.city?.toLowerCase().includes(lower) ||
        s.state?.toLowerCase().includes(lower) ||
        s.studentProfile?.goal?.toLowerCase().includes(lower)
      )
    }

    setFiltered(result)
  }, [])

  const handleSearch = (v: string) => {
    setSearch(v)
    applyFilters(students, v, statusFilter)
  }

  const handleStatusFilter = (key: string) => {
    setStatusFilter(key)
    applyFilters(students, search, key)
  }

  // Atualiza filtered quando students muda (após load)
  React.useEffect(() => {
    applyFilters(students, search, statusFilter)
  }, [students])

  const activeCount   = students.filter(s => s.active).length
  const inactiveCount = students.filter(s => !s.active).length

  const renderStudent = ({ item }: { item: Student }) => {
    const avatarUrl  = item.avatar ? `${getBaseUrl()}${item.avatar}` : null
    const initials   = item.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    const experience = item.studentProfile?.experience
      ? EXPERIENCE_LABEL[item.studentProfile.experience] ?? item.studentProfile.experience
      : null

    return (
      <TouchableOpacity
        style={[s.card, !item.active && s.cardInactive]}
        onPress={() => navigation.navigate('StudentDetail', { student: item })}
        activeOpacity={0.8}
      >
        {/* Avatar */}
        {avatarUrl
          ? <Image source={{ uri: avatarUrl }} style={[s.avatar, !item.active && s.avatarInactive]} />
          : (
            <View style={[s.avatarPlaceholder, !item.active && s.avatarInactive]}>
              <Text style={s.avatarInitial}>{initials}</Text>
            </View>
          )
        }

        {/* Info */}
        <View style={s.info}>
          <View style={s.nameRow}>
            <Text style={[s.name, !item.active && s.nameInactive]} numberOfLines={1}>
              {item.name}
            </Text>
            {/* Badge de status */}
            <View style={[s.statusBadge, item.active ? s.statusActive : s.statusInactive]}>
              <View style={[s.statusDot, item.active ? s.statusDotActive : s.statusDotInactive]} />
              <Text style={[s.statusText, item.active ? s.statusTextActive : s.statusTextInactive]}>
                {item.active ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
          </View>

          <View style={s.tags}>
            {item.studentProfile?.goal && (
              <View style={s.tag}>
                <Ionicons name="fitness-outline" size={11} color={item.active ? colors.primary : colors.textDisabled} />
                <Text style={[s.tagText, !item.active && { color: colors.textDisabled }]}>
                  {item.studentProfile.goal}
                </Text>
              </View>
            )}
            {experience && (
              <View style={s.tag}>
                <Ionicons name="bar-chart-outline" size={11} color={colors.textDisabled} />
                <Text style={[s.tagText, !item.active && { color: colors.textDisabled }]}>
                  {experience}
                </Text>
              </View>
            )}
            {(item.city || item.state) && (
              <View style={s.tag}>
                <Ionicons name="map-outline" size={11} color={colors.textDisabled} />
                <Text style={[s.tagText, !item.active && { color: colors.textDisabled }]}>
                  {[item.city, item.state].filter(Boolean).join(' - ')}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color={item.active ? colors.textSecondary : colors.textDisabled} />
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Meus Alunos</Text>
        <Text style={s.headerSub}>
          {students.length} total · {activeCount} ativo{activeCount !== 1 ? 's' : ''} · {inactiveCount} inativo{inactiveCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Busca + filtro */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={handleSearch}
            placeholder="Buscar por nome, cidade, objetivo..."
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtros de status */}
      <View style={s.filtersRow}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, statusFilter === f.key && s.filterChipActive]}
            onPress={() => handleStatusFilter(f.key)}
            activeOpacity={0.8}
          >
            <Text style={[s.filterChipText, statusFilter === f.key && s.filterChipTextActive]}>
              {f.label}
              {f.key === 'active'   && ` (${activeCount})`}
              {f.key === 'inactive' && ` (${inactiveCount})`}
              {f.key === 'all'      && ` (${students.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing['10'] }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={renderStudent}
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
              <Ionicons name="people-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyText}>
                {search || statusFilter !== 'all'
                  ? 'Nenhum aluno encontrado'
                  : 'Nenhum aluno vinculado ainda'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },

  header:      { paddingHorizontal: spacing['5'], paddingTop: spacing['5'], paddingBottom: spacing['2'] },
  headerTitle: { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  headerSub:   { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, marginTop: spacing['1'] },

  searchRow:   { paddingHorizontal: spacing['5'], paddingTop: spacing['3'], paddingBottom: spacing['1'] },
  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 48, paddingHorizontal: spacing['4'], gap: spacing['2'] },
  searchInput: { flex: 1, fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },

  // Filtros de status
  filtersRow:           { flexDirection: 'row', paddingHorizontal: spacing['5'], paddingVertical: spacing['2'], gap: spacing['2'] },
  filterChip:           { paddingHorizontal: spacing['3'], paddingVertical: spacing['2'], borderRadius: radii.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  filterChipActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText:       { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  filterChipTextActive: { color: colors.white },

  list: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  card:           { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], gap: spacing['3'], ...shadows.sm },
  cardInactive:   { opacity: 0.65 },
  avatar:         { width: 52, height: 52, borderRadius: radii.full, borderWidth: 2, borderColor: colors.primary },
  avatarInactive: { borderColor: colors.border },
  avatarPlaceholder: { width: 52, height: 52, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary },
  avatarInitial:  { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.white },

  info:         { flex: 1 },
  nameRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing['2'], flexWrap: 'wrap' },
  name:         { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  nameInactive: { color: colors.textSecondary },

  // Badge de status
  statusBadge:         { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 2 },
  statusActive:        { backgroundColor: `${colors.success}20` },
  statusInactive:      { backgroundColor: colors.surfaceHigh },
  statusDot:           { width: 6, height: 6, borderRadius: 3 },
  statusDotActive:     { backgroundColor: colors.success },
  statusDotInactive:   { backgroundColor: colors.textDisabled },
  statusText:          { fontFamily: typography.family.medium, fontSize: 10 },
  statusTextActive:    { color: colors.success },
  statusTextInactive:  { color: colors.textDisabled },

  tags:    { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['1'], marginTop: spacing['2'] },
  tag:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.surfaceHigh, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 3 },
  tagText: { fontFamily: typography.family.regular, fontSize: 10, color: colors.textSecondary },

  empty:     { alignItems: 'center', marginTop: spacing['10'], gap: spacing['3'] },
  emptyText: { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textDisabled },
})
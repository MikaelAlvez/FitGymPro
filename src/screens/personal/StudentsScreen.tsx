import React, { useState, useEffect, useCallback } from 'react'
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

export function StudentsScreen() {
  const navigation = useNavigation<any>()

  const [students,   setStudents]   = useState<Student[]>([])
  const [filtered,   setFiltered]   = useState<Student[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search,     setSearch]     = useState('')

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await apiRequest<Student[]>('/user/my-students', { authenticated: true })
      setStudents(data)
      setFiltered(data)
    } catch {
      // silencia
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      q ? students.filter(s => s.name.toLowerCase().includes(q)) : students,
    )
  }, [search, students])

  const renderStudent = ({ item }: { item: Student }) => {
    const avatarUrl  = item.avatar ? `${getBaseUrl()}${item.avatar}` : null
    const initials   = item.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    const experience = item.studentProfile?.experience
      ? EXPERIENCE_LABEL[item.studentProfile.experience] ?? item.studentProfile.experience
      : null

    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => navigation.navigate('StudentDetail', { student: item })}
        activeOpacity={0.8}
      >
        {avatarUrl
          ? <Image source={{ uri: avatarUrl }} style={s.avatar} />
          : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarInitial}>{initials}</Text>
            </View>
          )
        }
        <View style={s.info}>
          <Text style={s.name}>{item.name}</Text>
          <View style={s.tags}>
            {item.studentProfile?.goal && (
              <View style={s.tag}>
                <Ionicons name="fitness-outline" size={11} color={colors.primary} />
                <Text style={s.tagText}>{item.studentProfile.goal}</Text>
              </View>
            )}
            {experience && (
              <View style={s.tag}>
                <Ionicons name="bar-chart-outline" size={11} color={colors.textSecondary} />
                <Text style={s.tagText}>{experience}</Text>
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
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Meus Alunos</Text>
        <Text style={s.headerSub}>{students.length} aluno{students.length !== 1 ? 's' : ''} vinculado{students.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Busca */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar aluno..."
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
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
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true) }} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={48} color={colors.textDisabled} />
              <Text style={s.emptyText}>
                {search ? 'Nenhum aluno encontrado' : 'Nenhum aluno vinculado ainda'}
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

  searchRow: { paddingHorizontal: spacing['5'], paddingVertical: spacing['3'] },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 48, paddingHorizontal: spacing['4'], gap: spacing['2'] },
  searchInput: { flex: 1, fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },

  list: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  card:              { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], gap: spacing['3'], ...shadows.sm },
  avatar:            { width: 52, height: 52, borderRadius: radii.full, borderWidth: 2, borderColor: colors.primary },
  avatarPlaceholder: { width: 52, height: 52, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary },
  avatarInitial:     { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.white },

  info:    { flex: 1 },
  name:    { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  tags:    { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['1'], marginTop: spacing['2'] },
  tag:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.surfaceHigh, borderRadius: radii.full, paddingHorizontal: spacing['2'], paddingVertical: 3 },
  tagText: { fontFamily: typography.family.regular, fontSize: 10, color: colors.textSecondary },

  empty:     { alignItems: 'center', marginTop: spacing['10'], gap: spacing['3'] },
  emptyText: { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textDisabled },
})
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, FlatList, Image, Modal, Alert,
  ActivityIndicator, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { useAuth }     from '../../contexts/AuthContext'
import { apiRequest }  from '../../services/api'
import { userService } from '../../services/user.service'
import type { PersonalProfile } from '../../services/user.service'
import { colors, typography, spacing, radii, shadows } from '../../theme'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { getBaseUrl } from '../../utils/getBaseUrl'

// Adicionado active
interface Student {
  id:     string
  name:   string
  avatar: string | null
  active: boolean
  studentProfile: { goal: string } | null
}

function calcIMC(weight: string, height: string): string {
  const w = parseFloat(weight)
  const h = parseFloat(height) / 100
  if (!w || !h) return '—'
  return (w / (h * h)).toFixed(1)
}

function imcInfo(imc: string): { label: string; color: string } {
  const v = parseFloat(imc)
  if (isNaN(v)) return { label: '',               color: colors.textSecondary }
  if (v < 18.5) return { label: 'Abaixo do peso', color: '#F59E0B' }
  if (v < 24.9) return { label: 'Peso normal',    color: colors.success }
  if (v < 29.9) return { label: 'Sobrepeso',      color: '#F59E0B' }
  return             { label: 'Obesidade',         color: colors.error }
}

const MOCK_AGENDA = [
  { id: '1', name: 'Carlos Silva', time: '08:00', type: 'Presencial', done: true  },
  { id: '2', name: 'Ana Souza',    time: '09:30', type: 'Online',     done: false },
  { id: '3', name: 'Pedro Lima',   time: '11:00', type: 'Presencial', done: false },
  { id: '4', name: 'Julia Mendes', time: '14:00', type: 'Híbrido',    done: false },
]

const MOCK_WORKOUTS = [
  { id: '1', name: 'Treino A — Peito e Tríceps', students: 4, updatedAt: 'hoje'      },
  { id: '2', name: 'Treino B — Costas e Bíceps', students: 3, updatedAt: 'ontem'     },
  { id: '3', name: 'Treino C — Pernas e Ombros', students: 5, updatedAt: 'há 3 dias' },
]

export function PersonalHomeScreen() {
  const { user, signOut } = useAuth()
  const navigation        = useNavigation<any>()
  const firstName = user?.name?.split(' ')[0] ?? 'Personal'
  const avatarUrl = user?.avatar ? `${getBaseUrl()}${user.avatar}` : null
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const [weight,         setWeight]         = useState('')
  const [height,         setHeight]         = useState('')
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [metricsModal,   setMetricsModal]   = useState(false)
  const [weightInput,    setWeightInput]    = useState('')
  const [heightInput,    setHeightInput]    = useState('')
  const [savingMetrics,  setSavingMetrics]  = useState(false)
  const [menuVisible,    setMenuVisible]    = useState(false)
  const [students,        setStudents]        = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)

  const doneAgenda     = MOCK_AGENDA.filter(a => a.done).length

  // Contagens separadas
  const totalStudents  = students.length
  const activeStudents = students.filter(s => s.active).length

  useEffect(() => {
    ;(async () => {
      try {
        if ((user as any)?.weight && (user as any)?.height) {
          setWeight((user as any).weight)
          setHeight((user as any).height)
          return
        }
        const data = await apiRequest<{ personalProfile: PersonalProfile }>(
          '/auth/me/profile',
          { authenticated: true },
        )
        if (data?.personalProfile?.weight) setWeight(data.personalProfile.weight)
        if (data?.personalProfile?.height) setHeight(data.personalProfile.height)
      } catch {
        // silencia
      } finally {
        setLoadingMetrics(false)
      }
    })()
  }, [])

  const loadStudents = useCallback(async () => {
    try {
      const data = await apiRequest<Student[]>('/user/my-students', { authenticated: true })
      setStudents(data)
    } catch {
      // silencia
    } finally {
      setLoadingStudents(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => { loadStudents() }, [loadStudents]),
  )

  const imc     = calcIMC(weight, height)
  const imcData = imcInfo(imc)
  const liveImc = calcIMC(weightInput, heightInput)

  const openMetricsModal = () => {
    setWeightInput(weight)
    setHeightInput(height)
    setMetricsModal(true)
  }

  const handleSaveMetrics = async () => {
    if (!weightInput || !heightInput) {
      Alert.alert('Atenção', 'Preencha peso e altura.')
      return
    }
    try {
      setSavingMetrics(true)
      const result = await userService.updateMetrics({ weight: weightInput, height: heightInput })
      if (result.personalProfile) {
        setWeight(result.personalProfile.weight ?? '')
        setHeight(result.personalProfile.height ?? '')
      }
      setMetricsModal(false)
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar as métricas.')
    } finally {
      setSavingMetrics(false)
    }
  }

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

        {/* ── Header ── */}
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
              <Text style={s.greeting}>Olá, {firstName} 👋</Text>
              <Text style={s.date}>{today}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.menuBtn} onPress={() => setMenuVisible(true)}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* ── Resumo de alunos ── */}
        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { backgroundColor: colors.primary }]}>
            <Ionicons name="people" size={22} color={colors.white} />
            <Text style={[s.summaryNumber, { color: colors.white }]}>{totalStudents}</Text>
            <Text style={[s.summaryLabel,  { color: colors.white }]}>Total</Text>
          </View>
          <View style={s.summaryCard}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Text style={s.summaryNumber}>{activeStudents}</Text>
            <Text style={s.summaryLabel}>Ativos</Text>
          </View>
          <View style={s.summaryCard}>
            <Ionicons name="time" size={22} color="#F59E0B" />
            <Text style={s.summaryNumber}>{doneAgenda}</Text>
            <Text style={s.summaryLabel}>Sessões hoje</Text>
          </View>
        </View>

        {/* ── Métricas do personal ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Minhas métricas</Text>
          <TouchableOpacity style={s.editBtn} onPress={openMetricsModal} activeOpacity={0.7}>
            <Ionicons name="pencil-outline" size={15} color={colors.primary} />
            <Text style={s.editBtnText}>Editar</Text>
          </TouchableOpacity>
        </View>

        {loadingMetrics ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing['4'] }} />
        ) : (
          <>
            <View style={s.metricsRow}>
              <View style={s.metricCard}>
                <Ionicons name="scale-outline" size={20} color={colors.primary} />
                <Text style={s.metricValue}>{weight ? `${weight} kg` : '—'}</Text>
                <Text style={s.metricLabel}>Peso</Text>
              </View>
              <View style={s.metricCard}>
                <Ionicons name="resize-outline" size={20} color={colors.primary} />
                <Text style={s.metricValue}>{height ? `${height} cm` : '—'}</Text>
                <Text style={s.metricLabel}>Altura</Text>
              </View>
              <View style={s.metricCard}>
                <Ionicons name="analytics-outline" size={20} color={colors.primary} />
                <Text style={s.metricValue}>{imc}</Text>
                <Text style={s.metricLabel}>IMC</Text>
              </View>
            </View>
            {weight && height && (
              <Text style={[s.imcLabel, { color: imcData.color }]}>{imcData.label}</Text>
            )}
          </>
        )}

        {/* ── Agenda do dia ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Agenda de hoje</Text>
          <Text style={s.sectionSub}>{doneAgenda}/{MOCK_AGENDA.length} concluídas</Text>
        </View>
        {MOCK_AGENDA.map(item => (
          <View key={item.id} style={[s.agendaCard, item.done && s.agendaCardDone]}>
            <View style={[s.agendaLine, item.done && s.agendaLineDone]} />
            <View style={s.agendaInfo}>
              <Text style={[s.agendaName, item.done && s.textDone]}>{item.name}</Text>
              <View style={s.agendaMeta}>
                <Ionicons name="time-outline" size={12} color={item.done ? colors.textDisabled : colors.textSecondary} />
                <Text style={[s.agendaMetaText, item.done && s.textDone]}>{item.time}</Text>
                <View style={s.dot} />
                <Text style={[s.agendaMetaText, item.done && s.textDone]}>{item.type}</Text>
              </View>
            </View>
            <Ionicons
              name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={item.done ? colors.success : colors.border}
            />
          </View>
        ))}

        {/* ── Meus alunos ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Meus alunos</Text>
          <TouchableOpacity>
            <Text style={s.seeAll}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        {loadingStudents ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing['3'] }} />
        ) : students.length === 0 ? (
          <View style={s.emptyStudents}>
            <Ionicons name="people-outline" size={32} color={colors.textDisabled} />
            <Text style={s.emptyStudentsText}>Nenhum aluno vinculado ainda</Text>
          </View>
        ) : (
          <FlatList
            data={students}
            keyExtractor={i => i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.studentsRow}
            renderItem={({ item }) => {
              const avatarUrl = item.avatar ? `${getBaseUrl()}${item.avatar}` : null
              const initials  = item.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
              return (
                <TouchableOpacity
                  style={[s.studentChip, !item.active && { opacity: 0.5 }]} 
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('StudentsStack', {
                    screen: 'StudentDetail',
                    params: { student: item },
                  })}
                >
                  {avatarUrl
                    ? <Image source={{ uri: avatarUrl }} style={[s.studentAvatar, !item.active && { borderColor: colors.border }]} />
                    : (
                      <View style={s.studentAvatarPlaceholder}>
                        <Text style={s.studentAvatarText}>{initials}</Text>
                      </View>
                    )
                  }
                  <Text style={s.studentName} numberOfLines={1}>{item.name.split(' ')[0]}</Text>
                  {/* Mostra Inativo ou objetivo */}
                  <Text style={[s.studentGoal, !item.active && { color: colors.error }]} numberOfLines={1}>
                    {item.active ? (item.studentProfile?.goal ?? '—') : 'Inativo'}
                  </Text>
                </TouchableOpacity>
              )
            }}
          />
        )}

        {/* ── Treinos criados ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Treinos criados</Text>
          <TouchableOpacity>
            <Text style={s.seeAll}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        {MOCK_WORKOUTS.map(item => (
          <TouchableOpacity key={item.id} style={s.workoutCard} activeOpacity={0.8}>
            <View style={s.workoutIcon}>
              <Ionicons name="barbell" size={22} color={colors.primary} />
            </View>
            <View style={s.workoutInfo}>
              <Text style={s.workoutName} numberOfLines={1}>{item.name}</Text>
              <Text style={s.workoutMeta}>{item.students} alunos · Atualizado {item.updatedAt}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}

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
              <TextInput
                style={s.input}
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="numeric"
                placeholder="Ex: 80.0"
                placeholderTextColor={colors.textDisabled}
              />
            </View>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Altura (cm)</Text>
              <TextInput
                style={s.input}
                value={heightInput}
                onChangeText={setHeightInput}
                keyboardType="numeric"
                placeholder="Ex: 178"
                placeholderTextColor={colors.textDisabled}
              />
            </View>
            {weightInput && heightInput ? (
              <View style={s.imcPreview}>
                <Ionicons name="analytics-outline" size={18} color={colors.primary} />
                <Text style={s.imcPreviewText}>
                  IMC calculado:{' '}
                  <Text style={{ color: imcInfo(liveImc).color, fontFamily: typography.family.bold }}>
                    {liveImc} — {imcInfo(liveImc).label}
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

  summaryRow:    { flexDirection: 'row', gap: spacing['3'], marginBottom: spacing['2'] },
  summaryCard:   { flex: 1, backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], alignItems: 'center', gap: spacing['1'], ...shadows.sm },
  summaryNumber: { fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary },
  summaryLabel:  { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, textAlign: 'center' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing['5'], marginBottom: spacing['3'] },
  sectionTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  sectionSub:    { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary },
  seeAll:        { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.primary },

  editBtn:     { flexDirection: 'row', alignItems: 'center', gap: spacing['1'] },
  editBtnText: { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.primary },

  metricsRow:  { flexDirection: 'row', gap: spacing['3'], marginBottom: spacing['1'] },
  metricCard:  { flex: 1, backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], alignItems: 'center', gap: spacing['2'], ...shadows.sm },
  metricValue: { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.textPrimary },
  metricLabel: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },
  imcLabel:    { fontFamily: typography.family.medium, fontSize: typography.size.xs, textAlign: 'center', marginBottom: spacing['2'] },

  agendaCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], gap: spacing['3'], ...shadows.sm },
  agendaCardDone: { opacity: 0.5 },
  agendaLine:     { width: 3, height: 36, borderRadius: radii.full, backgroundColor: colors.primary },
  agendaLineDone: { backgroundColor: colors.success },
  agendaInfo:     { flex: 1 },
  agendaName:     { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  agendaMeta:     { flexDirection: 'row', alignItems: 'center', gap: spacing['1'], marginTop: spacing['1'] },
  agendaMetaText: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },
  dot:            { width: 3, height: 3, borderRadius: radii.full, backgroundColor: colors.textDisabled },
  textDone:       { color: colors.textDisabled },

  studentsRow:             { gap: spacing['3'], paddingVertical: spacing['2'] },
  studentChip:             { width: 90, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['3'], gap: spacing['2'], ...shadows.sm },
  studentAvatar:           { width: 44, height: 44, borderRadius: radii.full, borderWidth: 2, borderColor: colors.primary },
  studentAvatarPlaceholder:{ width: 44, height: 44, borderRadius: radii.full, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  studentAvatarText:       { fontFamily: typography.family.bold, fontSize: typography.size.sm, color: colors.white },
  studentName:             { fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.textPrimary },
  studentGoal:             { fontFamily: typography.family.regular, fontSize: 9, color: colors.textSecondary, textAlign: 'center' },

  emptyStudents:     { alignItems: 'center', gap: spacing['2'], paddingVertical: spacing['4'] },
  emptyStudentsText: { fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textDisabled },

  workoutCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing['4'], marginBottom: spacing['3'], gap: spacing['3'], ...shadows.sm },
  workoutIcon: { width: 44, height: 44, borderRadius: radii.lg, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  workoutInfo: { flex: 1 },
  workoutName: { fontFamily: typography.family.semiBold, fontSize: typography.size.md, color: colors.textPrimary },
  workoutMeta: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: spacing['1'] },

  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:         { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], paddingBottom: spacing['8'] },
  sheetHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['6'], paddingVertical: spacing['4'], borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle:    { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  sheetBody:     { padding: spacing['6'], gap: spacing['4'] },
  inputGroup:    { gap: spacing['1'] },
  inputLabel:    { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  input:         { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 52, paddingHorizontal: spacing['4'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  imcPreview:    { flexDirection: 'row', alignItems: 'center', gap: spacing['2'], backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'] },
  imcPreviewText:{ fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textSecondary, flex: 1 },
  saveBtn:       { backgroundColor: colors.primary, borderRadius: radii.lg, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: spacing['2'] },
  saveBtnText:   { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },

  menuOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  menuBox:            { position: 'absolute', top: 90, right: spacing['5'], backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, ...shadows.md, minWidth: 160 },
  menuItem:           { flexDirection: 'row', alignItems: 'center', gap: spacing['3'], paddingVertical: spacing['4'], paddingHorizontal: spacing['4'] },
  menuItemTextDanger: { fontFamily: typography.family.medium, fontSize: typography.size.md, color: colors.error },
})
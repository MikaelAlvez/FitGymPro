import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, FlatList, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '../../contexts/AuthContext';
import { colors, typography, spacing, radii, shadows } from '../../theme';

// ─── Config ──────────────────────────────────
const getBaseUrl = () => {
  const host = Constants.expoConfig?.hostUri
    ?? Constants.manifest2?.extra?.expoGo?.debuggerHost
    ?? Constants.manifest?.debuggerHost
  if (host) return `http://${host.split(':')[0]}:3333`
  return 'http://10.0.2.2:3333'
}

// ─── Mock data ───────────────────────────────
const AGENDA = [
  { id: '1', name: 'Carlos Silva',  time: '08:00', type: 'Presencial', done: true  },
  { id: '2', name: 'Ana Souza',     time: '09:30', type: 'Online',     done: false },
  { id: '3', name: 'Pedro Lima',    time: '11:00', type: 'Presencial', done: false },
  { id: '4', name: 'Julia Mendes',  time: '14:00', type: 'Híbrido',    done: false },
];

const STUDENTS = [
  { id: '1', name: 'Carlos Silva',  goal: 'Hipertrofia',     initials: 'CS' },
  { id: '2', name: 'Ana Souza',     goal: 'Emagrecimento',   initials: 'AS' },
  { id: '3', name: 'Pedro Lima',    goal: 'Resistência',     initials: 'PL' },
  { id: '4', name: 'Julia Mendes',  goal: 'Hipertrofia',     initials: 'JM' },
  { id: '5', name: 'Marcos Rocha',  goal: 'Condicionamento', initials: 'MR' },
];

const WORKOUTS = [
  { id: '1', name: 'Treino A — Peito e Tríceps', students: 4, updatedAt: 'hoje'      },
  { id: '2', name: 'Treino B — Costas e Bíceps', students: 3, updatedAt: 'ontem'     },
  { id: '3', name: 'Treino C — Pernas e Ombros', students: 5, updatedAt: 'há 3 dias' },
];

// ─── Sub-componentes ─────────────────────────
function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={s.seeAll}>Ver todos</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function AgendaCard({ item }: { item: typeof AGENDA[0] }) {
  return (
    <View style={[s.agendaCard, item.done && s.agendaCardDone]}>
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
      {item.done
        ? <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        : <Ionicons name="ellipse-outline"  size={20} color={colors.border}  />
      }
    </View>
  );
}

function StudentChip({ item }: { item: typeof STUDENTS[0] }) {
  return (
    <TouchableOpacity style={s.studentChip} activeOpacity={0.8}>
      <View style={s.studentAvatar}>
        <Text style={s.studentAvatarText}>{item.initials}</Text>
      </View>
      <Text style={s.studentName} numberOfLines={1}>{item.name.split(' ')[0]}</Text>
      <Text style={s.studentGoal} numberOfLines={1}>{item.goal}</Text>
    </TouchableOpacity>
  );
}

function WorkoutCard({ item }: { item: typeof WORKOUTS[0] }) {
  return (
    <TouchableOpacity style={s.workoutCard} activeOpacity={0.8}>
      <View style={s.workoutIcon}>
        <Ionicons name="barbell" size={22} color={colors.primary} />
      </View>
      <View style={s.workoutInfo}>
        <Text style={s.workoutName} numberOfLines={1}>{item.name}</Text>
        <Text style={s.workoutMeta}>{item.students} alunos · Atualizado {item.updatedAt}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────
export function PersonalHomeScreen() {
  const { user } = useAuth()
  const firstName = user?.name?.split(' ')[0] ?? 'Personal'
  const avatarUrl = user?.avatar ? `${getBaseUrl()}${user.avatar}` : null
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const doneCount    = AGENDA.filter(a => a.done).length
  const pendingCount = AGENDA.length - doneCount

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={s.headerAvatar} />
            ) : (
              <View style={s.headerAvatarPlaceholder}>
                <Text style={s.headerAvatarInitial}>
                  {firstName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={s.greeting}>Olá, {firstName} 👋</Text>
              <Text style={s.date}>{today}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
            <View style={s.notifBadge} />
          </TouchableOpacity>
        </View>

        {/* Cards de resumo */}
        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { backgroundColor: colors.primary }]}>
            <Ionicons name="people" size={20} color={colors.white} />
            <Text style={s.summaryNumber}>{STUDENTS.length}</Text>
            <Text style={s.summaryLabel}>Alunos</Text>
          </View>
          <View style={s.summaryCard}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={s.summaryNumber}>{doneCount}</Text>
            <Text style={s.summaryLabel}>Concluídos</Text>
          </View>
          <View style={s.summaryCard}>
            <Ionicons name="time" size={20} color={colors.warning} />
            <Text style={s.summaryNumber}>{pendingCount}</Text>
            <Text style={s.summaryLabel}>Pendentes</Text>
          </View>
        </View>

        {/* Agenda do dia */}
        <SectionHeader title="Agenda de hoje" />
        {AGENDA.map(item => <AgendaCard key={item.id} item={item} />)}

        {/* Alunos */}
        <SectionHeader title="Meus alunos" onSeeAll={() => {}} />
        <FlatList
          data={STUDENTS}
          keyExtractor={i => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.studentsRow}
          renderItem={({ item }) => <StudentChip item={item} />}
        />

        {/* Treinos */}
        <SectionHeader title="Treinos criados" onSeeAll={() => {}} />
        {WORKOUTS.map(item => <WorkoutCard key={item.id} item={item} />)}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing['5'], paddingBottom: spacing['10'] },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing['5'],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
  },
  headerAvatar: {
    width: 46, height: 46,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  headerAvatarPlaceholder: {
    width: 46, height: 46,
    borderRadius: radii.full,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  headerAvatarInitial: {
    fontFamily: typography.family.bold,
    fontSize: typography.size.lg,
    color: colors.white,
  },
  greeting: {
    fontFamily: typography.family.bold,
    fontSize: typography.size.xl,
    color: colors.textPrimary,
  },
  date: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: spacing['1'],
    textTransform: 'capitalize',
  },
  notifBtn: {
    width: 40, height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 8, right: 8,
    width: 8, height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    gap: spacing['3'],
    marginBottom: spacing['6'],
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing['4'],
    alignItems: 'center',
    gap: spacing['1'],
    ...shadows.sm,
  },
  summaryNumber: {
    fontFamily: typography.family.bold,
    fontSize: typography.size.xl,
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['3'],
    marginTop: spacing['5'],
  },
  sectionTitle: {
    fontFamily: typography.family.semiBold,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  seeAll: {
    fontFamily: typography.family.medium,
    fontSize: typography.size.sm,
    color: colors.primary,
  },

  // Agenda
  agendaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing['4'],
    marginBottom: spacing['3'],
    gap: spacing['3'],
    ...shadows.sm,
  },
  agendaCardDone: { opacity: 0.5 },
  agendaLine: {
    width: 3, height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  agendaLineDone: { backgroundColor: colors.success },
  agendaInfo:     { flex: 1 },
  agendaName: {
    fontFamily: typography.family.semiBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  agendaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['1'],
    marginTop: spacing['1'],
  },
  agendaMetaText: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  dot: {
    width: 3, height: 3,
    borderRadius: radii.full,
    backgroundColor: colors.textDisabled,
  },
  textDone: { color: colors.textDisabled },

  // Students
  studentsRow: { gap: spacing['3'], paddingVertical: spacing['2'] },
  studentChip: {
    width: 90,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing['3'],
    gap: spacing['2'],
    ...shadows.sm,
  },
  studentAvatar: {
    width: 44, height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: {
    fontFamily: typography.family.bold,
    fontSize: typography.size.sm,
    color: colors.white,
  },
  studentName: {
    fontFamily: typography.family.semiBold,
    fontSize: typography.size.xs,
    color: colors.textPrimary,
  },
  studentGoal: {
    fontFamily: typography.family.regular,
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Workouts
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing['4'],
    marginBottom: spacing['3'],
    gap: spacing['3'],
    ...shadows.sm,
  },
  workoutIcon: {
    width: 44, height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutInfo: { flex: 1 },
  workoutName: {
    fontFamily: typography.family.semiBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  workoutMeta: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: spacing['1'],
  },
});
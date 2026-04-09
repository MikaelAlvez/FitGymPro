import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { colors, typography, spacing, radii, shadows } from '../../theme';

// ─── Mock data ───────────────────────────────
const METRICS = [
  { label: 'Peso',   value: '78 kg',  icon: 'scale-outline'       as const },
  { label: 'Altura', value: '175 cm', icon: 'resize-outline'       as const },
  { label: 'IMC',    value: '25.5',   icon: 'analytics-outline'    as const },
  { label: 'Gordura', value: '18%',   icon: 'fitness-outline'      as const },
];

const WORKOUT = {
  name: 'Treino A — Peito e Tríceps',
  personal: 'João Personal',
  exercises: [
    { id: '1', name: 'Supino reto',         sets: '4x12', done: true  },
    { id: '2', name: 'Crucifixo',           sets: '3x15', done: true  },
    { id: '3', name: 'Supino inclinado',    sets: '3x12', done: false },
    { id: '4', name: 'Tríceps pulley',      sets: '4x12', done: false },
    { id: '5', name: 'Tríceps francês',     sets: '3x12', done: false },
  ],
};

// ─── Screen ──────────────────────────────────
export function StudentHomeScreen() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'Aluno';
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const [exercises, setExercises] = useState(WORKOUT.exercises);
  const doneCount = exercises.filter(e => e.done).length;
  const progress  = doneCount / exercises.length;

  const toggleExercise = (id: string) =>
    setExercises(prev => prev.map(e => e.id === id ? { ...e, done: !e.done } : e));

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Olá, {firstName} 💪</Text>
            <Text style={s.date}>{today}</Text>
          </View>
          <TouchableOpacity style={s.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Métricas corporais */}
        <Text style={s.sectionTitle}>Minhas métricas</Text>
        <View style={s.metricsGrid}>
          {METRICS.map(m => (
            <View key={m.label} style={s.metricCard}>
              <Ionicons name={m.icon} size={20} color={colors.primary} />
              <Text style={s.metricValue}>{m.value}</Text>
              <Text style={s.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Treino do dia */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Treino de hoje</Text>
          <View style={s.progressBadge}>
            <Text style={s.progressBadgeText}>{doneCount}/{exercises.length}</Text>
          </View>
        </View>

        {/* Card do treino */}
        <View style={s.workoutCard}>
          {/* Info */}
          <View style={s.workoutHeader}>
            <View style={s.workoutIconBox}>
              <Ionicons name="barbell" size={20} color={colors.primary} />
            </View>
            <View style={s.workoutInfo}>
              <Text style={s.workoutName}>{WORKOUT.name}</Text>
              <Text style={s.workoutPersonal}>Personal: {WORKOUT.personal}</Text>
            </View>
          </View>

          {/* Barra de progresso */}
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
          </View>
          <Text style={s.progressText}>
            {Math.round(progress * 100)}% concluído
          </Text>

          {/* Lista de exercícios */}
          <View style={s.exerciseList}>
            {exercises.map((ex, i) => (
              <TouchableOpacity
                key={ex.id}
                style={[s.exerciseRow, i < exercises.length - 1 && s.exerciseDivider]}
                onPress={() => toggleExercise(ex.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={ex.done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={ex.done ? colors.success : colors.border}
                />
                <View style={s.exerciseInfo}>
                  <Text style={[s.exerciseName, ex.done && s.exerciseDone]}>
                    {ex.name}
                  </Text>
                  <Text style={s.exerciseSets}>{ex.sets}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

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

  // Métricas
  sectionTitle: {
    fontFamily: typography.family.semiBold,
    fontSize: typography.size.base,
    color: colors.textPrimary,
    marginBottom: spacing['3'],
    marginTop: spacing['5'],
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['3'],
    marginBottom: spacing['2'],
  },
  metricCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing['4'],
    alignItems: 'center',
    gap: spacing['2'],
    ...shadows.sm,
  },
  metricValue: {
    fontFamily: typography.family.bold,
    fontSize: typography.size.xl,
    color: colors.textPrimary,
  },
  metricLabel: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },

  // Section header com badge
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    marginTop: spacing['5'],
    marginBottom: spacing['3'],
  },
  progressBadge: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: spacing['2'],
    paddingVertical: 2,
  },
  progressBadgeText: {
    fontFamily: typography.family.bold,
    fontSize: typography.size.xs,
    color: colors.white,
  },

  // Workout card
  workoutCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing['5'],
    ...shadows.md,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    marginBottom: spacing['4'],
  },
  workoutIconBox: {
    width: 44, height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutInfo:    { flex: 1 },
  workoutName: {
    fontFamily: typography.family.semiBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  workoutPersonal: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Progress bar
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.full,
    overflow: 'hidden',
    marginBottom: spacing['1'],
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  progressText: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: spacing['4'],
  },

  // Exercises
  exerciseList:    { gap: 0 },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
    paddingVertical: spacing['3'],
  },
  exerciseDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: {
    fontFamily: typography.family.medium,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  exerciseDone: {
    textDecorationLine: 'line-through',
    color: colors.textDisabled,
  },
  exerciseSets: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
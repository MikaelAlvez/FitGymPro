import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Exercise, Workout } from '../../services/workout.service'
import { colors, typography, spacing, radii } from '../../theme'

export const generateGroupId = () => Math.random().toString(36).slice(2, 8)

const DAYS = [
  { key: 'monday',    label: 'Seg' },
  { key: 'tuesday',   label: 'Ter' },
  { key: 'wednesday', label: 'Qua' },
  { key: 'thursday',  label: 'Qui' },
  { key: 'friday',    label: 'Sex' },
  { key: 'saturday',  label: 'Sáb' },
  { key: 'sunday',    label: 'Dom' },
]

const GROUP_OPTIONS = [
  { label: 'Bisset', max: 2 },
  { label: 'Triset', max: 3 },
]

interface Props {
  visible:         boolean
  onClose:         () => void
  onSave:          (payload: WorkoutPayload) => Promise<void>
  editingWorkout?: Workout | null
  title?:          string
}

export interface WorkoutPayload {
  name:      string
  days:      string[]
  notes?:    string
  exercises: Exercise[]
}

export function WorkoutFormModal({ visible, onClose, onSave, editingWorkout, title }: Props) {
  const [saving,    setSaving]    = useState(false)
  const [wName,     setWName]     = useState('')
  const [wDays,     setWDays]     = useState<string[]>([])
  const [wNotes,    setWNotes]    = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: '', sets: '', reps: '', order: 0, type: 'exercise', load: '', restTime: '' },
  ])

  useEffect(() => {
    if (!visible) return
    if (editingWorkout) {
      setWName(editingWorkout.name)
      setWDays(editingWorkout.days)
      setWNotes(editingWorkout.notes ?? '')
      setExercises(
        editingWorkout.exercises.length > 0
          ? editingWorkout.exercises.map(e => ({
              name:       e.name,
              sets:       e.sets,
              reps:       e.reps,
              order:      e.order ?? 0,
              type:       e.type       ?? 'exercise' as const,
              groupId:    e.groupId    ?? undefined,
              groupLabel: e.groupLabel ?? undefined,
              duration:   e.duration   ?? undefined,
              load:       e.load       ?? '',
              restTime:   e.restTime   ?? '',
            }))
          : [{ name: '', sets: '', reps: '', order: 0, type: 'exercise' as const, load: '', restTime: '' }],
      )
    } else {
      setWName('')
      setWDays([])
      setWNotes('')
      setExercises([{ name: '', sets: '', reps: '', order: 0, type: 'exercise', load: '', restTime: '' }])
    }
  }, [visible, editingWorkout])

  const toggleDay = (day: string) =>
    setWDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])

  const updateExercise = (idx: number, field: keyof Exercise, value: string) =>
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))

  const removeExercise = (idx: number) => {
    const ex = exercises[idx]
    if (ex.type === 'exercise' && exercises.filter(e => e.type === 'exercise' && !e.groupId).length <= 1 && !ex.groupId) {
      Alert.alert('Atenção', 'O treino precisa ter ao menos um exercício.')
      return
    }
    setExercises(prev => prev.filter((_, i) => i !== idx))
  }

  const addExercise = () =>
    setExercises(prev => [...prev, { name: '', sets: '', reps: '', order: prev.length, type: 'exercise', load: '', restTime: '' }])

  const addCardio = () =>
    setExercises(prev => [...prev, { name: '', sets: '', reps: '', order: prev.length, type: 'cardio', duration: '00:30' }])

  const createGroup = (idx: number, label: string, max: number) => {
    const groupId = generateGroupId()
    setExercises(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], groupId, groupLabel: label }
      for (let n = 1; n < max; n++) {
        updated.splice(idx + n, 0, {
          name: '', sets: updated[idx].sets, reps: updated[idx].reps,
          load: updated[idx].load ?? '', restTime: updated[idx].restTime ?? '',
          order: idx + n, type: 'exercise', groupId, groupLabel: label,
        })
      }
      return updated
    })
  }

  const removeFromGroup = (idx: number) => {
    setExercises(prev => {
      const groupId   = prev[idx].groupId
      const updated   = prev.filter((_, i) => i !== idx)
      const remaining = updated.filter(e => e.groupId === groupId)
      if (remaining.length === 1) {
        return updated.map(e =>
          e.groupId === groupId ? { ...e, groupId: undefined, groupLabel: undefined } : e
        )
      }
      return updated
    })
  }

  const handleSave = async () => {
    if (!wName.trim()) { Alert.alert('Atenção', 'Informe o nome do treino.'); return }
    if (wDays.length === 0) { Alert.alert('Atenção', 'Selecione ao menos um dia.'); return }
    if (exercises.length === 0) { Alert.alert('Atenção', 'Adicione ao menos um exercício.'); return }

    const regularExercises = exercises.filter(e => e.type === 'exercise')
    if (regularExercises.some(e => !e.name.trim() || !e.sets.trim() || !e.reps.trim())) {
      Alert.alert('Atenção', 'Preencha nome, séries e repetições de todos os exercícios.')
      return
    }
    if (exercises.filter(e => e.type === 'cardio').some(e => !e.name.trim())) {
      Alert.alert('Atenção', 'Informe o nome do cardio.')
      return
    }

    try {
      setSaving(true)
      await onSave({
        name:      wName.trim(),
        days:      wDays,
        notes:     wNotes.trim() || undefined,
        exercises: exercises.map((e, i) => ({ ...e, order: i })),
      })
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  // Renderiza campos de um exercício (séries, reps, carga, descanso min:seg)
  const renderExerciseFields = (exItem: Exercise, exIdx: number) => {
    const restParts = (exItem.restTime ?? '').split(':')
    const restMins  = restParts[0] ?? ''
    const restSecs  = restParts[1] ?? ''

    return (
      <View style={s.fieldsGrid}>
        <View style={s.fieldItem}>
          <Text style={s.fieldLabel}>Séries</Text>
          <TextInput
            style={s.inputSmall}
            value={exItem.sets}
            onChangeText={v => updateExercise(exIdx, 'sets', v)}
            placeholder="4"
            placeholderTextColor={colors.textDisabled}
            keyboardType="numeric"
          />
        </View>

        <View style={s.fieldItem}>
          <Text style={s.fieldLabel}>Repetições</Text>
          <TextInput
            style={s.inputSmall}
            value={exItem.reps}
            onChangeText={v => updateExercise(exIdx, 'reps', v)}
            placeholder="12"
            placeholderTextColor={colors.textDisabled}
            keyboardType="numeric"
          />
        </View>

        <View style={s.fieldItem}>
          <Text style={s.fieldLabel}>Carga (opcional)</Text>
          <TextInput
            style={s.inputSmall}
            value={exItem.load ?? ''}
            onChangeText={v => updateExercise(exIdx, 'load', v)}
            placeholder="20kg"
            placeholderTextColor={colors.textDisabled}
          />
        </View>

        {/* Descanso em minutos e segundos */}
        <View style={s.fieldItem}>
          <Text style={s.fieldLabel}>Descanso (opcional)</Text>
          <View style={s.restTimeRow}>
            <TextInput
              style={[s.inputSmall, s.restTimeInput]}
              value={restMins}
              onChangeText={v => updateExercise(exIdx, 'restTime', `${v}:${restSecs || '00'}`)}
              placeholder="1"
              placeholderTextColor={colors.textDisabled}
              keyboardType="numeric"
              maxLength={2}
            />
            <Text style={s.restTimeSep}>:</Text>
            <TextInput
              style={[s.inputSmall, s.restTimeInput]}
              value={restSecs}
              onChangeText={v => updateExercise(exIdx, 'restTime', `${restMins || '0'}:${v}`)}
              placeholder="00"
              placeholderTextColor={colors.textDisabled}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
          <View style={s.restTimeLabels}>
            <Text style={s.restTimeUnit}>min</Text>
            <Text style={s.restTimeUnit}>seg</Text>
          </View>
        </View>
      </View>
    )
  }

  const renderExercises = () => {
    const nodes: React.ReactNode[] = []
    let i = 0

    while (i < exercises.length) {
      const ex  = exercises[i]
      const idx = i

      // ── Cardio ──────────────────────────
      if (ex.type === 'cardio') {
        const cardioIdx = idx
        nodes.push(
          <View key={`cardio-${cardioIdx}`} style={s.cardioForm}>
            <View style={s.exerciseFormHeader}>
              <View style={s.cardioLabel}>
                <Ionicons name="bicycle" size={14} color={colors.info} />
                <Text style={s.cardioLabelText}>Cardio</Text>
              </View>
              <TouchableOpacity onPress={() => removeExercise(cardioIdx)}>
                <Ionicons name="remove-circle-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={s.input}
              value={ex.name}
              onChangeText={v => updateExercise(cardioIdx, 'name', v)}
              placeholder="Ex: Esteira, Bicicleta, Elíptico..."
              placeholderTextColor={colors.textDisabled}
            />
            <View style={s.durationRow}>
              <View style={s.durationField}>
                <Text style={s.fieldLabel}>Horas</Text>
                <TextInput
                  style={s.inputSmall}
                  value={ex.duration?.split(':')[0] ?? '00'}
                  onChangeText={v => {
                    const mins = ex.duration?.split(':')[1] ?? '00'
                    updateExercise(cardioIdx, 'duration', `${v}:${mins}`)
                  }}
                  placeholder="00"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <Text style={s.durationSep}>:</Text>
              <View style={s.durationField}>
                <Text style={s.fieldLabel}>Minutos</Text>
                <TextInput
                  style={s.inputSmall}
                  value={ex.duration?.split(':')[1] ?? '30'}
                  onChangeText={v => {
                    const hrs = ex.duration?.split(':')[0] ?? '00'
                    updateExercise(cardioIdx, 'duration', `${hrs}:${v}`)
                  }}
                  placeholder="30"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
            </View>
          </View>
        )
        i++
        continue
      }

      // ── Grupo ───────────────────────────
      if (ex.groupId) {
        const groupId    = ex.groupId
        const groupLabel = ex.groupLabel ?? 'Grupo'
        const groupItems: { ex: Exercise; idx: number }[] = []

        while (i < exercises.length && exercises[i].groupId === groupId) {
          groupItems.push({ ex: exercises[i], idx: i })
          i++
        }

        nodes.push(
          <View key={`group-${groupId}`} style={s.groupContainer}>
            <View style={s.groupHeader}>
              <View style={s.groupLabelBadge}>
                <Ionicons name="git-merge-outline" size={13} color={colors.primary} />
                <Text style={s.groupLabelText}>{groupLabel}</Text>
              </View>
            </View>
            {groupItems.map(({ ex: gEx, idx: gIdx }, gi) => (
              <View key={`gex-${gIdx}`} style={[s.exerciseForm, gi < groupItems.length - 1 && s.exerciseFormGrouped]}>
                <View style={s.exerciseFormHeader}>
                  <Text style={s.exerciseFormIndex}>{String.fromCharCode(65 + gi)}</Text>
                  <TouchableOpacity onPress={() => removeFromGroup(gIdx)}>
                    <Ionicons name="remove-circle-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={s.input}
                  value={gEx.name}
                  onChangeText={v => updateExercise(gIdx, 'name', v)}
                  placeholder="Nome do exercício"
                  placeholderTextColor={colors.textDisabled}
                />
                {renderExerciseFields(gEx, gIdx)}
              </View>
            ))}
          </View>
        )
        continue
      }

      // ── Exercício simples ────────────────
      const simpleIdx = idx
      nodes.push(
        <View key={`ex-${simpleIdx}`} style={s.exerciseForm}>
          <View style={s.exerciseFormHeader}>
            <Text style={s.exerciseFormIndex}>#{simpleIdx + 1}</Text>
            <View style={s.exerciseFormActions}>
              <TouchableOpacity
                style={s.groupBtn}
                onPress={() => {
                  Alert.alert('Criar grupo', 'Selecione o tipo:', [
                    ...GROUP_OPTIONS.map(opt => ({
                      text:    opt.label,
                      onPress: () => createGroup(simpleIdx, opt.label, opt.max),
                    })),
                    { text: 'Cancelar', style: 'cancel' as const },
                  ])
                }}
              >
                <Ionicons name="git-merge-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => removeExercise(simpleIdx)}
                disabled={exercises.filter(e => e.type === 'exercise' && !e.groupId).length <= 1}
              >
                <Ionicons
                  name="remove-circle-outline"
                  size={20}
                  color={exercises.filter(e => e.type === 'exercise' && !e.groupId).length <= 1 ? colors.textDisabled : colors.error}
                />
              </TouchableOpacity>
            </View>
          </View>
          <TextInput
            style={s.input}
            value={ex.name}
            onChangeText={v => updateExercise(simpleIdx, 'name', v)}
            placeholder="Nome do exercício"
            placeholderTextColor={colors.textDisabled}
          />
          {renderExerciseFields(ex, simpleIdx)}
        </View>
      )
      i++
    }

    return nodes
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{title ?? (editingWorkout ? 'Editar treino' : 'Novo treino')}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.sheetBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Nome do treino *</Text>
            <TextInput style={s.input} value={wName} onChangeText={setWName} placeholder="Ex: Treino A — Peito" placeholderTextColor={colors.textDisabled} />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Dias da semana *</Text>
            <View style={s.daysSelector}>
              {DAYS.map(d => (
                <TouchableOpacity key={d.key} style={[s.daySelectorItem, wDays.includes(d.key) && s.daySelectorItemActive]} onPress={() => toggleDay(d.key)} activeOpacity={0.8}>
                  <Text style={[s.daySelectorText, wDays.includes(d.key) && s.daySelectorTextActive]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Exercícios *</Text>
            {renderExercises()}
            <View style={s.addButtonsRow}>
              <TouchableOpacity style={s.addExerciseBtn} onPress={addExercise} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={s.addExerciseBtnText}>Exercício</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.addExerciseBtn, s.addCardioBtnStyle]} onPress={addCardio} activeOpacity={0.8}>
                <Ionicons name="bicycle" size={18} color={colors.info} />
                <Text style={[s.addExerciseBtnText, { color: colors.info }]}>Cardio</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Observações (opcional)</Text>
            <TextInput style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]} value={wNotes} onChangeText={setWNotes} placeholder="Ex: Descanso de 60s entre séries..." placeholderTextColor={colors.textDisabled} multiline maxLength={500} />
          </View>

          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={s.saveBtnText}>{editingWorkout ? 'Salvar alterações' : 'Criar treino'}</Text>}
          </TouchableOpacity>

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
  sheetBody:   { padding: spacing['6'], gap: spacing['4'], paddingBottom: spacing['10'] },

  inputGroup:  { gap: spacing['2'] },
  inputLabel:  { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  input:       { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 52, paddingHorizontal: spacing['4'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  inputSmall:  { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 44, paddingHorizontal: spacing['2'], fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textPrimary, textAlign: 'center' },

  daysSelector:          { flexDirection: 'row', gap: spacing['2'], flexWrap: 'wrap' },
  daySelectorItem:       { paddingHorizontal: spacing['3'], paddingVertical: spacing['2'], borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceHigh },
  daySelectorItemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  daySelectorText:       { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  daySelectorTextActive: { color: colors.white },

  exerciseForm:        { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'], gap: spacing['2'], marginBottom: spacing['2'] },
  exerciseFormGrouped: { marginBottom: spacing['1'], borderBottomWidth: 1, borderBottomColor: colors.border },
  exerciseFormHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseFormIndex:   { fontFamily: typography.family.bold, fontSize: typography.size.sm, color: colors.primary },
  exerciseFormActions: { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  groupBtn:            { width: 28, height: 28, borderRadius: radii.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },

  fieldsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'] },
  fieldItem:   { width: '47%', gap: spacing['1'] },
  fieldLabel:  { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },

  // ✅ Descanso min:seg
  restTimeRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  restTimeInput:  { flex: 1 },
  restTimeSep:    { fontFamily: typography.family.bold, fontSize: typography.size.sm, color: colors.textSecondary },
  restTimeLabels: { flexDirection: 'row', marginTop: 2 },
  restTimeUnit:   { flex: 1, fontFamily: typography.family.regular, fontSize: 9, color: colors.textDisabled, textAlign: 'center' },

  groupContainer:  { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, marginBottom: spacing['2'], overflow: 'hidden', borderWidth: 1.5, borderColor: `${colors.primary}30` },
  groupHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing['3'], paddingVertical: spacing['2'], backgroundColor: `${colors.primary}10`, borderBottomWidth: 1, borderBottomColor: `${colors.primary}20` },
  groupLabelBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  groupLabelText:  { fontFamily: typography.family.bold, fontSize: typography.size.xs, color: colors.primary },

  cardioForm:      { backgroundColor: `${colors.info}10`, borderRadius: radii.lg, padding: spacing['3'], gap: spacing['2'], marginBottom: spacing['2'], borderWidth: 1.5, borderColor: `${colors.info}30` },
  cardioLabel:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardioLabelText: { fontFamily: typography.family.bold, fontSize: typography.size.xs, color: colors.info },
  durationRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  durationField:   { flex: 1, gap: spacing['1'] },
  durationSep:     { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.textSecondary, marginTop: spacing['3'] },

  addButtonsRow:     { flexDirection: 'row', gap: spacing['3'] },
  addExerciseBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], paddingVertical: spacing['3'], borderWidth: 1.5, borderColor: colors.primary, borderRadius: radii.lg, borderStyle: 'dashed' },
  addCardioBtnStyle: { borderColor: colors.info },
  addExerciseBtnText:{ fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.primary },

  saveBtn:     { backgroundColor: colors.primary, borderRadius: radii.lg, height: 52, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },
})
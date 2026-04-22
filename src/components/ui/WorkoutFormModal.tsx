import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Exercise, Workout } from '../../services/workout.service'
import { colors, typography, spacing, radii } from '../../theme'

// ─── Helpers ─────────────────────────────────
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

const GROUP_LABELS = ['Bisset', 'Conjugado', 'Triset', 'Progr. de Carga', 'Composto']

interface Props {
  visible:       boolean
  onClose:       () => void
  onSave:        (payload: WorkoutPayload) => Promise<void>
  editingWorkout?: Workout | null
  title?:        string
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
    { name: '', sets: '', reps: '', order: 0, type: 'exercise' },
  ])

  // Preenche form quando for edição
  useEffect(() => {
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
              type:       e.type       ?? 'exercise',
              groupId:    e.groupId    ?? undefined,
              groupLabel: e.groupLabel ?? undefined,
              duration:   e.duration   ?? undefined,
            }))
          : [{ name: '', sets: '', reps: '', order: 0, type: 'exercise' }],
      )
    } else {
      resetForm()
    }
  }, [editingWorkout, visible])

  const resetForm = () => {
    setWName(''); setWDays([]); setWNotes('')
    setExercises([{ name: '', sets: '', reps: '', order: 0, type: 'exercise' }])
  }

  const toggleDay = (day: string) =>
    setWDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])

  const updateExercise = (index: number, field: keyof Exercise, value: string) =>
    setExercises(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e))

  const removeExercise = (index: number) => {
    if (exercises.filter(e => e.type === 'exercise').length <= 1 && exercises[index].type === 'exercise') {
      Alert.alert('Atenção', 'O treino precisa ter ao menos um exercício.')
      return
    }
    setExercises(prev => prev.filter((_, i) => i !== index))
  }

  // Adicionar exercício normal
  const addExercise = () =>
    setExercises(prev => [...prev, { name: '', sets: '', reps: '', order: prev.length, type: 'exercise' }])

  // Adicionar cardio
  const addCardio = () =>
    setExercises(prev => [...prev, { name: '', sets: '', reps: '', order: prev.length, type: 'cardio', duration: '00:30' }])

  // Criar grupo (bisset/conjugado etc) a partir de um exercício existente
  const createGroup = (index: number, label: string) => {
    const groupId = generateGroupId()
    setExercises(prev => {
      const updated = [...prev]
      // Marca o exercício atual como parte do grupo
      updated[index] = { ...updated[index], groupId, groupLabel: label }
      // Insere novo exercício logo após, no mesmo grupo
      updated.splice(index + 1, 0, {
        name: '', sets: updated[index].sets, reps: updated[index].reps,
        order: index + 1, type: 'exercise', groupId, groupLabel: label,
      })
      return updated
    })
  }

  // Adicionar exercício ao grupo existente
  const addToGroup = (groupId: string, groupLabel: string, afterIndex: number) => {
    setExercises(prev => {
      const updated = [...prev]
      updated.splice(afterIndex + 1, 0, {
        name: '', sets: '', reps: '', order: afterIndex + 1,
        type: 'exercise', groupId, groupLabel,
      })
      return updated
    })
  }

  // Remover exercício do grupo (se restar 1 no grupo, remove o groupId de todos)
  const removeFromGroup = (index: number) => {
    setExercises(prev => {
      const groupId    = prev[index].groupId
      const updated    = prev.filter((_, i) => i !== index)
      const remaining  = updated.filter(e => e.groupId === groupId)
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

    const regularExercises = exercises.filter(e => e.type === 'exercise')
    if (regularExercises.some(e => !e.name.trim() || !e.sets.trim() || !e.reps.trim())) {
      Alert.alert('Atenção', 'Preencha todos os campos dos exercícios.')
      return
    }
    const cardioExercises = exercises.filter(e => e.type === 'cardio')
    if (cardioExercises.some(e => !e.name.trim())) {
      Alert.alert('Atenção', 'Informe o nome do cardio.')
      return
    }
    if (exercises.length === 0) {
      Alert.alert('Atenção', 'Adicione ao menos um exercício.')
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
      resetForm()
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  // ─── Renderiza exercícios agrupados ───────
  const renderExercises = () => {
    const rendered: React.ReactNode[] = []
    let i = 0

    while (i < exercises.length) {
      const ex = exercises[i]

      if (ex.type === 'cardio') {
        rendered.push(
          <View key={`cardio-${i}`} style={s.cardioForm}>
            <View style={s.exerciseFormHeader}>
              <View style={s.cardioLabel}>
                <Ionicons name="bicycle" size={14} color={colors.info} />
                <Text style={s.cardioLabelText}>Cardio</Text>
              </View>
              <TouchableOpacity onPress={() => removeExercise(i)}>
                <Ionicons name="remove-circle-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={s.input}
              value={ex.name}
              onChangeText={v => updateExercise(i, 'name', v)}
              placeholder="Ex: Esteira, Bicicleta, Elíptico..."
              placeholderTextColor={colors.textDisabled}
            />
            {/* Duração em horas e minutos */}
            <View style={s.durationRow}>
              <View style={s.durationField}>
                <Text style={s.setsRepsLabel}>Horas</Text>
                <TextInput
                  style={s.inputSmall}
                  value={ex.duration?.split(':')[0] ?? '00'}
                  onChangeText={v => {
                    const mins = ex.duration?.split(':')[1] ?? '00'
                    updateExercise(i, 'duration', `${v.padStart(2,'0')}:${mins}`)
                  }}
                  placeholder="00"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <Text style={s.durationSep}>:</Text>
              <View style={s.durationField}>
                <Text style={s.setsRepsLabel}>Minutos</Text>
                <TextInput
                  style={s.inputSmall}
                  value={ex.duration?.split(':')[1] ?? '30'}
                  onChangeText={v => {
                    const hrs = ex.duration?.split(':')[0] ?? '00'
                    updateExercise(i, 'duration', `${hrs}:${v.padStart(2,'0')}`)
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

      // Exercício em grupo
      if (ex.groupId) {
        const groupId    = ex.groupId
        const groupLabel = ex.groupLabel ?? 'Grupo'
        const groupItems: { ex: Exercise; idx: number }[] = []

        while (i < exercises.length && exercises[i].groupId === groupId) {
          groupItems.push({ ex: exercises[i], idx: i })
          i++
        }

        const lastIdx = groupItems[groupItems.length - 1].idx

        rendered.push(
          <View key={`group-${groupId}`} style={s.groupContainer}>
            {/* Header do grupo */}
            <View style={s.groupHeader}>
              <View style={s.groupLabelBadge}>
                <Ionicons name="git-merge-outline" size={13} color={colors.primary} />
                <Text style={s.groupLabelText}>{groupLabel}</Text>
              </View>
              {/* Adicionar mais ao grupo */}
              <TouchableOpacity
                style={s.groupAddBtn}
                onPress={() => addToGroup(groupId, groupLabel, lastIdx)}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <Text style={s.groupAddBtnText}>Adicionar</Text>
              </TouchableOpacity>
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
                <View style={s.setsRepsRow}>
                  <View style={s.setsRepsField}>
                    <Text style={s.setsRepsLabel}>Séries</Text>
                    <TextInput style={s.inputSmall} value={gEx.sets} onChangeText={v => updateExercise(gIdx, 'sets', v)} placeholder="4" placeholderTextColor={colors.textDisabled} keyboardType="numeric" />
                  </View>
                  <View style={s.setsRepsField}>
                    <Text style={s.setsRepsLabel}>Repetições</Text>
                    <TextInput style={s.inputSmall} value={gEx.reps} onChangeText={v => updateExercise(gIdx, 'reps', v)} placeholder="12" placeholderTextColor={colors.textDisabled} keyboardType="numeric" />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )
        continue
      }

      // Exercício simples — com opção de criar grupo
      rendered.push(
        <View key={`ex-${i}`} style={s.exerciseForm}>
          <View style={s.exerciseFormHeader}>
            <Text style={s.exerciseFormIndex}>#{i + 1}</Text>
            <View style={s.exerciseFormActions}>
              {/* Botão de agrupar */}
              <TouchableOpacity
                style={s.groupBtn}
                onPress={() => {
                  Alert.alert(
                    'Criar grupo',
                    'Selecione o tipo de agrupamento:',
                    [
                      ...GROUP_LABELS.map(label => ({
                        text: label,
                        onPress: () => createGroup(i, label),
                      })),
                      { text: 'Cancelar', style: 'cancel' as const },
                    ],
                  )
                }}
              >
                <Ionicons name="git-merge-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => removeExercise(i)}
                disabled={exercises.filter(e => e.type === 'exercise').length <= 1}
              >
                <Ionicons
                  name="remove-circle-outline"
                  size={20}
                  color={exercises.filter(e => e.type === 'exercise').length <= 1 ? colors.textDisabled : colors.error}
                />
              </TouchableOpacity>
            </View>
          </View>
          <TextInput
            style={s.input}
            value={ex.name}
            onChangeText={v => updateExercise(i, 'name', v)}
            placeholder="Nome do exercício"
            placeholderTextColor={colors.textDisabled}
          />
          <View style={s.setsRepsRow}>
            <View style={s.setsRepsField}>
              <Text style={s.setsRepsLabel}>Séries</Text>
              <TextInput style={s.inputSmall} value={ex.sets} onChangeText={v => updateExercise(i, 'sets', v)} placeholder="4" placeholderTextColor={colors.textDisabled} keyboardType="numeric" />
            </View>
            <View style={s.setsRepsField}>
              <Text style={s.setsRepsLabel}>Repetições</Text>
              <TextInput style={s.inputSmall} value={ex.reps} onChangeText={v => updateExercise(i, 'reps', v)} placeholder="12" placeholderTextColor={colors.textDisabled} keyboardType="numeric" />
            </View>
          </View>
        </View>
      )
      i++
    }

    return rendered
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { onClose(); resetForm() }}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => { onClose(); resetForm() }} />
      <View style={s.sheet}>
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{title ?? (editingWorkout ? 'Editar treino' : 'Novo treino')}</Text>
          <TouchableOpacity onPress={() => { onClose(); resetForm() }}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.sheetBody} showsVerticalScrollIndicator={false}>

          {/* Nome */}
          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Nome do treino *</Text>
            <TextInput style={s.input} value={wName} onChangeText={setWName} placeholder="Ex: Treino A — Peito" placeholderTextColor={colors.textDisabled} />
          </View>

          {/* Dias */}
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

          {/* Exercícios */}
          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Exercícios *</Text>
            {renderExercises()}

            {/* Botões de adicionar */}
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

          {/* Observações */}
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
  inputSmall:  { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 48, paddingHorizontal: spacing['3'], fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary, textAlign: 'center' },

  daysSelector:          { flexDirection: 'row', gap: spacing['2'], flexWrap: 'wrap' },
  daySelectorItem:       { paddingHorizontal: spacing['3'], paddingVertical: spacing['2'], borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceHigh },
  daySelectorItemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  daySelectorText:       { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary },
  daySelectorTextActive: { color: colors.white },

  // Exercício simples
  exerciseForm:       { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, padding: spacing['3'], gap: spacing['2'], marginBottom: spacing['2'] },
  exerciseFormGrouped:{ marginBottom: spacing['1'], borderBottomWidth: 1, borderBottomColor: colors.border },
  exerciseFormHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseFormIndex:  { fontFamily: typography.family.bold, fontSize: typography.size.sm, color: colors.primary },
  exerciseFormActions:{ flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  groupBtn:           { width: 28, height: 28, borderRadius: radii.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },

  setsRepsRow:   { flexDirection: 'row', gap: spacing['3'] },
  setsRepsField: { flex: 1, gap: spacing['1'] },
  setsRepsLabel: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },

  // Grupo
  groupContainer:  { backgroundColor: colors.surfaceHigh, borderRadius: radii.lg, marginBottom: spacing['2'], overflow: 'hidden', borderWidth: 1.5, borderColor: `${colors.primary}30` },
  groupHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing['3'], paddingVertical: spacing['2'], backgroundColor: `${colors.primary}10`, borderBottomWidth: 1, borderBottomColor: `${colors.primary}20` },
  groupLabelBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  groupLabelText:  { fontFamily: typography.family.bold, fontSize: typography.size.xs, color: colors.primary },
  groupAddBtn:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  groupAddBtnText: { fontFamily: typography.family.medium, fontSize: typography.size.xs, color: colors.primary },

  // Cardio
  cardioForm:      { backgroundColor: `${colors.info}10`, borderRadius: radii.lg, padding: spacing['3'], gap: spacing['2'], marginBottom: spacing['2'], borderWidth: 1.5, borderColor: `${colors.info}30` },
  cardioLabel:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardioLabelText: { fontFamily: typography.family.bold, fontSize: typography.size.xs, color: colors.info },
  durationRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  durationField:   { flex: 1, gap: spacing['1'] },
  durationSep:     { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.textSecondary, marginTop: spacing['3'] },

  // Botões adicionar
  addButtonsRow:    { flexDirection: 'row', gap: spacing['3'] },
  addExerciseBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing['2'], paddingVertical: spacing['3'], borderWidth: 1.5, borderColor: colors.primary, borderRadius: radii.lg, borderStyle: 'dashed' },
  addCardioBtnStyle:{ borderColor: colors.info },
  addExerciseBtnText:{ fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.primary },

  saveBtn:     { backgroundColor: colors.primary, borderRadius: radii.lg, height: 52, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontFamily: typography.family.bold, fontSize: typography.size.base, color: colors.white },
})
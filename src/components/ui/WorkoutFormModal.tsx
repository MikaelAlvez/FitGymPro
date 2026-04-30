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

export interface DropSetEntry {
  reps: string
  load: string
}

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

// ─── Helpers ────────────────────────────────
const parseDropSets = (dropSets?: string): DropSetEntry[] => {
  if (!dropSets) return []
  try { return JSON.parse(dropSets) } catch { return [] }
}

const serializeDropSets = (entries: DropSetEntry[]): string =>
  JSON.stringify(entries)

const buildDefaultDropSets = (sets: string): DropSetEntry[] => {
  const n = parseInt(sets) || 1
  return Array.from({ length: n }, () => ({ reps: '', load: '' }))
}

export function WorkoutFormModal({ visible, onClose, onSave, editingWorkout, title }: Props) {
  const [saving,    setSaving]    = useState(false)
  const [wName,     setWName]     = useState('')
  const [wDays,     setWDays]     = useState<string[]>([])
  const [wNotes,    setWNotes]    = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: '', sets: '', reps: '', order: 0, type: 'exercise', load: '', restTime: '', isDrop: false },
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
              isDrop:     e.isDrop     ?? false,
              dropSets:   e.dropSets   ?? undefined,
            }))
          : [{ name: '', sets: '', reps: '', order: 0, type: 'exercise' as const, load: '', restTime: '', isDrop: false }],
      )
    } else {
      setWName('')
      setWDays([])
      setWNotes('')
      setExercises([{ name: '', sets: '', reps: '', order: 0, type: 'exercise', load: '', restTime: '', isDrop: false }])
    }
  }, [visible, editingWorkout])

  const toggleDay = (day: string) =>
    setWDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])

  const updateExercise = (idx: number, field: keyof Exercise, value: any) =>
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))

  // Ativa/desativa modo drop set
  const toggleDrop = (idx: number) => {
    setExercises(prev => prev.map((e, i) => {
      if (i !== idx) return e
      const enabling = !e.isDrop
      if (enabling) {
        const entries = buildDefaultDropSets(e.sets || '1')
        return { ...e, isDrop: true, dropSets: serializeDropSets(entries) }
      }
      return { ...e, isDrop: false, dropSets: undefined }
    }))
  }

  // Atualiza uma entrada individual do drop set
  const updateDropEntry = (exIdx: number, dropIdx: number, field: keyof DropSetEntry, value: string) => {
    setExercises(prev => prev.map((e, i) => {
      if (i !== exIdx) return e
      const entries = parseDropSets(e.dropSets)
      entries[dropIdx] = { ...entries[dropIdx], [field]: value }
      return { ...e, dropSets: serializeDropSets(entries) }
    }))
  }

  // Quando o número de séries muda no modo drop, ajusta o número de entradas
  const handleSetsChange = (idx: number, value: string) => {
    setExercises(prev => prev.map((e, i) => {
      if (i !== idx) return e
      const updated = { ...e, sets: value }
      if (e.isDrop) {
        const n       = parseInt(value) || 1
        const entries = parseDropSets(e.dropSets)
        if (entries.length < n) {
          while (entries.length < n) entries.push({ reps: '', load: '' })
        } else if (entries.length > n) {
          entries.splice(n)
        }
        updated.dropSets = serializeDropSets(entries)
      }
      return updated
    }))
  }

  const removeExercise = (idx: number) => {
    const ex = exercises[idx]
    if (ex.type === 'exercise' && exercises.filter(e => e.type === 'exercise' && !e.groupId).length <= 1 && !ex.groupId) {
      Alert.alert('Atenção', 'O treino precisa ter ao menos um exercício.')
      return
    }
    setExercises(prev => prev.filter((_, i) => i !== idx))
  }

  const addExercise = () =>
    setExercises(prev => [...prev, { name: '', sets: '', reps: '', order: prev.length, type: 'exercise', load: '', restTime: '', isDrop: false }])

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
          isDrop: false,
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
    if (regularExercises.some(e => !e.name.trim() || !e.sets.trim())) {
      Alert.alert('Atenção', 'Preencha nome e séries de todos os exercícios.')
      return
    }
    // Valida drop sets
    for (const ex of regularExercises.filter(e => e.isDrop)) {
      const entries = parseDropSets(ex.dropSets)
      if (entries.some(d => !d.reps.trim())) {
        Alert.alert('Atenção', `Preencha as repetições de todas as séries do drop set "${ex.name}".`)
        return
      }
    }
    // Valida reps dos exercícios normais
    if (regularExercises.filter(e => !e.isDrop).some(e => !e.reps.trim())) {
      Alert.alert('Atenção', 'Preencha as repetições de todos os exercícios.')
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

  // ─── Campos base (séries, reps, carga, descanso) ──
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
            onChangeText={v => handleSetsChange(exIdx, v)}
            placeholder="4"
            placeholderTextColor={colors.textDisabled}
            keyboardType="numeric"
          />
        </View>

        {/* Reps — oculto no modo drop (cada série tem a sua) */}
        {!exItem.isDrop && (
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
        )}

        {/* Carga — oculto no modo drop */}
        {!exItem.isDrop && (
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
        )}

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

  // ─── Entradas do Drop Set ──────────────────
  const renderDropSets = (exItem: Exercise, exIdx: number) => {
    const entries = parseDropSets(exItem.dropSets)
    if (entries.length === 0) return null

    return (
      <View style={s.dropSetsContainer}>
        <View style={s.dropSetsHeader}>
          <Ionicons name="trending-down-outline" size={13} color={colors.warning} />
          <Text style={s.dropSetsTitle}>Séries do Drop Set</Text>
        </View>
        {entries.map((entry, di) => (
          <View key={di} style={s.dropSetRow}>
            <View style={s.dropSetBadge}>
              <Text style={s.dropSetBadgeText}>S{di + 1}</Text>
            </View>
            <View style={s.dropSetField}>
              <Text style={s.dropSetLabel}>Reps *</Text>
              <TextInput
                style={s.dropSetInput}
                value={entry.reps}
                onChangeText={v => updateDropEntry(exIdx, di, 'reps', v)}
                placeholder="15"
                placeholderTextColor={colors.textDisabled}
                keyboardType="numeric"
              />
            </View>
            <View style={s.dropSetField}>
              <Text style={s.dropSetLabel}>Carga</Text>
              <TextInput
                style={s.dropSetInput}
                value={entry.load}
                onChangeText={v => updateDropEntry(exIdx, di, 'load', v)}
                placeholder="12kg"
                placeholderTextColor={colors.textDisabled}
              />
            </View>
          </View>
        ))}
        <Text style={s.dropSetHint}>
          Ex: {entries.map((e, i) => `S${i+1}: ${e.reps || '?'}x${e.load || '?'}`).join(' → ')}
        </Text>
      </View>
    )
  }

  const renderExercises = () => {
    const nodes: React.ReactNode[] = []
    let i = 0

    while (i < exercises.length) {
      const ex  = exercises[i]
      const idx = i

      // ── Cardio ──
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
                  placeholder="00" placeholderTextColor={colors.textDisabled}
                  keyboardType="numeric" maxLength={2}
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
                  placeholder="30" placeholderTextColor={colors.textDisabled}
                  keyboardType="numeric" maxLength={2}
                />
              </View>
            </View>
          </View>
        )
        i++
        continue
      }

      // ── Grupo ──
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
                  <View style={s.exerciseFormActions}>
                    {/* Toggle drop set dentro de grupo */}
                    <TouchableOpacity
                      style={[s.dropBtn, gEx.isDrop && s.dropBtnActive]}
                      onPress={() => toggleDrop(gIdx)}
                    >
                      <Ionicons name="trending-down-outline" size={14} color={gEx.isDrop ? colors.white : colors.warning} />
                      <Text style={[s.dropBtnText, gEx.isDrop && s.dropBtnTextActive]}>Drop</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeFromGroup(gIdx)}>
                      <Ionicons name="remove-circle-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                <TextInput
                  style={s.input}
                  value={gEx.name}
                  onChangeText={v => updateExercise(gIdx, 'name', v)}
                  placeholder="Nome do exercício"
                  placeholderTextColor={colors.textDisabled}
                />
                {renderExerciseFields(gEx, gIdx)}
                {gEx.isDrop && renderDropSets(gEx, gIdx)}
              </View>
            ))}
          </View>
        )
        continue
      }

      // ── Exercício simples ──
      const simpleIdx = idx
      nodes.push(
        <View key={`ex-${simpleIdx}`} style={s.exerciseForm}>
          <View style={s.exerciseFormHeader}>
            <Text style={s.exerciseFormIndex}>#{simpleIdx + 1}</Text>
            <View style={s.exerciseFormActions}>
              {/* Toggle drop set */}
              <TouchableOpacity
                style={[s.dropBtn, ex.isDrop && s.dropBtnActive]}
                onPress={() => toggleDrop(simpleIdx)}
              >
                <Ionicons name="trending-down-outline" size={14} color={ex.isDrop ? colors.white : colors.warning} />
                <Text style={[s.dropBtnText, ex.isDrop && s.dropBtnTextActive]}>Drop</Text>
              </TouchableOpacity>
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
          {/* Renderiza drop sets se ativo */}
          {ex.isDrop && renderDropSets(ex, simpleIdx)}
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
            <TextInput
              style={s.input} value={wName} onChangeText={setWName}
              placeholder="Ex: Treino A — Peito" placeholderTextColor={colors.textDisabled}
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Dias da semana *</Text>
            <View style={s.daysSelector}>
              {DAYS.map(d => (
                <TouchableOpacity
                  key={d.key}
                  style={[s.daySelectorItem, wDays.includes(d.key) && s.daySelectorItemActive]}
                  onPress={() => toggleDay(d.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.daySelectorText, wDays.includes(d.key) && s.daySelectorTextActive]}>
                    {d.label}
                  </Text>
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
            <TextInput
              style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
              value={wNotes} onChangeText={setWNotes}
              placeholder="Ex: Descanso de 60s entre séries..."
              placeholderTextColor={colors.textDisabled}
              multiline maxLength={500}
            />
          </View>

          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave} disabled={saving} activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator color={colors.white} />
              : <Text style={s.saveBtnText}>{editingWorkout ? 'Salvar alterações' : 'Criar treino'}</Text>
            }
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

  // Botão drop set
  dropBtn:         { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: spacing['2'], paddingVertical: 4, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.warning, backgroundColor: 'transparent' },
  dropBtnActive:   { backgroundColor: colors.warning, borderColor: colors.warning },
  dropBtnText:     { fontFamily: typography.family.bold, fontSize: 10, color: colors.warning },
  dropBtnTextActive: { color: colors.white },

  groupBtn: { width: 28, height: 28, borderRadius: radii.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },

  fieldsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['2'] },
  fieldItem:   { width: '47%', gap: spacing['1'] },
  fieldLabel:  { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary },

  restTimeRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  restTimeInput:  { flex: 1 },
  restTimeSep:    { fontFamily: typography.family.bold, fontSize: typography.size.sm, color: colors.textSecondary },
  restTimeLabels: { flexDirection: 'row', marginTop: 2 },
  restTimeUnit:   { flex: 1, fontFamily: typography.family.regular, fontSize: 9, color: colors.textDisabled, textAlign: 'center' },

  // Drop set entries
  dropSetsContainer: { backgroundColor: `${colors.warning}10`, borderRadius: radii.lg, padding: spacing['3'], gap: spacing['2'], borderWidth: 1, borderColor: `${colors.warning}30` },
  dropSetsHeader:    { flexDirection: 'row', alignItems: 'center', gap: spacing['1'] },
  dropSetsTitle:     { fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.warning },
  dropSetRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing['2'] },
  dropSetBadge:      { width: 28, height: 28, borderRadius: radii.md, backgroundColor: colors.warning, alignItems: 'center', justifyContent: 'center' },
  dropSetBadgeText:  { fontFamily: typography.family.bold, fontSize: 10, color: colors.white },
  dropSetField:      { flex: 1, gap: 2 },
  dropSetLabel:      { fontFamily: typography.family.regular, fontSize: 9, color: colors.textSecondary },
  dropSetInput:      { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, height: 40, paddingHorizontal: spacing['2'], fontFamily: typography.family.regular, fontSize: typography.size.sm, color: colors.textPrimary, textAlign: 'center' },
  dropSetHint:       { fontFamily: typography.family.regular, fontSize: 9, color: colors.textDisabled, textAlign: 'center', marginTop: 2 },

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
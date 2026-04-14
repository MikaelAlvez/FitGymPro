import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Modal, FlatList,
} from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';

import { Input }  from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import type { StepBodyData } from './useStudentForm';
import { colors, spacing, typography, radii } from '../../../../theme';

// ─── Opções ──────────────────────────────────
const GOAL_OPTIONS = [
  'Hipertrofia', 'Emagrecimento', 'Resistência muscular',
  'Condicionamento físico', 'Reabilitação', 'Manutenção', 'Saúde geral',
];

// ─── Picker Modal ─────────────────────────────
function PickerModal({ visible, title, options, selected, onSelect, onClose }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={options}
          keyExtractor={(i: string) => i}
          renderItem={({ item }: any) => {
            const active = item === selected;
            return (
              <TouchableOpacity
                style={[s.option, active && s.optionActive]}
                onPress={() => { onSelect(item); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[s.optionText, active && s.optionTextActive]}>{item}</Text>
                {active && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

// ─── Selector Field ───────────────────────────
function SelectorField({ label, value, placeholder, onPress, error }: any) {
  return (
    <View style={s.selectorWrapper}>
      <Text style={s.selectorLabel}>{label}</Text>
      <TouchableOpacity
        style={[s.selectorBox, error ? s.selectorBoxError : null]}
        onPress={onPress} activeOpacity={0.8}
      >
        <Text style={value ? s.selectorValue : s.selectorPlaceholder}>
          {value ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
      {error && <Text style={s.errorText}>{error}</Text>}
    </View>
  );
}

// ─── StepBody ────────────────────────────────
interface Props {
  form:     UseFormReturn<StepBodyData>;
  onSubmit: (d: StepBodyData) => void;
  onBack?:  () => void;
}

export function StepBody({ form, onSubmit, onBack }: Props) {
  const { control, handleSubmit, formState: { errors } } = form;
  const [goalModal, setGoalModal] = useState(false);

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={s.sectionTitle}>Dados corporais</Text>

        <View style={s.fields}>
          <View style={s.row}>
            <View style={s.half}>
              <Controller control={control} name="weight"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input label="Peso (kg) *" placeholder="70" keyboardType="numeric"
                    onChangeText={onChange} onBlur={onBlur} value={value} error={errors.weight?.message} />
                )}
              />
            </View>
            <View style={s.half}>
              <Controller control={control} name="height"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input label="Altura (cm) *" placeholder="175" keyboardType="numeric"
                    onChangeText={onChange} onBlur={onBlur} value={value} error={errors.height?.message} />
                )}
              />
            </View>
          </View>

          <Controller control={control} name="goal"
            render={({ field: { onChange, value } }) => (
              <>
                <SelectorField label="Qual é o seu objetivo? *" value={value}
                  placeholder="Selecione um objetivo" onPress={() => setGoalModal(true)}
                  error={errors.goal?.message} />
                <PickerModal visible={goalModal} title="Objetivo" options={GOAL_OPTIONS}
                  selected={value} onSelect={onChange} onClose={() => setGoalModal(false)} />
              </>
            )}
          />

          <Controller control={control} name="focusMuscle"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Músculo que deseja focar? *" placeholder="Ex: Pernas, costas..."
                onChangeText={onChange} onBlur={onBlur} value={value} error={errors.focusMuscle?.message} />
            )}
          />
        </View>

        <Text style={s.required}>* Campos obrigatórios</Text>
        <Button label="Continuar" onPress={handleSubmit(onSubmit)} style={s.btn} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────
const s = StyleSheet.create({
  flex:   { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: spacing['6'], paddingBottom: spacing['10'] },
  sectionTitle: { fontFamily: typography.family.bold, fontSize: typography.size.lg, color: colors.textPrimary, marginBottom: spacing['4'], marginTop: spacing['2'] },
  fields: { gap: spacing['4'] },
  row:    { flexDirection: 'row', gap: spacing['3'] },
  half:   { flex: 1 },
  required: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textSecondary, marginTop: spacing['2'] },
  btn:    { marginTop: spacing['6'] },
  selectorWrapper: { gap: spacing['1'] },
  selectorLabel:   { fontFamily: typography.family.medium, fontSize: typography.size.sm, color: colors.textSecondary, marginBottom: spacing['1'] },
  selectorBox:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, height: 52, paddingHorizontal: spacing['4'] },
  selectorBoxError:    { borderColor: colors.error },
  selectorValue:       { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  selectorPlaceholder: { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textDisabled },
  errorText: { fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.error, marginTop: spacing['1'] },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:   { backgroundColor: colors.surface, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], paddingBottom: spacing['8'], maxHeight: '60%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing['6'], paddingVertical: spacing['4'], borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle:  { fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary },
  option:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing['4'], paddingHorizontal: spacing['6'], borderBottomWidth: 1, borderBottomColor: colors.divider },
  optionActive:     { backgroundColor: colors.surfaceHigh },
  optionText:       { fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary },
  optionTextActive: { fontFamily: typography.family.semiBold, color: colors.primary },
});
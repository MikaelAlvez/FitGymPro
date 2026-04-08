import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
  Modal, FlatList,
} from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';

import { Input }  from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import type { StepBodyData } from './usePersonalForm';
import { colors, typography, spacing, radii } from '../../../../theme';

// ─── Opções ──────────────────────────────────
const SEX_OPTIONS = ['Masculino', 'Feminino', 'Prefiro não informar'];

const EDUCATION_LEVELS = [
  'Ensino superior completo',
  'Ensino superior incompleto',
  'Pós-graduação completa',
  'Pós-graduação incompleta',
  'Mestrado completo',
  'Mestrado incompleto',
  'Doutorado completo',
  'Doutorado incompleto',
  'Outro',
];

// ─── Helpers ─────────────────────────────────
function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function maskCref(raw: string): string {
  // Formato: 000000-G/UF
  const clean = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 9);
  const digits = clean.slice(0, 6);
  const letter = clean.slice(6, 7);
  const uf     = clean.slice(7, 9);
  if (clean.length <= 6) return digits;
  if (clean.length <= 7) return `${digits}-${letter}`;
  return `${digits}-${letter}/${uf}`;
}

// ─── Picker Modal ─────────────────────────────
interface PickerModalProps {
  visible:  boolean;
  title:    string;
  options:  string[];
  selected: string | undefined;
  onSelect: (v: string) => void;
  onClose:  () => void;
}

function PickerModal({ visible, title, options, selected, onSelect, onClose }: PickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={options}
          keyExtractor={i => i}
          renderItem={({ item }) => {
            const active = item === selected;
            return (
              <TouchableOpacity
                style={[styles.option, active && styles.optionActive]}
                onPress={() => { onSelect(item); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>
                  {item}
                </Text>
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
interface SelectorFieldProps {
  label:       string;
  value:       string | undefined;
  placeholder: string;
  onPress:     () => void;
  error?:      string;
}

function SelectorField({ label, value, placeholder, onPress, error }: SelectorFieldProps) {
  return (
    <View style={styles.selectorWrapper}>
      <Text style={styles.selectorLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectorBox, error ? styles.selectorBoxError : null]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={value ? styles.selectorValue : styles.selectorPlaceholder}>
          {value ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// ─── StepBody ────────────────────────────────
interface Props {
  form:     UseFormReturn<StepBodyData>;
  onSubmit: (d: StepBodyData) => void;
}

export function StepBody({ form, onSubmit }: Props) {
  const { control, handleSubmit, formState: { errors } } = form;
  const [sexModal,       setSexModal]       = useState(false);
  const [educationModal, setEducationModal] = useState(false);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Dados corporais</Text>

        <View style={styles.fields}>

          {/* Sexo — picker */}
          <Controller control={control} name="sex"
            render={({ field: { onChange, value } }) => (
              <>
                <SelectorField
                  label="Sexo"
                  value={value}
                  placeholder="Selecione"
                  onPress={() => setSexModal(true)}
                  error={errors.sex?.message}
                />
                <PickerModal
                  visible={sexModal}
                  title="Sexo"
                  options={SEX_OPTIONS}
                  selected={value}
                  onSelect={onChange}
                  onClose={() => setSexModal(false)}
                />
              </>
            )}
          />

          {/* Data de nascimento — com máscara */}
          <Controller control={control} name="birthDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Data de nascimento"
                placeholder="DD/MM/AAAA"
                keyboardType="numeric"
                maxLength={10}
                onChangeText={raw => onChange(maskDate(raw))}
                onBlur={onBlur}
                value={value}
                error={errors.birthDate?.message}
              />
            )}
          />

          {/* Peso e Altura */}
          <View style={styles.row}>
            <View style={styles.half}>
              <Controller control={control} name="weight"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input label="Peso (kg)" placeholder="70"
                    keyboardType="numeric"
                    onChangeText={onChange} onBlur={onBlur} value={value}
                    error={errors.weight?.message} />
                )}
              />
            </View>
            <View style={styles.half}>
              <Controller control={control} name="height"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input label="Altura (cm)" placeholder="175"
                    keyboardType="numeric"
                    onChangeText={onChange} onBlur={onBlur} value={value}
                    error={errors.height?.message} />
                )}
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Curso */}
          <Controller control={control} name="course"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Curso"
                placeholder="Ex: Educação Física"
                onChangeText={onChange} onBlur={onBlur} value={value}
                error={errors.course?.message}
              />
            )}
          />

          {/* Universidade */}
          <Controller control={control} name="university"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Universidade"
                placeholder="Ex: UNICAMP, USP..."
                onChangeText={onChange} onBlur={onBlur} value={value}
                error={errors.university?.message}
              />
            )}
          />

          {/* Nível de formação — picker */}
          <Controller control={control} name="educationLevel"
            render={({ field: { onChange, value } }) => (
              <>
                <SelectorField
                  label="Nível de formação"
                  value={value}
                  placeholder="Selecione o nível"
                  onPress={() => setEducationModal(true)}
                  error={errors.educationLevel?.message}
                />
                <PickerModal
                  visible={educationModal}
                  title="Nível de formação"
                  options={EDUCATION_LEVELS}
                  selected={value}
                  onSelect={onChange}
                  onClose={() => setEducationModal(false)}
                />
              </>
            )}
          />

          {/* CREF — com máscara */}
          <Controller control={control} name="cref"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="CREF"
                placeholder="000000-G/UF"
                autoCapitalize="characters"
                maxLength={10}
                onChangeText={raw => onChange(maskCref(raw))}
                onBlur={onBlur}
                value={value}
                error={errors.cref?.message}
              />
            )}
          />
        </View>

        <Button label="Continuar" onPress={handleSubmit(onSubmit)} style={styles.btn} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────
const styles = StyleSheet.create({
  flex:   { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing['6'],
    paddingBottom: spacing['10'],
  },
  sectionTitle: {
    fontFamily: typography.family.bold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    marginBottom: spacing['4'],
    marginTop: spacing['2'],
  },
  fields:  { gap: spacing['4'] },
  row:     { flexDirection: 'row', gap: spacing['3'] },
  half:    { flex: 1 },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing['2'],
  },
  btn: { marginTop: spacing['8'] },

  // Selector field
  selectorWrapper: { gap: spacing['1'] },
  selectorLabel: {
    fontFamily: typography.family.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing['1'],
  },
  selectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    height: 52,
    paddingHorizontal: spacing['4'],
  },
  selectorBoxError: { borderColor: colors.error },
  selectorValue: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  selectorPlaceholder: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.base,
    color: colors.textDisabled,
  },
  errorText: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: colors.error,
    marginTop: spacing['1'],
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    paddingBottom: spacing['8'],
    maxHeight: '60%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing['6'],
    paddingVertical: spacing['4'],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    fontFamily: typography.family.semiBold,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing['4'],
    paddingHorizontal: spacing['6'],
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  optionActive:     { backgroundColor: colors.surfaceHigh },
  optionText: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  optionTextActive: {
    fontFamily: typography.family.semiBold,
    color: colors.primary,
  },
});
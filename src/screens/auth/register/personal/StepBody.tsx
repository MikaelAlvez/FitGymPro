import React from 'react';
import {
  View, Text, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';

import { Input }  from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import type { StepBodyData } from './usePersonalForm';
import { colors, typography, spacing } from '../../../../theme';

interface Props {
  form:     UseFormReturn<StepBodyData>;
  onSubmit: (d: StepBodyData) => void;
}

export function StepBody({ form, onSubmit }: Props) {
  const { control, handleSubmit, formState: { errors } } = form;

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
          <Controller control={control} name="sex"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Sexo" placeholder="Masculino / Feminino"
                onChangeText={onChange} onBlur={onBlur} value={value}
                error={errors.sex?.message}
              />
            )}
          />

          <Controller control={control} name="birthDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Data de nascimento" placeholder="DD/MM/AAAA"
                keyboardType="numeric"
                onChangeText={onChange} onBlur={onBlur} value={value}
                error={errors.birthDate?.message}
              />
            )}
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <Controller control={control} name="weight"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Peso (kg)" placeholder="70"
                    keyboardType="numeric"
                    onChangeText={onChange} onBlur={onBlur} value={value}
                    error={errors.weight?.message}
                  />
                )}
              />
            </View>
            <View style={styles.half}>
              <Controller control={control} name="height"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Altura (cm)" placeholder="175"
                    keyboardType="numeric"
                    onChangeText={onChange} onBlur={onBlur} value={value}
                    error={errors.height?.message}
                  />
                )}
              />
            </View>
          </View>

          {/* Campos exclusivos do personal */}
          <View style={styles.divider} />

          <Controller control={control} name="formation"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Formação" placeholder="Ex: Ed. Física — UNICAMP"
                onChangeText={onChange} onBlur={onBlur} value={value}
                error={errors.formation?.message}
              />
            )}
          />

          <Controller control={control} name="cref"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="CREF" placeholder="000000-G/UF"
                autoCapitalize="characters"
                onChangeText={onChange} onBlur={onBlur} value={value}
                error={errors.cref?.message}
              />
            )}
          />
        </View>

        <Button
          label="Continuar"
          onPress={handleSubmit(onSubmit)}
          style={styles.btn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
});
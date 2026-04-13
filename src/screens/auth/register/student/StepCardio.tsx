import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';

import { SelectCardGroup, CardOption } from '../../../../components/ui/SelectCard';
import { Button } from '../../../../components/ui/Button';
import type { StepCardioData, CardioOption } from './useStudentForm';
import { colors, typography, spacing } from '../../../../theme';

const OPTIONS: CardOption<CardioOption>[] = [
  { value: 'include', title: 'Incluir cardio:',     description: 'Exercícios de cardio serão adicionados antes ou após treino' },
  { value: 'exclude', title: 'Não incluir cardio:', description: 'Não será incluso exercícios de esteira, bicicleta e semelhantes' },
];

interface Props {
  form:     UseFormReturn<StepCardioData>;
  onSubmit: (d: StepCardioData) => void;
  onBack?:  () => void;
}

export function StepCardio({ form, onSubmit, onBack }: Props) {
  const { control, handleSubmit, formState: { errors } } = form;

  return (
    <View style={styles.container}>
      <Text style={styles.question}>Deseja realizar exercícios de cardio na academia?</Text>
      <Controller control={control} name="cardio"
        render={({ field: { onChange, value } }) => (
          <SelectCardGroup options={OPTIONS} value={value} onChange={onChange} error={errors.cardio?.message} />
        )}
      />
      <Button label="Continuar" onPress={handleSubmit(onSubmit)} style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing['6'], paddingTop: spacing['4'] },
  question:  { fontFamily: typography.family.semiBold, fontSize: typography.size.lg, color: colors.textPrimary, lineHeight: typography.size.lg * 1.5, marginBottom: spacing['8'] },
  btn:       { marginTop: spacing['8'] },
});
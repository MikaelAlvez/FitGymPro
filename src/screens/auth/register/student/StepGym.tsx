import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';

import { SelectCardGroup, CardOption } from '../../../../components/ui/SelectCard';
import { Button } from '../../../../components/ui/Button';
import type { StepGymData, GymType } from './useStudentForm';
import { colors, typography, spacing } from '../../../../theme';

const OPTIONS: CardOption<GymType>[] = [
  {
    value:       'basic',
    title:       'Academia básica:',
    description: 'Equipamentos simples, como barras e alteres',
  },
  {
    value:       'advanced',
    title:       'Academia avançada:',
    description: 'Academia completa com todos os equipamentos e máquinas',
  },
];

interface Props {
  form:     UseFormReturn<StepGymData>;
  onSubmit: (d: StepGymData) => void;
}

export function StepGym({ form, onSubmit }: Props) {
  const { control, handleSubmit, formState: { errors } } = form;

  return (
    <View style={styles.container}>
      <Text style={styles.question}>Onde você costuma treinar?</Text>

      <Controller
        control={control}
        name="gymType"
        render={({ field: { onChange, value } }) => (
          <SelectCardGroup
            options={OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.gymType?.message}
          />
        )}
      />

      <Button label="Continuar" onPress={handleSubmit(onSubmit)} style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing['6'],
    paddingTop: spacing['4'],
  },
  question: {
    fontFamily: typography.family.semiBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    lineHeight: typography.size.lg * 1.5,
    marginBottom: spacing['8'],
  },
  btn: { marginTop: spacing['8'] },
});
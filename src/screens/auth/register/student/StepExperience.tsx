import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';

import { SelectCardGroup, CardOption } from '../../../../components/ui/SelectCard';
import { Button } from '../../../../components/ui/Button';
import type { StepExperienceData, ExperienceLevel } from './useStudentForm';
import { colors, typography, spacing } from '../../../../theme';

const OPTIONS: CardOption<ExperienceLevel>[] = [
  {
    value:       'beginner',
    title:       'Iniciante:',
    description: 'Começando a praticar ou menos de 6 meses de experiência',
  },
  {
    value:       'intermediate',
    title:       'Intermediário:',
    description: 'Pratica musculação há mais de 6 meses e menos de 2 anos',
  },
  {
    value:       'advanced',
    title:       'Avançado:',
    description: 'Pratica musculação há mais de 2 anos de forma consistente',
  },
];

interface Props {
  form:     UseFormReturn<StepExperienceData>;
  onSubmit: (d: StepExperienceData) => void;
}

export function StepExperience({ form, onSubmit }: Props) {
  const { control, handleSubmit, formState: { errors } } = form;

  return (
    <View style={styles.container}>
      <Text style={styles.question}>Qual sua experiência na musculação?</Text>

      <Controller
        control={control}
        name="experience"
        render={({ field: { onChange, value } }) => (
          <SelectCardGroup
            options={OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.experience?.message}
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
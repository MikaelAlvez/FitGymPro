import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';

import { SelectCardGroup, CardOption } from '../../../../components/ui/SelectCard';
import { Button } from '../../../../components/ui/Button';
import type { StepFormatData, ClassFormat } from './usePersonalForm';
import { colors, typography, spacing } from '../../../../theme';

const OPTIONS: CardOption<ClassFormat>[] = [
  {
    value:       'presential',
    title:       'Presencial:',
    description: 'Acompanhamento realizado com aluno na academia',
  },
  {
    value:       'online',
    title:       'Online:',
    description: 'Acompanhamento e aulas totalmente remotas',
  },
  {
    value:       'hybrid',
    title:       'Híbrido:',
    description: 'Será aplicado aulas para alunos no formato presencial e remoto',
  },
];

interface Props {
  form:     UseFormReturn<StepFormatData>;
  onSubmit: (d: StepFormatData) => void;
  onBack?:  () => void;
}

export function StepFormat({ form, onSubmit, onBack }: Props) {
  const { control, handleSubmit, formState: { errors } } = form;

  return (
    <View style={styles.container}>
      <Text style={styles.question}>Como será o formato das aulas?</Text>

      <Controller
        control={control}
        name="format"
        render={({ field: { onChange, value } }) => (
          <SelectCardGroup
            options={OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.format?.message}
          />
        )}
      />

      <Button
        label="Continuar"
        onPress={handleSubmit(onSubmit)}
        style={styles.btn}
      />
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
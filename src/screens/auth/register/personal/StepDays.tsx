import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';

import { Button } from '../../../../components/ui/Button';
import { WEEK_DAYS, type StepDaysData, type WeekDay } from './usePersonalForm';
import { colors, typography, spacing, radii } from '../../../../theme';

interface Props {
  form:       UseFormReturn<StepDaysData>;
  onSubmit:   (d: StepDaysData) => void;
  isLoading?: boolean;
}

export function StepDays({ form, onSubmit, isLoading }: Props) {
  const { control, handleSubmit, formState: { errors } } = form;

  const toggle = (
    day: WeekDay,
    current: WeekDay[],
    onChange: (v: WeekDay[]) => void,
  ) => {
    onChange(
      current.includes(day)
        ? current.filter(d => d !== day)
        : [...current, day],
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.question}>Dias disponíveis para acompanhamento:</Text>

      <Controller
        control={control}
        name="days"
        defaultValue={[]}
        render={({ field: { onChange, value } }) => (
          <View style={styles.grid}>
            {WEEK_DAYS.map(({ value: day, label }) => {
              const selected = value.includes(day);
              // Domingo fica sozinho na última linha
              const isSunday = day === 'sunday';
              return (
                <TouchableOpacity
                  key={day}
                  activeOpacity={0.8}
                  onPress={() => toggle(day, value, onChange)}
                  style={[
                    styles.chip,
                    selected && styles.chipSelected,
                    isSunday && styles.chipSunday,
                  ]}
                >
                  <Text style={[
                    styles.chipLabel,
                    selected && styles.chipLabelSelected,
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      />

      {errors.days && (
        <Text style={styles.error}>{errors.days.message}</Text>
      )}

      <Button
        label="Continuar"
        onPress={handleSubmit(onSubmit)}
        loading={isLoading}
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
    marginBottom: spacing['6'],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['3'],
  },
  chip: {
    width: '47%',
    paddingVertical: spacing['4'],
    alignItems: 'center',
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 2,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  // Domingo centralizado — ocupa largura total menos as margens
  chipSunday: {
    width: '47%',
    alignSelf: 'flex-start',
    marginLeft: '26.5%',
  },
  chipLabel: {
    fontFamily: typography.family.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  chipLabelSelected: {
    color: colors.white,
    fontFamily: typography.family.bold,
  },
  error: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: colors.error,
    marginTop: spacing['2'],
  },
  btn: { marginTop: spacing['8'] },
});
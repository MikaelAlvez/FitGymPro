import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';

import { Button } from '../../../components/ui/Button';
import type { StepTwoData } from './useRegisterForm';
import type { UserRole } from '../../../contexts/AuthContext';
import { colors, typography, spacing, radii, shadows } from '../../../theme';

import type { UserRole } from '../../../contexts/AuthContext'

interface RoleOption {
  value:       UserRole;
  title:       string;
  description: string;
}

const ROLES: RoleOption[] = [
  {
    value:       'PERSONAL',
    title:       'Personal Trainer:',
    description: 'Utilizar o aplicativo para repassar treinos e orientar alunos',
  },
  {
    value:       'STUDENT',
    title:       'Aluno:',
    description: 'Utilizar o aplicativo com o intuito de receber orientações de um personal trainer',
  },
];

interface Props {
  form:       UseFormReturn<StepTwoData>;
  onSubmit:   (data: StepTwoData) => void;
  isLoading?: boolean;
}

export function StepTwo({ form, onSubmit, isLoading }: Props) {
  const { control, handleSubmit, formState: { errors } } = form;

  return (
    <View style={styles.container}>
      <Text style={styles.question}>
        Você é personal trainer formado ou aluno/praticante de musculação?
      </Text>

      <Controller
        control={control}
        name="role"
        render={({ field: { onChange, value } }) => (
          <View style={styles.options}>
            {ROLES.map(role => {
              const selected = value === role.value;
              return (
                <TouchableOpacity
                  key={role.value}
                  activeOpacity={0.8}
                  onPress={() => onChange(role.value)}
                  style={[
                    styles.card,
                    selected && styles.cardSelected,
                  ]}
                >
                  <Text style={[styles.roleTitle, selected && styles.roleTitleSelected]}>
                    {role.title}
                  </Text>
                  <Text style={[styles.roleDesc, selected && styles.roleDescSelected]}>
                    {role.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      />

      {errors.role && (
        <Text style={styles.error}>{errors.role.message}</Text>
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
    paddingTop: spacing['6'],
  },

  question: {
    fontFamily: typography.family.semiBold,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    lineHeight: typography.size.lg * 1.5,
    marginBottom: spacing['8'],
  },

  options: {
    gap: spacing['4'],
  },

  card: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.xl,
    padding: spacing['5'],
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.lg,
  },

  roleTitle: {
    fontFamily: typography.family.bold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    marginBottom: spacing['1'],
  },
  roleTitleSelected: {
    color: colors.white,
  },

  roleDesc: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.size.sm * 1.6,
  },
  roleDescSelected: {
    color: colors.white,
  },

  error: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: colors.error,
    marginTop: spacing['2'],
  },

  btn: { marginTop: spacing['8'] },
});
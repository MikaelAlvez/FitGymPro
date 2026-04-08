import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ViewStyle,
} from 'react-native';
import { colors, typography, spacing, radii, shadows } from '../../theme';

export interface CardOption<T extends string> {
  value:       T;
  title:       string;
  description: string;
}

interface SelectCardGroupProps<T extends string> {
  options:   CardOption<T>[];
  value:     T | undefined;
  onChange:  (v: T) => void;
  error?:    string;
  style?:    ViewStyle;
}

export function SelectCardGroup<T extends string>({
  options, value, onChange, error, style,
}: SelectCardGroupProps<T>) {
  return (
    <View style={[styles.wrapper, style]}>
      {options.map(opt => {
        const selected = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.8}
            onPress={() => onChange(opt.value)}
            style={[styles.card, selected && styles.cardSelected]}
          >
            <Text style={[styles.title, selected && styles.titleSelected]}>
              {opt.title}
            </Text>
            <Text style={[styles.desc, selected && styles.descSelected]}>
              {opt.description}
            </Text>
          </TouchableOpacity>
        );
      })}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing['4'] },

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

  title: {
    fontFamily: typography.family.bold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    marginBottom: spacing['1'],
  },
  titleSelected: { color: colors.white },

  desc: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.size.sm * 1.6,
  },
  descSelected: { color: colors.white },

  error: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: colors.error,
  },
});
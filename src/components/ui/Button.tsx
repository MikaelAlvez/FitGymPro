import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { colors, typography, radii, spacing } from '../../theme';

type Variant = 'primary' | 'outline' | 'ghost';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  label:    string;
  variant?: Variant;
  size?:    Size;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  label,
  variant   = 'primary',
  size      = 'lg',
  loading   = false,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style as ViewStyle,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.white : colors.primary}
          size="small"
        />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`]]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  } as ViewStyle,

  primary: {
    backgroundColor: colors.primary,
  } as ViewStyle,
  outline: {
    backgroundColor: colors.transparent,
    borderWidth: 1.5,
    borderColor: colors.primary,
  } as ViewStyle,
  ghost: {
    backgroundColor: colors.transparent,
  } as ViewStyle,

  size_sm: { height: 36, paddingHorizontal: spacing['4'] } as ViewStyle,
  size_md: { height: 44, paddingHorizontal: spacing['6'] } as ViewStyle,
  size_lg: { height: 52, paddingHorizontal: spacing['8'] } as ViewStyle,

  fullWidth: { width: '100%' } as ViewStyle,
  disabled:  { opacity: 0.45 } as ViewStyle,

  label: {
    fontFamily: typography.family.bold,
    letterSpacing: 0.8,
  } as TextStyle,
  label_primary: { color: colors.white }    as TextStyle,
  label_outline: { color: colors.primary }  as TextStyle,
  label_ghost:   { color: colors.primary }  as TextStyle,

  labelSize_sm: { fontSize: typography.size.sm } as TextStyle,
  labelSize_md: { fontSize: typography.size.md } as TextStyle,
  labelSize_lg: { fontSize: typography.size.base } as TextStyle,
});
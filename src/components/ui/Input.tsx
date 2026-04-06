import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../theme';

interface InputProps extends TextInputProps {
  label?:       string;
  error?:       string;
  leftIcon?:    keyof typeof Ionicons.glyphMap;
  secureToggle?: boolean;  // mostra ícone de olho se true
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  leftIcon,
  secureToggle = false,
  secureTextEntry,
  containerStyle,
  ...rest
}: InputProps) {
  const [secure, setSecure] = useState(secureTextEntry ?? false);
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.error
    : focused
    ? colors.primary
    : colors.border;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputRow, { borderColor }]}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color={focused ? colors.primary : colors.textSecondary}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textDisabled}
          selectionColor={colors.primary}
          secureTextEntry={secure}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />

        {secureToggle && (
          <TouchableOpacity onPress={() => setSecure(p => !p)} style={styles.rightIcon}>
            <Ionicons
              name={secure ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing['1'],
  },
  label: {
    fontFamily: typography.family.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing['1'],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    height: 52,
    paddingHorizontal: spacing['4'],
  },
  leftIcon: {
    marginRight: spacing['2'],
  },
  rightIcon: {
    padding: spacing['1'],
    marginLeft: spacing['2'],
  },
  input: {
    flex: 1,
    fontFamily: typography.family.regular,
    fontSize: typography.size.base,
    color: colors.textPrimary,
    height: '100%',
  },
  error: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.xs,
    color: colors.error,
    marginTop: spacing['1'],
  },
});
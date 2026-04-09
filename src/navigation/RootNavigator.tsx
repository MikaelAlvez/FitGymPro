import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { AuthNavigator }    from './AuthNavigator';
import { PersonalNavigator } from './PersonalNavigator';
import { StudentNavigator }  from './StudentNavigator';
import { useAuth }           from '../contexts/AuthContext';
import { colors } from '../theme';

const NAV_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card:       colors.surface,
    text:       colors.textPrimary,
    border:     colors.border,
    primary:    colors.primary,
  },
};

export function RootNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={NAV_THEME}>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : user?.role === 'personal' ? (
        <PersonalNavigator />
      ) : (
        <StudentNavigator />
      )}
    </NavigationContainer>
  );
}
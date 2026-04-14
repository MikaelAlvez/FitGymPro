import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../../theme';

interface Props {
  userName: string;
  onFinish: () => void;
}

export function RegisterSuccess({ userName, onFinish }: Props) {
  const spinAnim    = useRef(new Animated.Value(0)).current;
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(0)).current;
  const [done, setDone] = React.useState(false);

  useEffect(() => {
    //RTempo do loader girando antes de mostrar o checkmark
    const LOADER_TIME    = 1500   
    //Tempo exibindo o checkmark antes de ir para home
    const CHECKMARK_TIME = 1200   
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue:         1,
        duration:        800,
        easing:          Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    const timer = setTimeout(() => {
      spinAnim.stopAnimation();
      setDone(true);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue:         1,
          friction:        5,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue:         1,
          duration:        400,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => onFinish(), CHECKMARK_TIME);
    }, LOADER_TIME);

    return () => clearTimeout(timer);
  }, []);

  const spin = spinAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {!done ? (
        // Loader girando
        <Animated.View style={[styles.loaderRing, { transform: [{ rotate: spin }] }]}>
          <View style={styles.loaderInner} />
        </Animated.View>
      ) : (
        // Checkmark com fade + scale
        <Animated.View style={[
          styles.successCircle,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}>
          <Ionicons name="checkmark" size={52} color={colors.white} />
        </Animated.View>
      )}

      <Animated.View style={{ opacity: done ? fadeAnim : 0, alignItems: 'center' }}>
        <Text style={styles.title}>Cadastro realizado!</Text>
        <Text style={styles.subtitle}>
          Bem-vindo(a), {userName}! {'\n'}
          Seu perfil foi criado com sucesso.
        </Text>
      </Animated.View>
    </View>
  );
}

const CIRCLE_SIZE = 100;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['8'],
    paddingHorizontal: spacing['8'],
  },

  // Loader
  loaderRing: {
    width:        CIRCLE_SIZE,
    height:       CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth:  5,
    borderColor:  colors.primary,
    borderTopColor: 'transparent',
    alignItems:   'center',
    justifyContent: 'center',
  },
  loaderInner: {
    width:        CIRCLE_SIZE - 20,
    height:       CIRCLE_SIZE - 20,
    borderRadius: (CIRCLE_SIZE - 20) / 2,
    backgroundColor: colors.background,
  },

  // Sucesso
  successCircle: {
    width:           CIRCLE_SIZE,
    height:          CIRCLE_SIZE,
    borderRadius:    CIRCLE_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     colors.primary,
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.4,
    shadowRadius:    16,
    elevation:       10,
  },

  title: {
    fontFamily: typography.family.bold,
    fontSize:   typography.size['2xl'],
    color:      colors.textPrimary,
    textAlign:  'center',
  },
  subtitle: {
    fontFamily: typography.family.regular,
    fontSize:   typography.size.base,
    color:      colors.textSecondary,
    textAlign:  'center',
    lineHeight: typography.size.base * 1.6,
    marginTop:  spacing['2'],
  },
});
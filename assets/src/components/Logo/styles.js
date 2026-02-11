import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';

export default StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  containerLarge: {
    width: 200,
    height: 200,
  },
  containerMedium: {
    width: 100,
    height: 100,
  },
  containerSmall: {
    width: 60,
    height: 60,
  },
  logoImage: {
    width: '80%',
    height: '80%',
  },
  proBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'transparent',
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    transform: [{ rotate: '-15deg' }],
  },
  brandName: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 1,
  },
});
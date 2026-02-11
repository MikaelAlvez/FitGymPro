import { StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight } from '../../theme';

export default StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
  },
  inputsContainer: {
    marginBottom: spacing.lg,
  },
  linksContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  linkText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
});
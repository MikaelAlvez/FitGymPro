import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { StepOne }           from './register/StepOne';
import { StepTwo }           from './register/StepTwo';
import { useRegisterForm }   from './register/useRegisterForm';
import type { StepTwoData }  from './register/useRegisterForm';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { colors, typography, spacing } from '../../theme';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const {
    step, formOne, formTwo,
    avatarUri, setAvatarUri,
    goToStep2, goBack, getFullData,
  } = useRegisterForm();

  const [loading, setLoading] = React.useState(false);

  const handlePickAvatar = () => {
    // TODO: integrar expo-image-picker
    Alert.alert('Em breve', 'Seleção de foto será integrada com expo-image-picker.');
  };

  const handleFinish = async (data: StepTwoData) => {
    try {
      setLoading(true);
      const fullData = getFullData(data);
      console.log('Cadastro completo:', fullData);
      // TODO: chamar service de criação de conta
      Alert.alert('Sucesso!', 'Conta criada com sucesso.', [
        { text: 'Entrar', onPress: () => navigation.navigate('Login') },
      ]);
    } catch {
      Alert.alert('Erro', 'Não foi possível criar a conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      goBack();
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Meu perfil</Text>

        {/* Espaço para alinhar título ao centro */}
        <View style={{ width: 24 }} />
      </View>

      {/* Indicador de etapa */}
      <View style={styles.stepIndicator}>
        {[1, 2].map(n => (
          <View
            key={n}
            style={[styles.stepDot, step >= n && styles.stepDotActive]}
          />
        ))}
      </View>

      {/* Conteúdo */}
      {step === 1 ? (
        <StepOne
          form={formOne}
          avatarUri={avatarUri}
          onPickAvatar={handlePickAvatar}
          onSubmit={goToStep2}
        />
      ) : (
        <StepTwo
          form={formTwo}
          onSubmit={handleFinish}
          isLoading={loading}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['5'],
    paddingVertical: spacing['4'],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: typography.family.semiBold,
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },

  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing['2'],
    paddingVertical: spacing['3'],
  },
  stepDot: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
});
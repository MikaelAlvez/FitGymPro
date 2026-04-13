import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// ─── Imports com caminho correto ─────────────
// Se RegisterScreen está em src/screens/auth/ use './register/...'
// Se RegisterScreen está em src/screens/auth/register/ use './...'
import { StepOne }              from './register/StepOne';
import { StepAddress }          from './register/StepAddress';
import { StepTwo }              from './register/StepTwo';
import { StudentRegisterFlow }  from './register/student/StudentRegisterFlow';
import { PersonalRegisterFlow } from './register/personal/PersonalRegisterFlow';
import { useRegisterForm }      from './register/useRegisterForm';
import { useAuth }              from '../../contexts/AuthContext';
import { uploadAvatar }         from '../../services/upload.service';
import type { StepTwoData }         from './register/useRegisterForm';
import type { PersonalProfileData } from './register/personal/usePersonalForm';
import type { AuthStackParamList }  from '../../navigation/AuthNavigator';
import { colors, typography, spacing } from '../../theme';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const { registerStudent, registerPersonal, updateUser } = useAuth();
  const {
    step, formOne, formAddress, formTwo,
    avatarUri, setAvatarUri,
    goToStep2, goToStep3, goBack, setStep, getFullData,
  } = useRegisterForm();

  const [loading,          setLoading]          = React.useState(false);
  const [showStudentFlow,  setShowStudentFlow]  = React.useState(false);
  const [showPersonalFlow, setShowPersonalFlow] = React.useState(false);
  const [stepTwoData,      setStepTwoData]      = React.useState<StepTwoData | null>(null);
  const [innerStep,        setInnerStep]        = React.useState(1);

  // Total fixo em 8 (fluxo aluno) — o maior fluxo possível
  // Personal tem 6, mas deixamos 8 para não mudar a barra ao selecionar perfil
  const totalSteps = 8;

  const getCurrentStep = () => {
    if (showStudentFlow || showPersonalFlow) return 3 + innerStep;
    return step; // 1, 2 ou 3
  }

  const handlePickAvatar = (uri: string) => setAvatarUri(uri);

  const handleRoleSelected = (data: StepTwoData) => {
    setStepTwoData(data);
    if (data.role === 'STUDENT') setShowStudentFlow(true);
    else                         setShowPersonalFlow(true);
  };

  const uploadAvatarIfSelected = async () => {
    if (!avatarUri) return;
    try {
      const url = await uploadAvatar(avatarUri);
      await updateUser({ avatar: url });
    } catch {}
  };

  const handleStudentComplete = async (profileData: any) => {
    try {
      setLoading(true);
      const base = getFullData(stepTwoData!);
      await registerStudent({
        name:         base.name,
        cpf:          base.cpf,
        email:        base.email,
        phone:        base.phone,
        password:     base.password,
        role:         'STUDENT',
        cep:          base.address?.cep,
        street:       base.address?.street,
        number:       base.address?.number,
        neighborhood: base.address?.neighborhood,
        city:         base.address?.city,
        state:        base.address?.state,
        sex:          profileData.sex,
        birthDate:    profileData.birthDate,
        weight:       profileData.weight,
        height:       profileData.height,
        goal:         profileData.goal,
        focusMuscle:  profileData.focusMuscle,
        experience:   profileData.experience,
        gymType:      profileData.gymType,
        cardio:       profileData.cardio,
        trainingDays: profileData.days,
      });
      await uploadAvatarIfSelected();
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalComplete = async (profileData: PersonalProfileData) => {
    try {
      setLoading(true);
      const base = getFullData(stepTwoData!);
      await registerPersonal({
        name:           base.name,
        cpf:            base.cpf,
        email:          base.email,
        phone:          base.phone,
        password:       base.password,
        role:           'PERSONAL',
        cep:            base.address?.cep,
        street:         base.address?.street,
        number:         base.address?.number,
        neighborhood:   base.address?.neighborhood,
        city:           base.address?.city,
        state:          base.address?.state,
        sex:            profileData.sex,
        birthDate:      profileData.birthDate,
        weight:         profileData.weight,
        height:         profileData.height,
        course:         profileData.course,
        university:     profileData.university,
        educationLevel: profileData.educationLevel,
        cref:           profileData.cref,
        classFormat:    profileData.format,
        availableDays:  profileData.days,
      });
      await uploadAvatarIfSelected();
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (showStudentFlow) {
      if (innerStep === 1) {
        setShowStudentFlow(false)
        setInnerStep(1)
        setStep(3)
      }
      return
    }
    if (showPersonalFlow) {
      if (innerStep === 1) {
        setShowPersonalFlow(false)
        setInnerStep(1)
        setStep(3)
      }
      return
    }
    if (step === 1) navigation.goBack()
    else goBack()
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.stepIndicator}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[styles.stepDot, i < getCurrentStep() && styles.stepDotActive]}
          />
        ))}
      </View>

      {showStudentFlow ? (
        <StudentRegisterFlow
          onComplete={handleStudentComplete}
          onStepChange={setInnerStep}
          onBack={handleBack}
        />
      ) : showPersonalFlow ? (
        <PersonalRegisterFlow
          onComplete={handlePersonalComplete}
          onStepChange={setInnerStep}
          onBack={handleBack}
        />
      ) : step === 1 ? (
        <StepOne form={formOne} avatarUri={avatarUri} onPickAvatar={handlePickAvatar} onSubmit={goToStep2} />
      ) : step === 2 ? (
        <StepAddress form={formAddress} onSubmit={goToStep3} />
      ) : (
        <StepTwo form={formTwo} onSubmit={handleRoleSelected} isLoading={loading} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
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
    width: 32, height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  stepDotActive: { backgroundColor: colors.primary },
});
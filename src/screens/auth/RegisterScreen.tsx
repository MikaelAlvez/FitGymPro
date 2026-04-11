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

import { StepOne }                  from './register/StepOne';
import { StepTwo }                  from './register/StepTwo';
import { StudentRegisterFlow }      from './register/student/StudentRegisterFlow';
import { PersonalRegisterFlow }     from './register/personal/PersonalRegisterFlow';
import { useRegisterForm }          from './register/useRegisterForm';
import { useAuth }                  from '../../contexts/AuthContext';
import { uploadAvatar }             from '../../services/upload.service';   // ← fix
import type { StepTwoData }         from './register/useRegisterForm';
import type { PersonalProfileData } from './register/personal/usePersonalForm';
import type { AuthStackParamList }  from '../../navigation/AuthNavigator';
import { colors, typography, spacing } from '../../theme';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const { registerStudent, registerPersonal } = useAuth();
  const {
    step, formOne, formTwo,
    avatarUri, setAvatarUri,   // ← fix: destructure setAvatarUri
    goToStep2, goBack, getFullData,
  } = useRegisterForm();

  const [loading,          setLoading]          = React.useState(false);
  const [showStudentFlow,  setShowStudentFlow]  = React.useState(false);
  const [showPersonalFlow, setShowPersonalFlow] = React.useState(false);
  const [stepTwoData,      setStepTwoData]      = React.useState<StepTwoData | null>(null);

  const totalSteps = showStudentFlow ? 7 : showPersonalFlow ? 5 : 2;

  const handlePickAvatar = (uri: string) => {
    setAvatarUri(uri);
  };

  const handleRoleSelected = (data: StepTwoData) => {
    setStepTwoData(data);
    if (data.role === 'STUDENT') setShowStudentFlow(true);
    else                         setShowPersonalFlow(true);
  };

  const uploadAvatarIfSelected = async () => {
    if (!avatarUri) return;
    try {
      await uploadAvatar(avatarUri);
    } catch {
      // Não bloqueia o fluxo se o upload falhar
    }
  };

  const handleStudentComplete = async (profileData: any) => {
    try {
      setLoading(true);
      const base = getFullData(stepTwoData!);
      await registerStudent({
        name:         base.name,
        email:        base.email,
        phone:        base.phone,
        password:     base.password,
        role:         'STUDENT',
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
        email:          base.email,
        phone:          base.phone,
        password:       base.password,
        role:           'PERSONAL',
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
    if (showStudentFlow || showPersonalFlow) return;
    if (step === 2) goBack();
    else navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Meu perfil</Text>

        <View style={{ width: 24 }} />
      </View>

      {/* Indicador de etapas */}
      <View style={styles.stepIndicator}>
        {Array.from({ length: totalSteps }).map((_, i) => {
          const currentStep = showStudentFlow || showPersonalFlow ? totalSteps : step;
          return (
            <View
              key={i}
              style={[styles.stepDot, i < currentStep && styles.stepDotActive]}
            />
          );
        })}
      </View>

      {/* Conteúdo */}
      {showStudentFlow ? (
        <StudentRegisterFlow onComplete={handleStudentComplete} />
      ) : showPersonalFlow ? (
        <PersonalRegisterFlow onComplete={handlePersonalComplete} />
      ) : step === 1 ? (
        <StepOne
          form={formOne}
          avatarUri={avatarUri}
          onPickAvatar={handlePickAvatar}
          onSubmit={goToStep2}
        />
      ) : (
        <StepTwo
          form={formTwo}
          onSubmit={handleRoleSelected}
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
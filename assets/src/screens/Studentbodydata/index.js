import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  StatusBar,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button } from '../../components';
import styles from './styles';

const StudentBodyData = ({ navigation, setCurrentScreen }) => {
  const [formData, setFormData] = useState({
    gender: '',
    birthDate: '',
    weight: '',
    height: '',
    goal: '',
    targetMuscle: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.gender.trim()) {
      newErrors.gender = 'Sexo é obrigatório';
    }

    if (!formData.birthDate.trim()) {
      newErrors.birthDate = 'Data de nascimento é obrigatória';
    }

    if (!formData.weight.trim()) {
      newErrors.weight = 'Peso é obrigatório';
    }

    if (!formData.height.trim()) {
      newErrors.height = 'Altura é obrigatória';
    }

    if (!formData.goal.trim()) {
      newErrors.goal = 'Objetivo é obrigatório';
    }

    if (!formData.targetMuscle.trim()) {
      newErrors.targetMuscle = 'Músculo que deseja focar é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
      
      // Navegar para tela de experiência
      if (setCurrentScreen) {
        setCurrentScreen('ExperienceLevel');
      } else {
        // Se tiver React Navigation:
        // navigation.navigate('ExperienceLevel', { bodyData: formData });
        
        Alert.alert(
          'Sucesso!',
          'Indo para seleção de experiência...',
          [{ text: 'OK' }]
        );
      }
    }, 1500);
  };

  const updateFormData = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const handleGoBack = () => {
    if (setCurrentScreen) {
      setCurrentScreen('UserTypeSelection');
    } else {
      Alert.alert(
        'Voltar',
        'Funcionalidade de navegação em desenvolvimento',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={handleGoBack}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meu perfil</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            
            {/* Section Title */}
            <Text style={styles.sectionTitle}>Dados corporais</Text>

            {/* Form Inputs */}
            <View style={styles.inputsContainer}>
              <Input
                label="Sexo"
                placeholder=""
                value={formData.gender}
                onChangeText={(text) => updateFormData('gender', text)}
                error={errors.gender}
              />

              <Input
                label="Data de nascimento"
                placeholder=""
                value={formData.birthDate}
                onChangeText={(text) => updateFormData('birthDate', text)}
                error={errors.birthDate}
              />

              <Input
                label="Peso"
                placeholder=""
                value={formData.weight}
                onChangeText={(text) => updateFormData('weight', text)}
                keyboardType="numeric"
                error={errors.weight}
              />

              <Input
                label="Altura"
                placeholder=""
                value={formData.height}
                onChangeText={(text) => updateFormData('height', text)}
                keyboardType="numeric"
                error={errors.height}
              />

              <Input
                label="Qual é o seu objetivo?"
                placeholder=""
                value={formData.goal}
                onChangeText={(text) => updateFormData('goal', text)}
                error={errors.goal}
              />

              <Input
                label="Musculo que deseja focar?"
                placeholder=""
                value={formData.targetMuscle}
                onChangeText={(text) => updateFormData('targetMuscle', text)}
                error={errors.targetMuscle}
              />
            </View>

            {/* Submit Button */}
            <Button
              title="Continuar"
              onPress={handleContinue}
              loading={loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default StudentBodyData;
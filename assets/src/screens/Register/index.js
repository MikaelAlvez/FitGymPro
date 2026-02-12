import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  StatusBar,
  Alert,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input, Button } from '../../components';
import styles from './styles';

const Register = ({ navigation, setCurrentScreen }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirme sua senha';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    // Simula processamento
    setTimeout(() => {
      setLoading(false);
      
      // Navega para a tela de seleção de tipo de usuário
      if (setCurrentScreen) {
        setCurrentScreen('UserTypeSelection');
      } else {
        // Se tiver react-navigation:
        // navigation.navigate('UserTypeSelection', { userData: formData });
        
        Alert.alert(
          'Sucesso!',
          'Cadastro realizado. Indo para seleção de tipo...',
          [{ text: 'OK' }]
        );
      }
    }, 1500);
  };

  const handleAddPhoto = () => {
    Alert.alert(
      'Adicionar foto',
      'Funcionalidade em desenvolvimento',
      [{ text: 'OK' }]
    );
  };

  const updateFormData = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const handleGoBack = () => {
    if (setCurrentScreen) {
      setCurrentScreen('Login');
    } else {
      Alert.alert(
        'Voltar',
        'Funcionalidade de navegação em desenvolvimento',
        [{ text: 'OK' }]
      );
      // navigation.goBack();
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
            
            {/* Profile Photo */}
            <TouchableOpacity 
              style={styles.photoContainer}
              onPress={handleAddPhoto}
              activeOpacity={0.8}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="image-outline" size={40} color="#666666" />
                  <View style={styles.addIconContainer}>
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </View>
                </View>
              )}
            </TouchableOpacity>
            
            <Text style={styles.photoLabel}>Adicionar foto</Text>

            {/* Section Title */}
            <Text style={styles.sectionTitle}>Dados pessoais</Text>

            {/* Form Inputs */}
            <View style={styles.inputsContainer}>
              <Input
                label="Nome"
                placeholder="Nome completo"
                value={formData.name}
                onChangeText={(text) => updateFormData('name', text)}
                leftIcon="person-outline"
                error={errors.name}
                autoCapitalize="words"
              />

              <Input
                label="E-mail"
                placeholder="E-mail"
                value={formData.email}
                onChangeText={(text) => updateFormData('email', text)}
                leftIcon="mail-outline"
                keyboardType="email-address"
                error={errors.email}
              />

              <Input
                label="Telefone/Whatsapp"
                placeholder="Telefone"
                value={formData.phone}
                onChangeText={(text) => updateFormData('phone', text)}
                leftIcon="call-outline"
                keyboardType="phone-pad"
                error={errors.phone}
              />

              <Input
                label="Senha"
                placeholder="Digite sua senha"
                value={formData.password}
                onChangeText={(text) => updateFormData('password', text)}
                leftIcon="lock-closed-outline"
                secureTextEntry
                error={errors.password}
              />

              <Input
                label="Confirmar senha"
                placeholder="Confirme sua senha"
                value={formData.confirmPassword}
                onChangeText={(text) => updateFormData('confirmPassword', text)}
                leftIcon="lock-closed-outline"
                secureTextEntry
                error={errors.confirmPassword}
              />
            </View>

            {/* Submit Button */}
            <Button
              title="Continuar"
              onPress={handleRegister}
              loading={loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Register;
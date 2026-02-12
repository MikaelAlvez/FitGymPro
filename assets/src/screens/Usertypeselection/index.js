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
import { Button } from '../../components';
import styles from './styles';

const UserTypeSelection = ({ navigation, setCurrentScreen }) => {
  const [selectedType, setSelectedType] = useState(null); // 'trainer' ou 'student'

  const handleContinue = () => {
    if (!selectedType) {
      Alert.alert(
        'Atenção',
        'Por favor, selecione uma opção para continuar',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Tipo selecionado',
      selectedType === 'trainer' ? 'Personal Trainer' : 'Aluno',
      [
        { 
          text: 'OK',
          onPress: () => {

          }
        }
      ]
    );
  };

  const handleGoBack = () => {
    if (setCurrentScreen) {
      setCurrentScreen('Register');
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
        >
          <View style={styles.content}>
            
            {/* Question */}
            <Text style={styles.question}>
              Você é personal trainer formado ou aluno/praticante de musculação?
            </Text>

            {/* Options */}
            <View style={styles.optionsContainer}>
              
              {/* Personal Trainer Option */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  selectedType === 'trainer' && styles.optionCardSelected
                ]}
                onPress={() => setSelectedType('trainer')}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.optionTitle,
                  selectedType === 'trainer' && styles.optionTitleSelected
                ]}>
                  Personal Trainer:
                </Text>
                <Text style={[
                  styles.optionDescription,
                  selectedType === 'trainer' && styles.optionDescriptionSelected
                ]}>
                  Utilizar o aplicativo para repassar treinos e orientar alunos
                </Text>
                
                {/* Checkmark */}
                {selectedType === 'trainer' && (
                  <View style={styles.checkmarkContainer}>
                    <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Student Option */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  selectedType === 'student' && styles.optionCardSelected
                ]}
                onPress={() => setSelectedType('student')}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.optionTitle,
                  selectedType === 'student' && styles.optionTitleSelected
                ]}>
                  Aluno:
                </Text>
                <Text style={[
                  styles.optionDescription,
                  selectedType === 'student' && styles.optionDescriptionSelected
                ]}>
                  Utilizar o aplicativo com o intuito de receber orientações de um personal trainer
                </Text>
                
                {/* Checkmark */}
                {selectedType === 'student' && (
                  <View style={styles.checkmarkContainer}>
                    <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>

            </View>

          </View>
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <Button
            title="Continuar"
            onPress={handleContinue}
          />
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default UserTypeSelection;
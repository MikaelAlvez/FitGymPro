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

const ExperienceLevel = ({ navigation, setCurrentScreen }) => {
  const [selectedLevel, setSelectedLevel] = useState(null); // 'beginner', 'intermediate', 'advanced'

  const handleContinue = () => {
    if (!selectedLevel) {
      Alert.alert(
        'Atenção',
        'Por favor, selecione seu nível de experiência para continuar',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Experiência selecionada',
      selectedLevel === 'beginner' ? 'Iniciante' : 
      selectedLevel === 'intermediate' ? 'Intermediário' : 'Avançado',
      [
        { 
          text: 'OK',
          onPress: () => {
            // Navegar para próxima tela
            // navigation.navigate('NextScreen', { experience: selectedLevel });
          }
        }
      ]
    );
  };

  const handleGoBack = () => {
    if (setCurrentScreen) {
      setCurrentScreen('StudentBodyData');
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
        >
          <View style={styles.content}>
            
            {/* Question */}
            <Text style={styles.question}>
              Qual sua experiência na musculação?
            </Text>

            {/* Options */}
            <View style={styles.optionsContainer}>
              
              {/* Beginner Option */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  selectedLevel === 'beginner' && styles.optionCardSelected
                ]}
                onPress={() => setSelectedLevel('beginner')}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.optionTitle,
                  selectedLevel === 'beginner' && styles.optionTitleSelected
                ]}>
                  Iniciante:
                </Text>
                <Text style={[
                  styles.optionDescription,
                  selectedLevel === 'beginner' && styles.optionDescriptionSelected
                ]}>
                  Começando a praticar ou menos de 6 meses de experiência
                </Text>
                
                {/* Checkmark */}
                {selectedLevel === 'beginner' && (
                  <View style={styles.checkmarkContainer}>
                    <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Intermediate Option */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  selectedLevel === 'intermediate' && styles.optionCardSelected
                ]}
                onPress={() => setSelectedLevel('intermediate')}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.optionTitle,
                  selectedLevel === 'intermediate' && styles.optionTitleSelected
                ]}>
                  Intermediário:
                </Text>
                <Text style={[
                  styles.optionDescription,
                  selectedLevel === 'intermediate' && styles.optionDescriptionSelected
                ]}>
                  Pratica musculação há mais de 6 meses e menos de 2 anos
                </Text>
                
                {/* Checkmark */}
                {selectedLevel === 'intermediate' && (
                  <View style={styles.checkmarkContainer}>
                    <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Advanced Option */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  selectedLevel === 'advanced' && styles.optionCardSelected
                ]}
                onPress={() => setSelectedLevel('advanced')}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.optionTitle,
                  selectedLevel === 'advanced' && styles.optionTitleSelected
                ]}>
                  Avançado:
                </Text>
                <Text style={[
                  styles.optionDescription,
                  selectedLevel === 'advanced' && styles.optionDescriptionSelected
                ]}>
                  Pratica musculação há mais de 2 anos de forma consistente
                </Text>
                
                {/* Checkmark */}
                {selectedLevel === 'advanced' && (
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

export default ExperienceLevel;
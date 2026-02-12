import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Login from './assets/src/screens/Login';
import Register from './assets/src/screens/Register';
import UserTypeSelection from './assets/src/screens/Usertypeselection';
import TrainerBodyData from './assets/src/screens/Trainerbodydata';
import StudentBodyData from './assets/src/screens/Studentbodydata';
import { colors } from './assets/src/theme';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Login');
  const [userType, setUserType] = useState(null); // 'trainer' ou 'student'

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Login':
        return <Login setCurrentScreen={setCurrentScreen} />;
      
      case 'Register':
        return <Register setCurrentScreen={setCurrentScreen} />;
      
      case 'UserTypeSelection':
        return (
          <UserTypeSelection 
            setCurrentScreen={setCurrentScreen}
            setUserType={setUserType}
          />
        );
      
      case 'TrainerBodyData':
        return <TrainerBodyData setCurrentScreen={setCurrentScreen} />;
      
      case 'StudentBodyData':
        return <StudentBodyData setCurrentScreen={setCurrentScreen} />;
      
      default:
        return <Login setCurrentScreen={setCurrentScreen} />;
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {renderScreen()}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
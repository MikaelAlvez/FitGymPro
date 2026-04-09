import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { StudentHomeScreen }    from '../screens/student/StudentHomeScreen';
import { StudentMetricsScreen } from '../screens/student/StudentMetricsScreen';
import { StudentProfileScreen } from '../screens/student/StudentProfileScreen';
import { colors, typography } from '../theme';

export type StudentTabParamList = {
  Home:    undefined;
  Metrics: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<StudentTabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: {
  name:       keyof StudentTabParamList;
  label:      string;
  icon:       IoniconsName;
  iconActive: IoniconsName;
}[] = [
  { name: 'Home',    label: 'Início',   icon: 'home-outline',          iconActive: 'home'           },
  { name: 'Metrics', label: 'Métricas', icon: 'stats-chart-outline',   iconActive: 'stats-chart'    },
  { name: 'Profile', label: 'Perfil',   icon: 'person-outline',        iconActive: 'person'         },
];

export function StudentNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor:  colors.border,
          borderTopWidth:  1,
          height:          64,
          paddingBottom:   8,
          paddingTop:      8,
        },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontFamily: typography.family.medium,
          fontSize:   10,
        },
      }}
    >
      {TABS.map(({ name, label, icon, iconActive }) => (
        <Tab.Screen
          key={name}
          name={name}
          options={{
            tabBarLabel: label,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? iconActive : icon} size={size} color={color} />
            ),
          }}
          component={
            name === 'Home'    ? StudentHomeScreen    :
            name === 'Metrics' ? StudentMetricsScreen :
            StudentProfileScreen
          }
        />
      ))}
    </Tab.Navigator>
  );
}
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { PersonalHomeScreen }     from '../screens/personal/PersonalHomeScreen';
import { StudentsScreen }         from '../screens/personal/StudentsScreen';
import { WorkoutsScreen }         from '../screens/personal/WorkoutsScreen';
import { PersonalProfileScreen }  from '../screens/personal/PersonalProfileScreen';
import { colors, typography } from '../theme';

export type PersonalTabParamList = {
  Home:     undefined;
  Students: undefined;
  Workouts: undefined;
  Profile:  undefined;
};

const Tab = createBottomTabNavigator<PersonalTabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: {
  name:       keyof PersonalTabParamList;
  label:      string;
  icon:       IoniconsName;
  iconActive: IoniconsName;
}[] = [
  { name: 'Home',     label: 'Início',  icon: 'home-outline',    iconActive: 'home'           },
  { name: 'Students', label: 'Alunos',  icon: 'people-outline',  iconActive: 'people'         },
  { name: 'Workouts', label: 'Treinos', icon: 'barbell-outline', iconActive: 'barbell'        },
  { name: 'Profile',  label: 'Perfil',  icon: 'person-outline',  iconActive: 'person'         },
];

export function PersonalNavigator() {
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
            name === 'Home'     ? PersonalHomeScreen    :
            name === 'Students' ? StudentsScreen        :
            name === 'Workouts' ? WorkoutsScreen        :
            PersonalProfileScreen
          }
        />
      ))}
    </Tab.Navigator>
  );
}
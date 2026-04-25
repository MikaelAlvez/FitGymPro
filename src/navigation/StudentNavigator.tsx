import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { StudentHomeScreen }      from '../screens/student/StudentHomeScreen'
import { StudentWorkoutsScreen }  from '../screens/student/StudentWorkoutsScreen'
import { StudentFeedScreen }      from '../screens/student/StudentFeedScreen'
import { StudentDashboardScreen } from '../screens/student/StudentDashboardScreen'
import { StudentPersonalsScreen } from '../screens/student/StudentPersonalsScreen'
import { StudentProfileScreen }   from '../screens/student/StudentProfileScreen'
import { colors, typography }     from '../theme'

export type StudentTabParamList = {
  Home:      undefined
  Workouts:  undefined
  Feed:      undefined
  Dashboard: undefined
  Personals: undefined
  Profile:   undefined
}

const Tab = createBottomTabNavigator<StudentTabParamList>()

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
      <Tab.Screen
        name="Home"
        component={StudentHomeScreen}
        options={{
          tabBarLabel: 'Início',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Workouts"
        component={StudentWorkoutsScreen}
        options={{
          tabBarLabel: 'Treinos',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'barbell' : 'barbell-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Feed"
        component={StudentFeedScreen}
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={StudentDashboardScreen}
        options={{
          tabBarLabel: 'Relatórios',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Personals"
        component={StudentPersonalsScreen}
        options={{
          tabBarLabel: 'Personais',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={StudentProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}
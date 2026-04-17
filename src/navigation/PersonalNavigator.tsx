import React, { useEffect } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { View, Text, StyleSheet } from 'react-native'

import { PersonalHomeScreen }     from '../screens/personal/PersonalHomeScreen'
import { StudentsScreen }         from '../screens/personal/StudentsScreen'
import { StudentDetailScreen }    from '../screens/personal/StudentDetailScreen'
import { WorkoutsScreen }         from '../screens/personal/WorkoutsScreen'
import { PersonalRequestsScreen } from '../screens/personal/PersonalRequestsScreen'
import { PersonalProfileScreen }  from '../screens/personal/PersonalProfileScreen'
import { RequestsProvider, useRequests } from '../contexts/RequestsContext'
import { colors, typography }     from '../theme'

// ─── Types ───────────────────────────────────
export type PersonalTabParamList = {
  Home:         undefined
  StudentsStack: undefined
  Workouts:     undefined
  Requests:     undefined
  Profile:      undefined
}

export type StudentsStackParamList = {
  StudentsList:  undefined
  StudentDetail: { student: any }
}

// ─── Navigators ──────────────────────────────
const Tab   = createBottomTabNavigator<PersonalTabParamList>()
const Stack = createNativeStackNavigator<StudentsStackParamList>()

// ─── Stack de Alunos ─────────────────────────
function StudentsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentsList"  component={StudentsScreen}       />
      <Stack.Screen name="StudentDetail" component={StudentDetailScreen}  />
    </Stack.Navigator>
  )
}

// ─── Tabs ─────────────────────────────────────
function PersonalTabs() {
  const { pendingCount, loadPendingCount } = useRequests()

  useEffect(() => {
    loadPendingCount()
  }, [loadPendingCount])

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
        component={PersonalHomeScreen}
        options={{
          tabBarLabel: 'Início',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="StudentsStack"
        component={StudentsStackNavigator}
        options={{
          tabBarLabel: 'Alunos',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Workouts"
        component={WorkoutsScreen}
        options={{
          tabBarLabel: 'Treinos',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'barbell' : 'barbell-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Requests"
        component={PersonalRequestsScreen}
        options={{
          tabBarLabel: 'Solicitações',
          tabBarIcon: ({ focused, color, size }) => (
            <View>
              <Ionicons name={focused ? 'mail' : 'mail-outline'} size={size} color={color} />
              {pendingCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={PersonalProfileScreen}
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

// ─── Navigator principal ──────────────────────
export function PersonalNavigator() {
  return (
    <RequestsProvider>
      <PersonalTabs />
    </RequestsProvider>
  )
}

const s = StyleSheet.create({
  badge: {
    position:          'absolute',
    top:               -4,
    right:             -8,
    minWidth:          18,
    height:            18,
    borderRadius:      9,
    backgroundColor:   colors.error,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: typography.family.bold,
    fontSize:   10,
    color:      '#fff',
  },
})
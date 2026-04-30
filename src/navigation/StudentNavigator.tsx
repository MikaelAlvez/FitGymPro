import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'

import { StudentHomeScreen }       from '../screens/student/StudentHomeScreen'
import { StudentWorkoutsScreen }   from '../screens/student/StudentWorkoutsScreen'
import { StudentFeedScreen }       from '../screens/student/StudentFeedScreen'
import { StudentDashboardScreen }  from '../screens/student/StudentDashboardScreen'
import { StudentPersonalsScreen }  from '../screens/student/StudentPersonalsScreen'
import { StudentProfileScreen }    from '../screens/student/StudentProfileScreen'
import { CommunitySearchScreen }   from '../screens/community/CommunitySearchScreen'
import { FriendRequestsScreen }    from '../screens/community/FriendRequestsScreen'
import { GroupsScreen }           from '../screens/groups/GroupsScreen'
import { GroupDetailScreen }      from '../screens/groups/GroupDetailScreen'
import { ChallengeRankingScreen } from '../screens/groups/ChallengeRankingScreen'
import { colors, typography }      from '../theme'

// ─── Tab ─────────────────────────────────────
export type StudentTabParamList = {
  Home:      undefined
  Workouts:  undefined
  Feed:      undefined
  Dashboard: undefined
  Profile:   undefined
  Groups:    undefined
}

const Tab = createBottomTabNavigator<StudentTabParamList>()

function StudentTabs() {
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
        name="Groups"
        component={GroupsScreen}
        options={{
          tabBarLabel: 'Grupos',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'people-circle' : 'people-circle-outline'} size={size} color={color} />
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

// ─── Stack (envolve o Tab + telas modais) ────
export type StudentStackParamList = {
  StudentTabs:        undefined
  CommunitySearch:    undefined
  FriendRequests:     undefined
  GroupDetail:        { groupId: string }        
  ChallengeRanking:   { groupId: string; challengeId: string } 
  Personals:          undefined 
}

const Stack = createNativeStackNavigator<StudentStackParamList>()

export function StudentNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentTabs"     component={StudentTabs} />
      <Stack.Screen name="CommunitySearch" component={CommunitySearchScreen} />
      <Stack.Screen name="FriendRequests"  component={FriendRequestsScreen} />
      <Stack.Screen name="GroupDetail"       component={GroupDetailScreen} />
      <Stack.Screen name="ChallengeRanking"  component={ChallengeRankingScreen} />
      <Stack.Screen name="Personals"        component={StudentPersonalsScreen} />
    </Stack.Navigator>
  )
}
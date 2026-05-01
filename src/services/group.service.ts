import { apiRequest } from './api'

export interface Group {
  id:          string
  name:        string
  description: string | null
  code:        string
  avatar:      string | null
  creatorId:   string
  createdAt:   string
  myRole?:     'OWNER' | 'MEMBER' | null
  creator?:    { id: string; name: string; avatar: string | null }
  members?:    GroupMember[]
  challenges?: GroupChallenge[]
  _count?:     { members: number; challenges: number }
}

export interface GroupMember {
  id:       string
  groupId:  string
  userId:   string
  role:     'OWNER' | 'MEMBER'
  joinedAt: string
  user:     { id: string; name: string; avatar: string | null; userCode: string; role?: string }
}

export interface GroupChallenge {
  id:          string
  groupId:     string
  title:       string
  description: string | null
  goal:        number
  startDate:   string
  endDate:     string
  createdAt:   string
  type:        ChallengeType
  weeklyCheckinLimit:  number | null
  minSessionMinutes:   number | null
  maxSessionMinutes:   number | null
  scoreStrength: number
  scoreCardio:   number
  scoreSports:   number
  _count?:     { checkins: number }
  checkins?:   { id: string; checkedAt: string; points: number; minutes: number; workoutType: string | null }[]
}

export interface ChallengeRanking {
  challenge: GroupChallenge
  ranking: {
    user:     { id: string; name: string; avatar: string | null; userCode: string }
    checkins: number
    score:    number  // pontos totais (SCORE), minutos totais (TOTAL_TIME) ou nº treinos (CHECKIN_COUNT)
    done:     boolean
  }[]
}

export type ChallengeType = 'CHECKIN_COUNT' | 'SCORE' | 'TOTAL_TIME'
export type WorkoutType   = 'strength' | 'cardio' | 'sports'

export const groupService = {
  // Grupos
  create: (data: { name: string; description?: string; avatar?: string }) =>
    apiRequest<Group>('/groups', {
      method: 'POST', authenticated: true, body: JSON.stringify(data),
    }),

  listMy: () =>
    apiRequest<Group[]>('/groups/my', { authenticated: true }),

  searchByCode: (code: string) =>
    apiRequest<Group>(`/groups/search?code=${encodeURIComponent(code)}`, { authenticated: true }),

  getById: (groupId: string) =>
    apiRequest<Group>(`/groups/${groupId}`, { authenticated: true }),

  update: (groupId: string, data: { name?: string; description?: string }) =>
    apiRequest<Group>(`/groups/${groupId}`, {
      method: 'PUT', authenticated: true, body: JSON.stringify(data),
    }),

  delete: (groupId: string) =>
    apiRequest<{ message: string }>(`/groups/${groupId}`, {
      method: 'DELETE', authenticated: true,
    }),

  joinById: (groupId: string) =>
    apiRequest<{ message: string }>(`/groups/${groupId}/join`, {
      method: 'POST', authenticated: true,
    }),

  joinByCode: (code: string) =>
    apiRequest<{ message: string; groupId: string }>('/groups/join-by-code', {
      method: 'POST', authenticated: true, body: JSON.stringify({ code }),
    }),

  leave: (groupId: string) =>
    apiRequest<{ message: string }>(`/groups/${groupId}/leave`, {
      method: 'DELETE', authenticated: true,
    }),

  // Desafios
  createChallenge: (groupId: string, data: {
    title:       string
    description?: string
    goal:        number
    startDate:   string
    endDate:     string
    type?:       ChallengeType
    weeklyCheckinLimit?:  number
    minSessionMinutes?:   number
    maxSessionMinutes?:   number
    scoreStrength?: number
    scoreCardio?:   number
    scoreSports?:   number
  }) =>
    apiRequest<GroupChallenge>(`/groups/${groupId}/challenges`, {
      method: 'POST', authenticated: true, body: JSON.stringify(data),
    }),

  listChallenges: (groupId: string) =>
    apiRequest<GroupChallenge[]>(`/groups/${groupId}/challenges`, { authenticated: true }),

  getRanking: (groupId: string, challengeId: string) =>
    apiRequest<ChallengeRanking>(`/groups/${groupId}/challenges/${challengeId}/ranking`, { authenticated: true }),

  checkin: (groupId: string, challengeId: string, data?: {
    sessionId?:   string
    note?:        string
    workoutType?: WorkoutType
  }) =>
    apiRequest<{
      checkin: any
      total: number
      goal: number
      completed: boolean
      countedInWeeklyLimit: boolean
      weeklyLimitReached: boolean
    }>(`/groups/${groupId}/challenges/${challengeId}/checkin`, {
      method: 'POST', authenticated: true, body: JSON.stringify(data ?? {}),
    }),

  removeCheckin: (groupId: string, challengeId: string, checkinId: string) =>
    apiRequest<{ message: string }>(
      `/groups/${groupId}/challenges/${challengeId}/checkin/${checkinId}`, {
        method: 'DELETE', authenticated: true,
      }),

  // Grupos com desafios ativos do usuário
  getActiveChallenges: () =>
    apiRequest<{
      groupId:    string
      groupName:  string
      groupCode:  string
      challenges: {
        id:            string
        title:         string
        goal:          number
        myCheckins:    number
        totalCheckins: number
        endDate:       string
      }[]
    }[]>('/groups/active-challenges', { authenticated: true }),
}
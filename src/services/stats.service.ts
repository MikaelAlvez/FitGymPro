import { apiRequest } from './api'

export interface WeekdayData { name: string; count: number }
export interface WeeklyData  { week: string; count: number }

export interface WorkoutStats {
  totalSessions:  number
  totalDuration:  number
  avgDuration:    number
  maxDuration:    number
  currentStreak:  number
  maxStreak:      number
  weekdayData:    WeekdayData[]
  weeklyData:     WeeklyData[]
  bodyMetrics: {
    weight: string | null
    height: string | null
  }
}

export const statsService = {
  getWorkoutStats: (from?: string, to?: string) => {
    const params = new URLSearchParams()
    if (from) params.append('from', from)
    if (to)   params.append('to', to)
    const qs = params.toString()
    return apiRequest<WorkoutStats>(`/stats/workouts${qs ? `?${qs}` : ''}`, {
      authenticated: true,
    })
  },
}
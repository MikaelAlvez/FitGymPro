import { apiRequest } from './api'
import type { User }  from '../contexts/AuthContext'

export interface UpdateProfilePayload {
  name?:         string
  phone?:        string
  sex?:          string
  birthDate?:    string
  cep?:          string
  street?:       string
  number?:       string
  neighborhood?: string
  city?:         string
  state?:        string
}

export interface UpdateStudentMetricsPayload {
  weight: string
  height: string
}

export interface StudentProfile {
  weight:       string
  height:       string
  goal:         string
  focusMuscle:  string
  experience:   string
  gymType:      string
  cardio:       string
  trainingDays: string[]
  sex:          string
  birthDate:    string
}

export const userService = {
  updateProfile: (payload: UpdateProfilePayload) =>
    apiRequest<User>('/user/profile', {
      method:        'PUT',
      authenticated: true,
      body:          JSON.stringify(payload),
    }),

  updateStudentMetrics: (payload: UpdateStudentMetricsPayload) =>
    apiRequest<{ studentProfile: StudentProfile }>('/user/student-metrics', {
      method:        'PUT',
      authenticated: true,
      body:          JSON.stringify(payload),
    }),
}
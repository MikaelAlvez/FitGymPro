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

export interface UpdateMetricsPayload {
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

export interface PersonalProfile {
  weight?:       string
  height?:       string
  sex:           string
  birthDate:     string
  cref:          string
  course:        string
  classFormat:   string
  availableDays: string[]
}

export const userService = {
  updateProfile: (payload: UpdateProfilePayload) =>
    apiRequest<User>('/user/profile', {
      method:        'PUT',
      authenticated: true,
      body:          JSON.stringify(payload),
    }),

  updateMetrics: (payload: UpdateMetricsPayload) =>
    apiRequest<{ studentProfile?: StudentProfile; personalProfile?: PersonalProfile }>(
      '/user/metrics',
      {
        method:        'PUT',
        authenticated: true,
        body:          JSON.stringify(payload),
      },
    ),

  updateStudentMetrics: (payload: UpdateMetricsPayload) =>
    apiRequest<{ studentProfile: StudentProfile }>('/user/metrics', {
      method:        'PUT',
      authenticated: true,
      body:          JSON.stringify(payload),
    }),

  // Inativar aluno
  deactivateStudent: (studentId: string) =>
    apiRequest<{ message: string }>(`/user/student/${studentId}/deactivate`, {
      method:        'PUT',
      authenticated: true,
      body:          JSON.stringify({}),
    }),
}
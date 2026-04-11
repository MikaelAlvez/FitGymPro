import { apiRequest } from './api'

// Declara User localmente para evitar problemas de path circular
export interface User {
  id:      string
  name:    string
  email:   string
  role:    'PERSONAL' | 'STUDENT'
  avatar?: string
}

// ─── Types ───────────────────────────────────
export interface AuthResponse {
  user:         User
  accessToken:  string
  refreshToken: string
}

export interface LoginPayload {
  email:    string
  password: string
}

export interface RegisterStudentPayload {
  name:         string
  cpf:          string
  email:        string
  phone:        string
  password:     string
  role:         'STUDENT'
  // Endereço
  cep?:          string
  street?:       string
  number?:       string
  neighborhood?: string
  city?:         string
  state?:        string
  // Perfil
  sex:          string
  birthDate:    string
  weight:       string
  height:       string
  goal:         string
  focusMuscle:  string
  experience:   'beginner' | 'intermediate' | 'advanced'
  gymType:      'basic' | 'advanced'
  cardio:       'include' | 'exclude'
  trainingDays: string[]
  personalId?:  string
}

export interface RegisterPersonalPayload {
  name:           string
  cpf:            string
  email:          string
  phone:          string
  password:       string
  role:           'PERSONAL'
  // Endereço
  cep?:           string
  street?:        string
  number?:        string
  neighborhood?:  string
  city?:          string
  state?:         string
  // Perfil
  sex:            string
  birthDate:      string
  weight:         string
  height:         string
  course:         string
  university:     string
  educationLevel: string
  cref:           string
  classFormat:    'presential' | 'online' | 'hybrid'
  availableDays:  string[]
}

// ─── Requests ────────────────────────────────
export const authService = {
  login: (payload: LoginPayload) =>
    apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body:   JSON.stringify(payload),
    }),

  registerStudent: (payload: RegisterStudentPayload) =>
    apiRequest<AuthResponse>('/auth/register/student', {
      method: 'POST',
      body:   JSON.stringify(payload),
    }),

  registerPersonal: (payload: RegisterPersonalPayload) =>
    apiRequest<AuthResponse>('/auth/register/personal', {
      method: 'POST',
      body:   JSON.stringify(payload),
    }),

  me: () =>
    apiRequest<User>('/auth/me', { authenticated: true }),

  checkEmail: (email: string) =>
    apiRequest<{ available: boolean }>('/auth/check-email', {
      method: 'POST',
      body:   JSON.stringify({ email }),
    }),

  checkCpf: (cpf: string) =>
    apiRequest<{ available: boolean }>('/auth/check-cpf', {
      method: 'POST',
      body:   JSON.stringify({ cpf }),
    }),

  logout: (refreshToken: string) =>
    apiRequest<void>('/auth/logout', {
      method: 'POST',
      body:   JSON.stringify({ refreshToken }),
    }),
}
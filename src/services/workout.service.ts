import { apiRequest } from './api'

export interface Exercise {
  id?:        string
  name:       string
  sets:       string
  reps:       string
  order:      number
  type:       'exercise' | 'cardio'
  groupId?:   string
  groupLabel?:string
  duration?:  string
  load?:      string
  restTime?:  string
  isDrop?:    boolean  
  dropSets?:  string    
}

export interface DropSetEntry {
  reps: string
  load: string
}

export interface Workout {
  id:         string
  name:       string
  days:       string[]
  notes:      string | null
  personalId: string | null
  studentId:  string
  active:     boolean
  createdAt:  string
  updatedAt:  string
  exercises:  Exercise[]
  personal?: {
    id:   string
    name: string
    personalProfile: { cref: string } | null
  }
}

export interface CreateWorkoutPayload {
  studentId?: string
  name:       string
  days:       string[]
  notes?:     string
  exercises:  Exercise[]
}

export const workoutService = {
  listByStudent: (studentId: string) =>
    apiRequest<Workout[]>(`/workouts/student/${studentId}`, { authenticated: true }),

  create: (payload: CreateWorkoutPayload) =>
    apiRequest<Workout>('/workouts', {
      method:        'POST',
      authenticated: true,
      body:          JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<CreateWorkoutPayload>) =>
    apiRequest<Workout>(`/workouts/${id}`, {
      method:        'PUT',
      authenticated: true,
      body:          JSON.stringify(payload),
    }),

  delete: (id: string) =>
    apiRequest<void>(`/workouts/${id}`, {
      method:        'DELETE',
      authenticated: true,
    }),

  myWorkouts: () =>
    apiRequest<Workout[]>('/workouts/my', { authenticated: true }),

  deactivateWorkout: (id: string) =>
    apiRequest<{ message: string }>(`/workouts/${id}/deactivate`, {
      method: 'PUT', authenticated: true, body: JSON.stringify({}),
    }),

  activateWorkout: (id: string) =>
    apiRequest<{ message: string }>(`/workouts/${id}/activate`, {
      method: 'PUT', authenticated: true, body: JSON.stringify({}),
    }),
}
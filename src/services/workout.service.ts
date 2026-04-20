import { apiRequest } from './api'

export interface Exercise {
  id?:    string
  name:   string
  sets:   string
  reps:   string
  order?: number
}

export interface Workout {
  id:         string
  name:       string
  days:       string[]
  notes:      string | null
  personalId: string
  studentId:  string
  createdAt:  string
  updatedAt:  string
  exercises:  Exercise[]
}

export interface CreateWorkoutPayload {
  studentId: string
  name:      string
  days:      string[]
  notes?:    string
  exercises: Exercise[]
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
      body:          JSON.stringify({}),
    }),

  deactivateStudent: (studentId: string) =>
    apiRequest<{ message: string }>(`/user/student/${studentId}/deactivate`, {
      method:        'PUT',
      authenticated: true,
      body:          JSON.stringify({}),
  }),

  myWorkouts: () =>
    apiRequest<Workout[]>('/workouts/my', { authenticated: true }),
}
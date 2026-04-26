import { apiRequest } from './api'

export interface WorkoutSession {
  id:         string
  workoutId:  string
  studentId:  string
  startedAt:  string
  finishedAt: string | null
  duration:   number | null
  caption:    string
  notes:      string | null
  location:   string | null
  photoStart: string | null
  photoEnd:   string | null
  workout?:   { id: string; name: string }
}

export interface CheckinPayload {
  workoutId:   string
  caption:     string
  notes?:      string
  location?:   string
  photoStart?: string
}

export interface CheckoutPayload {
  caption:   string
  notes?:    string
  location?: string
  photoEnd?: string
}

export interface UpdateSessionPayload {
  caption?:  string
  notes?:    string | null
  location?: string | null
}

export const sessionService = {
  checkin: (payload: CheckinPayload) =>
    apiRequest<WorkoutSession>('/sessions/checkin', {
      method:        'POST',
      authenticated: true,
      body:          JSON.stringify(payload),
    }),

  checkout: (sessionId: string, payload: CheckoutPayload) =>
    apiRequest<WorkoutSession>(`/sessions/${sessionId}/checkout`, {
      method:        'PUT',
      authenticated: true,
      body:          JSON.stringify(payload),
    }),

  getActive: () =>
    apiRequest<WorkoutSession | null>('/sessions/active', { authenticated: true }),

  getHistory: () =>
    apiRequest<WorkoutSession[]>('/sessions/history', { authenticated: true }),

  update: (sessionId: string, payload: UpdateSessionPayload) =>
    apiRequest<WorkoutSession>(`/sessions/${sessionId}`, {
      method:        'PUT',
      authenticated: true,
      body:          JSON.stringify(payload),
    }),

  remove: (sessionId: string) =>
    apiRequest<void>(`/sessions/${sessionId}`, {
      method:        'DELETE',
      authenticated: true,
    }),

  // Busca exercícios concluídos de uma sessão
  getExercisesDone: (sessionId: string) =>
    apiRequest<string[]>(`/sessions/${sessionId}/exercises-done`, {
      authenticated: true,
    }),

  // Toggle exercício concluído/não concluído
  toggleExerciseDone: (sessionId: string, exerciseId: string) =>
    apiRequest<{ done: boolean }>(`/sessions/${sessionId}/exercises-done/${exerciseId}`, {
      method:        'POST',
      authenticated: true,
    }),

    // Busca exercícios concluídos do treino hoje (sessão ativa ou finalizada)
  getTodayDone: (workoutId: string) =>
    apiRequest<string[]>(`/sessions/today-done/${workoutId}`, {
      authenticated: true,
    }),
}
import { apiRequest } from './api'

export interface PersonalItem {
  id:            string
  name:          string
  avatar:        string | null
  city:          string | null
  state:         string | null
  requestStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED' | null
  personalProfile: {
    cref:        string
    classFormat: string
    course:      string
  } | null
}

export interface PersonalRequest {
  id:         string
  studentId:  string
  personalId: string
  status:     'PENDING' | 'ACCEPTED' | 'REJECTED'
  message:    string | null
  createdAt:  string
  updatedAt:  string
  student?: {
    id:     string
    name:   string
    avatar: string | null
    city:   string | null
    state:  string | null
    studentProfile: {
      goal:       string
      experience: string
    } | null
  }
  personal?: {
    id:     string
    name:   string
    avatar: string | null
    personalProfile: {
      cref:        string
      classFormat: string
    } | null
  }
}

export const personalRequestService = {
  listPersonals: () =>
    apiRequest<PersonalItem[]>('/personals', { authenticated: true }),

  sendRequest: (personalId: string, message?: string) =>
    apiRequest<PersonalRequest>('/personal-request', {
      method:        'POST',
      authenticated: true,
      body:          JSON.stringify({ personalId, message }),
    }),

  listPendingRequests: () =>
    apiRequest<PersonalRequest[]>('/personal-requests', { authenticated: true }),

  myRequestStatus: () =>
    apiRequest<PersonalRequest[]>('/personal-request/my-status', { authenticated: true }),

  acceptRequest: (id: string) =>
    apiRequest<{ message: string }>(`/personal-request/${id}/accept`, {
      method:        'PUT',
      authenticated: true,
      body:          JSON.stringify({}),
    }),

  rejectRequest: (id: string) =>
    apiRequest<{ message: string }>(`/personal-request/${id}/reject`, {
      method:        'PUT',
      authenticated: true,
      body:          JSON.stringify({}),
    }),

  unlinkPersonal: () =>
    apiRequest<{ message: string }>('/personal-request/unlink', {
      method:        'POST',
      authenticated: true,
      body:          JSON.stringify({}),
    }),
}
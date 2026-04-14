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

export const userService = {
  updateProfile: (payload: UpdateProfilePayload) =>
    apiRequest<User>('/user/profile', {
      method:        'PUT',
      authenticated: true,
      body:          JSON.stringify(payload),
    }),
}
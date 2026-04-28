import { apiRequest } from './api'

export type FriendStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | null

export interface FriendUser {
  id:       string
  name:     string
  avatar:   string | null
  userCode: string
  role:     string
}

export interface FriendRequest {
  id:         string
  senderId:   string
  receiverId: string
  status:     FriendStatus
  createdAt:  string
  sender?:    FriendUser
}

export interface FriendStatusResult {
  status:    FriendStatus
  requestId: string | null
  isSender:  boolean
}

export const friendService = {
  sendRequest: (userId: string) =>
    apiRequest<FriendRequest>(`/friends/request/${userId}`, {
      method:        'POST',
      authenticated: true,
    }),

  acceptRequest: (requestId: string) =>
    apiRequest<FriendRequest>(`/friends/request/${requestId}/accept`, {
      method:        'PUT',
      authenticated: true,
    }),

  rejectRequest: (requestId: string) =>
    apiRequest<{ message: string }>(`/friends/request/${requestId}/reject`, {
      method:        'PUT',
      authenticated: true,
    }),

  unfriend: (userId: string) =>
    apiRequest<{ message: string }>(`/friends/${userId}`, {
      method:        'DELETE',
      authenticated: true,
    }),

  listFriends: () =>
    apiRequest<FriendUser[]>('/friends', { authenticated: true }),

  listPendingRequests: () =>
    apiRequest<FriendRequest[]>('/friends/requests/pending', { authenticated: true }),

  getStatus: (userId: string) =>
    apiRequest<FriendStatusResult>(`/friends/status/${userId}`, { authenticated: true }),

  getFeed: (page = 1) =>
    apiRequest<any[]>(`/friends/feed?page=${page}`, { authenticated: true }),
}
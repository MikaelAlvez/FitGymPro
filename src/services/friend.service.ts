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

export interface SessionComment {
  id:        string
  sessionId: string
  userId:    string
  text:      string
  createdAt: string
  user:      { id: string; name: string; avatar: string | null }
}

export interface FeedSession {
  id:           string
  workoutId:    string
  studentId:    string
  startedAt:    string
  finishedAt:   string | null
  duration:     number | null
  caption:      string
  captionEnd:   string | null
  notes:        string | null
  notesEnd:     string | null
  location:     string | null
  photoStart:   string | null
  photoEnd:     string | null
  likeCount:    number
  likedByMe:    boolean
  commentCount: number
  workout:      { id: string; name: string } | null
  student:      { id: string; name: string; avatar: string | null; userCode: string }
  likes:        { id: string; userId: string; user: { id: string; name: string } }[]
  comments:     SessionComment[]
}

export const friendService = {
  sendRequest: (userId: string) =>
    apiRequest<FriendRequest>(`/friends/request/${userId}`, {
      method: 'POST', authenticated: true,
    }),

  acceptRequest: (requestId: string) =>
    apiRequest<FriendRequest>(`/friends/request/${requestId}/accept`, {
      method: 'PUT', authenticated: true,
    }),

  rejectRequest: (requestId: string) =>
    apiRequest<{ message: string }>(`/friends/request/${requestId}/reject`, {
      method: 'PUT', authenticated: true,
    }),

  unfriend: (userId: string) =>
    apiRequest<{ message: string }>(`/friends/${userId}`, {
      method: 'DELETE', authenticated: true,
    }),

  listFriends: () =>
    apiRequest<FriendUser[]>('/friends', { authenticated: true }),

  listPendingRequests: () =>
    apiRequest<FriendRequest[]>('/friends/requests/pending', { authenticated: true }),

  getStatus: (userId: string) =>
    apiRequest<FriendStatusResult>(`/friends/status/${userId}`, { authenticated: true }),

  getFeed: (page = 1) =>
    apiRequest<FeedSession[]>(`/friends/feed?page=${page}`, { authenticated: true }),

  // Likes
  toggleLike: (sessionId: string) =>
    apiRequest<{ liked: boolean }>(`/sessions/${sessionId}/like`, {
      method: 'POST', authenticated: true,
    }),

  // Comentários
  getComments: (sessionId: string) =>
    apiRequest<SessionComment[]>(`/sessions/${sessionId}/comments`, { authenticated: true }),

  addComment: (sessionId: string, text: string) =>
    apiRequest<SessionComment>(`/sessions/${sessionId}/comments`, {
      method: 'POST', authenticated: true,
      body:   JSON.stringify({ text }),
    }),

  deleteComment: (commentId: string) =>
    apiRequest<{ message: string }>(`/sessions/comments/${commentId}`, {
      method: 'DELETE', authenticated: true,
    }),
}
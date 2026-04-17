import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { personalRequestService } from '../services/personal-request.service'

interface RequestsContextData {
  pendingCount:   number
  loadPendingCount: () => Promise<void>
}

const RequestsContext = createContext<RequestsContextData>({} as RequestsContextData)

export function RequestsProvider({ children }: { children: ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0)

  const loadPendingCount = useCallback(async () => {
    try {
      const data = await personalRequestService.listPendingRequests()
      setPendingCount(data.length)
    } catch {
      // silencia
    }
  }, [])

  return (
    <RequestsContext.Provider value={{ pendingCount, loadPendingCount }}>
      {children}
    </RequestsContext.Provider>
  )
}

export function useRequests() {
  return useContext(RequestsContext)
}
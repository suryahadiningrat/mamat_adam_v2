'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

export type WorkspaceBasic = {
  id: string
  name: string
  slug: string
  role: string
  logo_url?: string | null
  avatar_color?: string | null
  avatar_emoji?: string | null
  api_usage_usd?: number
  api_limit_usd?: number
}

type WorkspaceContextType = {
  activeWorkspace: WorkspaceBasic | null
  workspaces: WorkspaceBasic[]
  workspaceId: string
  loading: boolean
  switchWorkspace: (id: string) => void
  createWorkspace: (name: string) => Promise<string | null>
  refreshWorkspaces: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  activeWorkspace: null,
  workspaces: [],
  workspaceId: '',
  loading: true,
  switchWorkspace: () => {},
  createWorkspace: async () => null,
  refreshWorkspaces: async () => {},
})

export function useWorkspace() {
  return useContext(WorkspaceContext)
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const [workspaces, setWorkspaces] = useState<WorkspaceBasic[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const loadWorkspaces = useCallback(async () => {
    if (status !== 'authenticated') {
      if (status === 'unauthenticated') setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/workspaces')
      if (!res.ok) throw new Error('Failed to fetch workspaces')
      const list: WorkspaceBasic[] = await res.json()

      if (list.length === 0) {
        setLoading(false)
        return
      }

      setWorkspaces(list)

      const stored = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null
      const validStored = stored && list.find(w => w.id === stored)
      const selected = validStored ? stored : list[0].id

      setActiveId(selected)
      if (typeof window !== 'undefined') localStorage.setItem('activeWorkspaceId', selected)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { loadWorkspaces() }, [loadWorkspaces])

  function switchWorkspace(id: string) {
    if (id === activeId) return
    setActiveId(id)
    if (typeof window !== 'undefined') localStorage.setItem('activeWorkspaceId', id)
  }

  async function createWorkspace(name: string): Promise<string | null> {
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })

      if (!res.ok) throw new Error('Failed to create workspace')
      
      const data = await res.json()
      await loadWorkspaces()
      switchWorkspace(data.id)
      return data.id
    } catch (err) {
      console.error(err)
      return null
    }
  }

  const activeWorkspace = workspaces.find(w => w.id === activeId) || null

  return (
    <WorkspaceContext.Provider value={{
      activeWorkspace,
      workspaces,
      workspaceId: activeId,
      loading,
      switchWorkspace,
      createWorkspace,
      refreshWorkspaces: loadWorkspaces,
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

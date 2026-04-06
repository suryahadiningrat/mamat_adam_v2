'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

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
  const [workspaces, setWorkspaces] = useState<WorkspaceBasic[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const loadWorkspaces = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: roles } = await supabase
      .from('user_workspace_roles')
      .select('workspace_id, role, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!roles || roles.length === 0) { setLoading(false); return }

    const wsIds = roles.map(r => r.workspace_id)
    const { data: wsData } = await supabase
      .from('workspaces')
      .select('id, name, slug, logo_url, avatar_color, avatar_emoji, api_usage_usd, api_limit_usd')
      .in('id', wsIds)

    const wsMap = Object.fromEntries((wsData || []).map(w => [w.id, w]))

    const list: WorkspaceBasic[] = roles
      .filter(r => wsMap[r.workspace_id])
      .map(r => ({
        id: r.workspace_id,
        role: r.role,
        ...wsMap[r.workspace_id],
      }))

    setWorkspaces(list)

    const stored = typeof window !== 'undefined' ? localStorage.getItem('activeWorkspaceId') : null
    const validStored = stored && list.find(w => w.id === stored)
    const selected = validStored ? stored : list[0].id

    setActiveId(selected)
    if (typeof window !== 'undefined') localStorage.setItem('activeWorkspaceId', selected)
    setLoading(false)
  }, [])

  useEffect(() => { loadWorkspaces() }, [loadWorkspaces])

  function switchWorkspace(id: string) {
    if (id === activeId) return
    setActiveId(id)
    if (typeof window !== 'undefined') localStorage.setItem('activeWorkspaceId', id)
  }

  async function createWorkspace(name: string): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
      '-' + Math.floor(Math.random() * 9000 + 1000)

    const { data: ws, error } = await supabase
      .from('workspaces')
      .insert({ name: name.trim(), slug, status: 'active', api_limit_usd: 20 })
      .select('id')
      .single()

    if (error || !ws) return null

    await supabase.from('user_workspace_roles').insert({
      workspace_id: ws.id,
      user_id: user.id,
      role: 'admin',
    })

    await loadWorkspaces()
    switchWorkspace(ws.id)
    return ws.id
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

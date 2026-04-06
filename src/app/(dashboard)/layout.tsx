'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import { supabase } from '@/lib/supabase'

async function ensureWorkspace(userId: string, email: string) {
  // Always ensure profile has email stored (needed for invite matching)
  await supabase.from('user_profiles').upsert({
    id: userId,
    full_name: email.split('@')[0],
    email: email
  }, { onConflict: 'id', ignoreDuplicates: false })

  // Check if user already has a workspace role
  const { data: roles } = await supabase
    .from('user_workspace_roles')
    .select('workspace_id')
    .eq('user_id', userId)
    .limit(1)

  if (roles && roles.length > 0) return // already set up

  // Check for a pending invitation to an existing workspace
  const { data: invite } = await supabase
    .from('workspace_invitations')
    .select('id, workspace_id, role')
    .eq('invited_email', email)
    .eq('status', 'pending')
    .limit(1)
    .single()

  if (invite) {
    // Join the invited workspace instead of creating a new one
    await supabase.from('user_workspace_roles').insert({
      workspace_id: invite.workspace_id,
      user_id: userId,
      role: invite.role
    })
    await supabase.from('workspace_invitations').update({
      status: 'accepted',
      accepted_at: new Date().toISOString()
    }).eq('id', invite.id)
    return
  }

  // No invitation — create a brand new workspace for this user
  const name = email.split('@')[0]
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000)

  const { data: ws, error: wsErr } = await supabase
    .from('workspaces')
    .insert({ name: name + ' Workspace', slug, status: 'active', api_limit_usd: 20 })
    .select('id')
    .single()

  if (wsErr || !ws) return

  await supabase.from('user_workspace_roles').insert({
    workspace_id: ws.id,
    user_id: userId,
    role: 'admin'
  })
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        await ensureWorkspace(session.user.id, session.user.email ?? '')
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="logo-mark fade-up" style={{ width: 48, height: 48, fontSize: 24, borderRadius: 14 }}>F</div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <Topbar />
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

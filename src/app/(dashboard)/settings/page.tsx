'use client'
import { useState, useEffect } from 'react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useSession, signOut } from 'next-auth/react'
import {
  User, Building2, DollarSign, Save, CheckCircle2, AlertCircle,
  Users, Mail, UserPlus, Trash2, Shield, ChevronDown, RefreshCw
} from 'lucide-react'

type Member = {
  user_id: string
  role: string
  full_name: string | null
  email: string | null
  is_current: boolean
}

type Invite = {
  id: string
  invited_email: string
  role: string
  created_at: string
  status: string
}

const TABS = ['Profile', 'Workspace', 'Team'] as const
type Tab = typeof TABS[number]

const roleColors: Record<string, { bg: string; text: string }> = {
  admin:  { bg: 'rgba(124,109,250,0.12)', text: '#7c6dfa' },
  editor: { bg: 'rgba(59,130,246,0.12)',  text: '#3b82f6' },
  viewer: { bg: 'rgba(156,163,175,0.12)', text: '#9ca3af' },
}

export default function SettingsPage() {
  const { workspaceId: ctxWorkspaceId, refreshWorkspaces } = useWorkspace()
  const [activeTab, setActiveTab] = useState<Tab>('Profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [profile, setProfile] = useState({ full_name: '', email: '' })
  const [workspace, setWorkspace] = useState({ name: '', slug: '', description: '', api_limit_usd: '20' })
  const [workspaceId, setWorkspaceId] = useState('')
  const [userId, setUserId] = useState('')
  const [userRole, setUserRole] = useState('editor')
  const [apiUsage, setApiUsage] = useState(0)

  // Team
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('editor')
  const [inviting, setInviting] = useState(false)
  const [teamError, setTeamError] = useState('')
  const [teamMsg, setTeamMsg] = useState('')

  const { data: session } = useSession()

  useEffect(() => { if (ctxWorkspaceId && session?.user) loadSettings() }, [ctxWorkspaceId, session])

  async function loadSettings() {
    setLoading(true)
    if (!session?.user) return
    const userId = (session.user as any).id
    setUserId(userId)
    setProfile(p => ({ ...p, email: session.user?.email ?? '' }))

    const wsId = ctxWorkspaceId
    if (!wsId) { setLoading(false); return }
    setWorkspaceId(wsId)

    try {
      const [profileRes, wsRes] = await Promise.all([
        fetch('/api/settings/profile').then(r => r.json()),
        fetch(`/api/settings/workspace?workspaceId=${wsId}`).then(r => r.json())
      ])

      if (profileRes.profile) setProfile(p => ({ ...p, full_name: profileRes.profile.full_name ?? '' }))
      if (wsRes.workspace) {
        setWorkspace({
          name: wsRes.workspace.name ?? '',
          slug: wsRes.workspace.slug ?? '',
          description: wsRes.workspace.description ?? '',
          api_limit_usd: String(wsRes.workspace.api_limit_usd ?? 20)
        })
        setApiUsage(wsRes.workspace.api_usage_usd ?? 0)
      }
      if (wsRes.role) {
        setUserRole(wsRes.role)
      }

      await loadTeam(wsId, userId)
    } catch (err) {
      console.error('Error loading settings:', err)
    }
    setLoading(false)
  }

  async function loadTeam(wsId: string, currentUserId: string) {
    try {
      const res = await fetch(`/api/settings/team?workspaceId=${wsId}`)
      const data = await res.json()

      if (data.members) {
        setMembers(data.members.map((m: any) => ({
          ...m,
          is_current: m.user_id === currentUserId
        })))
      }
      if (data.invites) setInvites(data.invites)
    } catch (err) {
      console.error('Error loading team:', err)
    }
  }

  const showSaved = (key: string) => { setSaved(key); setTimeout(() => setSaved(null), 2500) }

  async function saveProfile() {
    setSaving('profile'); setError('')
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: profile.full_name })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save profile')
      setSaving(null); showSaved('profile')
    } catch (err: any) {
      setError(err.message); setSaving(null)
    }
  }

  async function saveWorkspace() {
    setSaving('workspace'); setError('')
    try {
      const res = await fetch('/api/settings/workspace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          name: workspace.name,
          description: workspace.description,
          api_limit_usd: parseFloat(workspace.api_limit_usd) || 20
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save workspace')
      setSaving(null); showSaved('workspace')
      refreshWorkspaces()
    } catch (err: any) {
      setError(err.message); setSaving(null)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    const email = inviteEmail.trim().toLowerCase()
    if (!email) return
    setInviting(true); setTeamError(''); setTeamMsg('')

    try {
      const res = await fetch('/api/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invite',
          workspaceId,
          email,
          role: inviteRole
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send invite')
      setTeamMsg(data.message)
      setInviteEmail('')
      await loadTeam(workspaceId, userId)
    } catch (err: any) {
      setTeamError(err.message)
    }
    setInviting(false)
  }

  async function handleRevokeInvite(inviteId: string) {
    try {
      await fetch('/api/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revokeInvite', workspaceId, inviteId })
      })
      setInvites(prev => prev.filter(i => i.id !== inviteId))
    } catch (err) {
      console.error('Failed to revoke invite', err)
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    try {
      await fetch('/api/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateRole', workspaceId, memberId, newRole })
      })
      setMembers(prev => prev.map(m => m.user_id === memberId ? { ...m, role: newRole } : m))
    } catch (err) {
      console.error('Failed to update role', err)
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('Remove this member from the workspace?')) return
    try {
      await fetch('/api/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removeMember', workspaceId, memberId })
      })
      setMembers(prev => prev.filter(m => m.user_id !== memberId))
    } catch (err) {
      console.error('Failed to remove member', err)
    }
  }

  async function handleLogout() {
    await signOut({ callbackUrl: '/login' })
  }

  const usagePct = parseFloat(workspace.api_limit_usd) > 0
    ? Math.min((apiUsage / parseFloat(workspace.api_limit_usd)) * 100, 100) : 0

  const isAdmin = userRole === 'admin'

  return (
    <div>
      <div className="page-header page-header-row fade-up fade-up-1">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your profile, workspace, and team.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="fade-up fade-up-2" style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-body)',
            color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
            borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.15s'
          }}>{tab}</button>
        ))}
      </div>

      {error && (
        <div style={{ padding: 12, background: 'var(--red-alpha)', border: '1px solid var(--red)', borderRadius: 8, color: 'var(--red)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* ─── Profile Tab ─────────────────────────────────────────────── */}
      {activeTab === 'Profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20, maxWidth: 860 }}>
          <div className="panel fade-up fade-up-2">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <User size={14} style={{ color: 'var(--text-secondary)' }} /> Profile
              </span>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 20 }}>
                  {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{profile.full_name || 'Your Name'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{profile.email}</div>
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Full Name</label>
                <input className="form-input" value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} placeholder="Your full name" disabled={loading} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email</label>
                <input className="form-input" value={profile.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Managed by Supabase Auth.</div>
              </div>
              <button className="btn btn-primary" onClick={saveProfile} disabled={saving === 'profile' || loading} style={{ alignSelf: 'flex-start' }}>
                {saved === 'profile' ? <><CheckCircle2 size={13} /> Saved!</> : saving === 'profile' ? 'Saving...' : <><Save size={13} /> Save Profile</>}
              </button>
            </div>
          </div>

          {/* Danger zone */}
          <div className="panel" style={{ border: '1px solid rgba(248,113,113,0.25)', alignSelf: 'start' }}>
            <div className="panel-header" style={{ borderBottom: '1px solid rgba(248,113,113,0.15)' }}>
              <span className="panel-title" style={{ color: 'var(--red)' }}>Danger Zone</span>
            </div>
            <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>Sign out</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>You will be redirected to login.</div>
              </div>
              <button onClick={handleLogout} style={{
                padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)',
                transition: 'all 0.15s', fontFamily: 'var(--font-body)'
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red)'; (e.currentTarget as HTMLButtonElement).style.color = 'white' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Workspace Tab ───────────────────────────────────────────── */}
      {activeTab === 'Workspace' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20, maxWidth: 860 }}>
          <div className="panel fade-up fade-up-2">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Building2 size={14} style={{ color: 'var(--text-secondary)' }} /> Workspace
              </span>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Workspace Name</label>
                <input className="form-input" value={workspace.name} onChange={e => setWorkspace(w => ({ ...w, name: e.target.value }))} placeholder="e.g. Floothink Agency" disabled={loading || !isAdmin} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Slug</label>
                <input className="form-input" value={workspace.slug} disabled style={{ opacity: 0.6, cursor: 'not-allowed', fontFamily: 'var(--font-mono)', fontSize: 12 }} />
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Set on creation, cannot be changed.</div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={workspace.description} onChange={e => setWorkspace(w => ({ ...w, description: e.target.value }))} placeholder="Brief description..." disabled={loading || !isAdmin} />
              </div>
              {isAdmin && (
                <button className="btn btn-primary" onClick={saveWorkspace} disabled={saving === 'workspace' || loading} style={{ alignSelf: 'flex-start' }}>
                  {saved === 'workspace' ? <><CheckCircle2 size={13} /> Saved!</> : saving === 'workspace' ? 'Saving...' : <><Save size={13} /> Save Workspace</>}
                </button>
              )}
            </div>
          </div>

          <div className="panel fade-up fade-up-3">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <DollarSign size={14} style={{ color: 'var(--text-secondary)' }} /> API Usage & Limits
              </span>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>This month's usage</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>${apiUsage.toFixed(4)} / ${workspace.api_limit_usd}</span>
                </div>
                <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${usagePct}%`, borderRadius: 4, transition: 'width 0.5s', background: usagePct > 90 ? 'var(--red)' : usagePct > 70 ? 'var(--amber)' : 'var(--green)' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>{usagePct.toFixed(1)}% used</div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Monthly Limit (USD)</label>
                <input className="form-input" type="number" min="1" step="1" value={workspace.api_limit_usd} onChange={e => setWorkspace(w => ({ ...w, api_limit_usd: e.target.value }))} disabled={loading || !isAdmin} />
              </div>
              {isAdmin && (
                <button className="btn btn-primary" onClick={saveWorkspace} disabled={saving === 'workspace' || loading} style={{ alignSelf: 'flex-start' }}>
                  {saved === 'workspace' ? <><CheckCircle2 size={13} /> Saved!</> : saving === 'workspace' ? 'Saving...' : <><Save size={13} /> Save Limit</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Team Tab ────────────────────────────────────────────────── */}
      {activeTab === 'Team' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 860 }}>

          {/* Current Members */}
          <div className="panel fade-up fade-up-2">
            <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Users size={14} style={{ color: 'var(--text-secondary)' }} /> Members
                <span style={{ fontSize: 11, fontWeight: 500, padding: '1px 7px', borderRadius: 20, background: 'var(--surface-3)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>{members.length}</span>
              </span>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => loadTeam(workspaceId, userId)}>
                <RefreshCw size={11} />
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {loading ? (
                <div style={{ padding: 20, color: 'var(--text-tertiary)', fontSize: 13 }}>Loading members…</div>
              ) : members.length === 0 ? (
                <div style={{ padding: 20, color: 'var(--text-tertiary)', fontSize: 13 }}>No members found.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Member', 'Email', 'Role', ''].map(h => (
                        <th key={h} style={{ padding: '9px 20px', fontSize: 10.5, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'left', background: 'var(--surface-3)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(m => (
                      <tr key={m.user_id} style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                              {(m.full_name || m.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                {m.full_name || 'Unnamed'}
                                {m.is_current && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)', background: 'rgba(124,109,250,0.1)', padding: '1px 6px', borderRadius: 10 }}>You</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
                          {m.email || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          {isAdmin && !m.is_current ? (
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <select value={m.role} onChange={e => handleRoleChange(m.user_id, e.target.value)}
                                style={{ appearance: 'none', background: roleColors[m.role]?.bg || 'var(--surface-3)', border: `1px solid ${roleColors[m.role]?.text || 'var(--border)'}40`, borderRadius: 20, padding: '3px 24px 3px 10px', fontSize: 11.5, color: roleColors[m.role]?.text || 'var(--text-primary)', fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none' }}>
                                <option value="admin">Admin</option>
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              <ChevronDown size={10} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: roleColors[m.role]?.text || 'var(--text-tertiary)' }} />
                            </div>
                          ) : (
                            <span style={{ fontSize: 11.5, padding: '3px 10px', borderRadius: 20, background: roleColors[m.role]?.bg || 'var(--surface-3)', color: roleColors[m.role]?.text || 'var(--text-secondary)', fontWeight: 600 }}>
                              {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          {isAdmin && !m.is_current && (
                            <button onClick={() => handleRemoveMember(m.user_id)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4, borderRadius: 4 }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Invite */}
          {isAdmin && (
            <div className="panel fade-up fade-up-3">
              <div className="panel-header">
                <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <UserPlus size={14} style={{ color: 'var(--text-secondary)' }} /> Invite to Workspace
                </span>
              </div>
              <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  Enter the person's email. If they already have an account, they'll be added immediately. Otherwise, an invite is created and they'll join when they sign up.
                </p>

                {teamError && (
                  <div style={{ padding: '10px 14px', background: 'var(--red-alpha)', border: '1px solid var(--red)', borderRadius: 8, color: 'var(--red)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <AlertCircle size={13} /> {teamError}
                  </div>
                )}
                {teamMsg && (
                  <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, color: '#10b981', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <CheckCircle2 size={13} /> {teamMsg}
                  </div>
                )}

                <form onSubmit={handleInvite} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ margin: 0, flex: 1 }}>
                    <label className="form-label">Email address</label>
                    <input className="form-input" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" required />
                  </div>
                  <div className="form-group" style={{ margin: 0, width: 130 }}>
                    <label className="form-label">Role</label>
                    <select className="form-input" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={inviting} style={{ flexShrink: 0, marginBottom: 1 }}>
                    {inviting ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</> : <><Mail size={13} /> Send Invite</>}
                  </button>
                </form>

                {/* Pending Invites */}
                {invites.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>Pending invitations</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {invites.map(inv => (
                        <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <Mail size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                          <div style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{inv.invited_email}</div>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: roleColors[inv.role]?.bg, color: roleColors[inv.role]?.text, fontWeight: 600 }}>
                            {inv.role.charAt(0).toUpperCase() + inv.role.slice(1)}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                            {new Date(inv.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                          <button onClick={() => handleRevokeInvite(inv.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 12, padding: '3px 8px', borderRadius: 6, transition: 'all 0.15s', fontFamily: 'var(--font-body)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-alpha)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)'; (e.currentTarget as HTMLButtonElement).style.background = 'none' }}>
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!isAdmin && (
            <div style={{ padding: '14px 18px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <Shield size={14} style={{ color: 'var(--text-tertiary)' }} />
              Only workspace admins can invite or manage members.
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

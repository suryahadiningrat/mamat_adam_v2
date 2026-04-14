'use client'
import { useState, useEffect } from 'react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useSession } from 'next-auth/react'
import {
  Building2, Users, DollarSign, Save, CheckCircle2, AlertCircle,
  UserPlus, Trash2, Shield, ChevronDown, RefreshCw, Mail, Palette,
  Globe, LogOut, XCircle
} from 'lucide-react'

const AVATAR_COLORS = [
  '#7c6dfa', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316',
]

const TABS = ['Identity', 'Members', 'Billing', 'Danger'] as const
type Tab = typeof TABS[number]

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
}

const roleColors: Record<string, { bg: string; text: string }> = {
  admin:  { bg: 'rgba(124,109,250,0.12)', text: '#7c6dfa' },
  editor: { bg: 'rgba(59,130,246,0.12)',  text: '#3b82f6' },
  viewer: { bg: 'rgba(156,163,175,0.12)', text: '#9ca3af' },
}

export default function WorkspaceSettingsPage() {
  const { activeWorkspace, workspaceId, refreshWorkspaces } = useWorkspace()

  const [activeTab, setActiveTab] = useState<Tab>('Identity')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')
  const [userRole, setUserRole] = useState('editor')

  // Identity
  const [form, setForm] = useState({
    name: '',
    description: '',
    logo_url: '',
    avatar_color: '#7c6dfa',
    avatar_emoji: '',
  })

  // Members
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('editor')
  const [inviting, setInviting] = useState(false)
  const [teamMsg, setTeamMsg] = useState('')
  const [teamError, setTeamError] = useState('')

  // Billing
  const [apiLimit, setApiLimit] = useState('20')
  const [apiUsage, setApiUsage] = useState(0)

  const isAdmin = userRole === 'admin'

  const { data: session } = useSession()

  useEffect(() => {
    if (workspaceId && session?.user) load()
  }, [workspaceId, session])

  async function load() {
    setLoading(true)
    if (!session?.user) return
    const userId = (session.user as any).id
    setUserId(userId)

    try {
      const res = await fetch(`/api/settings/workspace?workspaceId=${workspaceId}`)
      const data = await res.json()

      if (data.workspace) {
        setForm({
          name: data.workspace.name ?? '',
          description: data.workspace.description ?? '',
          logo_url: data.workspace.logo_url ?? '',
          avatar_color: data.workspace.avatar_color ?? '#7c6dfa',
          avatar_emoji: data.workspace.avatar_emoji ?? '',
        })
        setApiLimit(String(data.workspace.api_limit_usd ?? 20))
        setApiUsage(data.workspace.api_usage_usd ?? 0)
      }
      if (data.role) {
        setUserRole(data.role)
      }

      await loadTeam(userId)
    } catch (err) {
      console.error('Error loading workspace settings:', err)
    }
    setLoading(false)
  }

  async function loadTeam(currentUserId: string) {
    try {
      const res = await fetch(`/api/settings/team?workspaceId=${workspaceId}`)
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

  async function handleSaveIdentity() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/settings/workspace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          name: form.name.trim(),
          description: form.description,
          logo_url: form.logo_url || null,
          avatar_color: form.avatar_color,
          avatar_emoji: form.avatar_emoji || null,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save identity')
      setSaving(false); setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      refreshWorkspaces()
    } catch (err: any) {
      setError(err.message); setSaving(false)
    }
  }

  async function handleSaveBilling() {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/settings/workspace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          api_limit_usd: parseFloat(apiLimit) || 20
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save billing')
      setSaving(false); setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err.message); setSaving(false)
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
      await loadTeam(userId)
    } catch (err: any) {
      setTeamError(err.message)
    }
    setInviting(false)
  }

  async function handleRoleChange(memberId: string, role: string) {
    try {
      await fetch('/api/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateRole', workspaceId, memberId, newRole: role })
      })
      setMembers(prev => prev.map(m => m.user_id === memberId ? { ...m, role } : m))
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

  async function handleRevokeInvite(id: string) {
    try {
      await fetch('/api/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revokeInvite', workspaceId, inviteId: id })
      })
      setInvites(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      console.error('Failed to revoke invite', err)
    }
  }

  async function handleLeaveWorkspace() {
    if (!confirm('Leave this workspace? You will lose access to all its content.')) return
    try {
      await fetch('/api/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removeMember', workspaceId, memberId: userId })
      })
      refreshWorkspaces()
      window.location.href = '/'
    } catch (err) {
      console.error('Failed to leave workspace', err)
    }
  }

  async function handleDeleteWorkspace() {
    const name = prompt(`Type the workspace name "${form.name}" to confirm deletion:`)
    if (name !== form.name) { alert('Name did not match. Deletion cancelled.'); return }
    try {
      await fetch(`/api/settings/workspace?workspaceId=${workspaceId}`, {
        method: 'DELETE'
      })
      refreshWorkspaces()
      window.location.href = '/'
    } catch (err) {
      console.error('Failed to delete workspace', err)
    }
  }

  const usagePct = parseFloat(apiLimit) > 0 ? Math.min((apiUsage / parseFloat(apiLimit)) * 100, 100) : 0

  // Preview avatar
  const previewLetter = form.avatar_emoji || form.name.charAt(0).toUpperCase() || 'W'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--text-tertiary)', fontSize: 13 }}>
      Loading…
    </div>
  )

  return (
    <div>
      <div className="page-header page-header-row fade-up fade-up-1">
        <div>
          <h1 className="page-title">Workspace Settings</h1>
          <p className="page-subtitle">Manage identity, members, and billing for <strong>{activeWorkspace?.name}</strong>.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="fade-up fade-up-2" style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-body)',
            color: activeTab === tab ? (tab === 'Danger' ? 'var(--red)' : 'var(--accent)') : 'var(--text-secondary)',
            borderBottom: activeTab === tab ? `2px solid ${tab === 'Danger' ? 'var(--red)' : 'var(--accent)'}` : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.15s'
          }}>{tab}</button>
        ))}
      </div>

      {error && (
        <div style={{ padding: 12, background: 'var(--red-alpha)', border: '1px solid var(--red)', borderRadius: 8, color: 'var(--red)', fontSize: 13, display: 'flex', gap: 8, marginBottom: 16 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* ─── Identity ─────────────────────────────────────────────── */}
      {activeTab === 'Identity' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 860 }}>
          <div className="panel fade-up fade-up-2" style={{ gridColumn: '1 / -1' }}>
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Building2 size={14} style={{ color: 'var(--text-secondary)' }} /> Workspace Identity
              </span>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Avatar preview + color picker */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                {/* Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 16, flexShrink: 0,
                    background: form.logo_url ? 'transparent' : form.avatar_color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, fontWeight: 700, color: 'white',
                    border: '2px solid var(--border)', overflow: 'hidden'
                  }}>
                    {form.logo_url
                      ? <img src={form.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setForm(f => ({ ...f, logo_url: '' }))} />
                      : previewLetter
                    }
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>Preview</span>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Color picker */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Palette size={12} /> Avatar Color
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {AVATAR_COLORS.map(color => (
                        <button key={color} onClick={() => setForm(f => ({ ...f, avatar_color: color }))}
                          style={{
                            width: 28, height: 28, borderRadius: 8, background: color, border: 'none', cursor: 'pointer',
                            outline: form.avatar_color === color ? `2px solid white` : 'none',
                            boxShadow: form.avatar_color === color ? `0 0 0 3px ${color}` : 'none',
                            transition: 'all 0.15s'
                          }} />
                      ))}
                      <input type="color" value={form.avatar_color} onChange={e => setForm(f => ({ ...f, avatar_color: e.target.value }))}
                        style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', padding: 1, background: 'var(--surface-3)' }} />
                    </div>
                  </div>

                  {/* Emoji override */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Avatar Emoji (optional)</label>
                    <input className="form-input" value={form.avatar_emoji} onChange={e => setForm(f => ({ ...f, avatar_emoji: e.target.value }))}
                      placeholder="e.g. 🚀 — replaces the first letter" maxLength={4}
                      style={{ width: 120 }} disabled={!isAdmin} />
                  </div>
                </div>
              </div>

              {/* Logo URL */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Globe size={12} /> Logo URL <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', fontWeight: 400 }}>(replaces avatar if set)</span>
                </label>
                <input className="form-input" value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                  placeholder="https://..." disabled={!isAdmin} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Workspace Name</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Floothink Agency" disabled={!isAdmin} />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of this workspace..." disabled={!isAdmin} />
              </div>

              {isAdmin && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={handleSaveIdentity} disabled={saving}>
                    {saved ? <><CheckCircle2 size={13} /> Saved!</> : saving ? 'Saving…' : <><Save size={13} /> Save Changes</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Members ──────────────────────────────────────────────── */}
      {activeTab === 'Members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 860 }}>
          {/* Current members */}
          <div className="panel fade-up fade-up-2">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Users size={14} style={{ color: 'var(--text-secondary)' }} /> Members
                <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 20, background: 'var(--surface-3)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>{members.length}</span>
              </span>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => loadTeam(userId)}>
                <RefreshCw size={11} />
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
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
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {m.full_name || 'Unnamed'}
                            {m.is_current && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)', background: 'rgba(124,109,250,0.1)', padding: '1px 6px', borderRadius: 10 }}>You</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{m.email || '—'}</td>
                      <td style={{ padding: '12px 20px' }}>
                        {isAdmin && !m.is_current ? (
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <select value={m.role} onChange={e => handleRoleChange(m.user_id, e.target.value)}
                              style={{ appearance: 'none', background: roleColors[m.role]?.bg, border: `1px solid ${roleColors[m.role]?.text}40`, borderRadius: 20, padding: '3px 24px 3px 10px', fontSize: 11.5, color: roleColors[m.role]?.text, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none' }}>
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <ChevronDown size={10} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: roleColors[m.role]?.text }} />
                          </div>
                        ) : (
                          <span style={{ fontSize: 11.5, padding: '3px 10px', borderRadius: 20, background: roleColors[m.role]?.bg, color: roleColors[m.role]?.text, fontWeight: 600 }}>
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
            </div>
          </div>

          {/* Invite */}
          {isAdmin && (
            <div className="panel fade-up fade-up-3">
              <div className="panel-header">
                <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <UserPlus size={14} style={{ color: 'var(--text-secondary)' }} /> Invite Member
                </span>
              </div>
              <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  Existing users are added immediately. New emails receive an invite for when they sign up.
                </p>
                {teamError && <div style={{ padding: '9px 14px', background: 'var(--red-alpha)', border: '1px solid var(--red)', borderRadius: 8, color: 'var(--red)', fontSize: 13 }}>{teamError}</div>}
                {teamMsg && <div style={{ padding: '9px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, color: '#10b981', fontSize: 13 }}>{teamMsg}</div>}
                <form onSubmit={handleInvite} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ margin: 0, flex: 1 }}>
                    <label className="form-label">Email</label>
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
                  <button type="submit" className="btn btn-primary" disabled={inviting} style={{ marginBottom: 1 }}>
                    {inviting ? 'Adding…' : <><Mail size={13} /> Add Member</>}
                  </button>
                </form>

                {invites.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Pending Invitations</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {invites.map(inv => (
                        <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <Mail size={12} style={{ color: 'var(--text-tertiary)' }} />
                          <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{inv.invited_email}</span>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: roleColors[inv.role]?.bg, color: roleColors[inv.role]?.text, fontWeight: 600 }}>{inv.role}</span>
                          <button onClick={() => handleRevokeInvite(inv.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 12, padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-body)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
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
            <div style={{ padding: '14px 18px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
              <Shield size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 1 }} />
              Only workspace admins can invite or manage members.
            </div>
          )}
        </div>
      )}

      {/* ─── Billing ──────────────────────────────────────────────── */}
      {activeTab === 'Billing' && (
        <div style={{ maxWidth: 520 }}>
          <div className="panel fade-up fade-up-2">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <DollarSign size={14} style={{ color: 'var(--text-secondary)' }} /> Claude API Usage
              </span>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>This month</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: usagePct > 90 ? 'var(--red)' : 'var(--text-primary)' }}>
                    ${apiUsage.toFixed(4)} / ${apiLimit}
                  </span>
                </div>
                <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${usagePct}%`, borderRadius: 6, background: usagePct > 90 ? 'var(--red)' : usagePct > 70 ? 'var(--amber)' : 'var(--green)', transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>{usagePct.toFixed(1)}% used</div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Monthly Limit (USD)</label>
                <input className="form-input" type="number" min="1" step="1" value={apiLimit}
                  onChange={e => setApiLimit(e.target.value)} disabled={!isAdmin} />
                <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 6 }}>
                  Generation is blocked when usage exceeds this limit.
                </div>
              </div>

              {isAdmin && (
                <button className="btn btn-primary" onClick={handleSaveBilling} disabled={saving} style={{ alignSelf: 'flex-start' }}>
                  {saved ? <><CheckCircle2 size={13} /> Saved!</> : saving ? 'Saving…' : <><Save size={13} /> Save Limit</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Danger ───────────────────────────────────────────────── */}
      {activeTab === 'Danger' && (
        <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Leave */}
          <div className="panel fade-up fade-up-2" style={{ border: '1px solid rgba(248,113,113,0.2)' }}>
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <LogOut size={14} style={{ color: 'var(--amber)' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Leave Workspace</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
                  Remove yourself from this workspace. You'll lose access to all its brands, content, and data.
                </p>
              </div>
              <button onClick={handleLeaveWorkspace}
                style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', border: '1px solid var(--amber)', color: 'var(--amber)', transition: 'all 0.15s', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                Leave
              </button>
            </div>
          </div>

          {/* Delete — admins only */}
          {isAdmin && (
            <div className="panel fade-up fade-up-3" style={{ border: '1px solid rgba(248,113,113,0.35)' }}>
              <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <XCircle size={14} style={{ color: 'var(--red)' }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)' }}>Delete Workspace</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
                    Permanently delete this workspace and all its data. This action cannot be undone.
                  </p>
                </div>
                <button onClick={handleDeleteWorkspace}
                  style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)', transition: 'all 0.15s', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red)'; (e.currentTarget as HTMLButtonElement).style.color = 'white' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}>
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

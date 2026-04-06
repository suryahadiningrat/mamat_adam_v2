'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Shield, Building2, Users, UserPlus, Trash2, RefreshCw,
  ChevronDown, CheckCircle2, AlertCircle, Mail, Crown, Eye
} from 'lucide-react'

type Workspace = {
  id: string
  name: string
  slug: string
  api_usage_usd: number
  api_limit_usd: number
  member_count: number
  expanded?: boolean
}

type Member = {
  user_id: string
  role: string
  full_name: string | null
  email: string | null
}

type Invite = {
  id: string
  invited_email: string
  role: string
  created_at: string
}

type UserProfile = {
  id: string
  full_name: string | null
  email: string | null
  is_superadmin: boolean
}

const roleColors: Record<string, { bg: string; text: string }> = {
  admin:  { bg: 'rgba(124,109,250,0.12)', text: '#7c6dfa' },
  editor: { bg: 'rgba(59,130,246,0.12)',  text: '#3b82f6' },
  viewer: { bg: 'rgba(156,163,175,0.12)', text: '#9ca3af' },
}

export default function AdminPage() {
  const [isSuperadmin, setIsSuperadmin] = useState<boolean | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [expandedWs, setExpandedWs] = useState<string | null>(null)
  const [wsMembers, setWsMembers] = useState<Record<string, Member[]>>({})
  const [wsInvites, setWsInvites] = useState<Record<string, Invite[]>>({})
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Invite state per workspace
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('editor')
  const [inviteWsId, setInviteWsId] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

  const [currentUserId, setCurrentUserId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    // Check superadmin
    const { data: prof } = await supabase.from('user_profiles')
      .select('is_superadmin').eq('id', user.id).single()
    if (!prof?.is_superadmin) { setIsSuperadmin(false); setLoading(false); return }
    setIsSuperadmin(true)

    // Load all workspaces
    const { data: wsData, error: wsErr } = await supabase
      .from('workspaces').select('id, name, slug, api_usage_usd, api_limit_usd').order('name')
    if (wsErr) { setError(wsErr.message); setLoading(false); return }

    // Count members per workspace
    const { data: rolesData } = await supabase
      .from('user_workspace_roles').select('workspace_id, user_id')
    const countMap: Record<string, number> = {}
    for (const r of rolesData || []) countMap[r.workspace_id] = (countMap[r.workspace_id] || 0) + 1

    setWorkspaces((wsData || []).map(w => ({ ...w, member_count: countMap[w.id] || 0 })))

    // Load all user profiles (superadmin can read all via RLS policy)
    const { data: usersData } = await supabase.from('user_profiles')
      .select('id, full_name, email, is_superadmin').order('full_name')
    setAllUsers(usersData || [])

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function loadWsDetails(wsId: string) {
    const [rolesRes, invitesRes] = await Promise.all([
      supabase.from('user_workspace_roles').select('user_id, role').eq('workspace_id', wsId),
      supabase.from('workspace_invitations').select('id, invited_email, role, created_at')
        .eq('workspace_id', wsId).eq('status', 'pending').order('created_at', { ascending: false })
    ])

    if (rolesRes.data) {
      const ids = rolesRes.data.map(r => r.user_id)
      const { data: profiles } = await supabase.from('user_profiles').select('id, full_name, email').in('id', ids)
      const pMap: Record<string, { full_name: string | null; email: string | null }> = {}
      for (const p of profiles || []) pMap[p.id] = { full_name: p.full_name, email: p.email }
      setWsMembers(prev => ({
        ...prev,
        [wsId]: rolesRes.data!.map(r => ({ user_id: r.user_id, role: r.role, ...pMap[r.user_id] }))
      }))
    }
    if (invitesRes.data) setWsInvites(prev => ({ ...prev, [wsId]: invitesRes.data! }))
  }

  async function toggleExpand(wsId: string) {
    if (expandedWs === wsId) { setExpandedWs(null); return }
    setExpandedWs(wsId)
    if (!wsMembers[wsId]) await loadWsDetails(wsId)
  }

  async function handleRemoveMember(wsId: string, memberId: string) {
    if (!confirm('Remove this member from the workspace?')) return
    await supabase.from('user_workspace_roles').delete()
      .eq('workspace_id', wsId).eq('user_id', memberId)
    setWsMembers(prev => ({ ...prev, [wsId]: (prev[wsId] || []).filter(m => m.user_id !== memberId) }))
    setWorkspaces(prev => prev.map(w => w.id === wsId ? { ...w, member_count: w.member_count - 1 } : w))
  }

  async function handleRoleChange(wsId: string, memberId: string, role: string) {
    await supabase.from('user_workspace_roles').update({ role })
      .eq('workspace_id', wsId).eq('user_id', memberId)
    setWsMembers(prev => ({ ...prev, [wsId]: (prev[wsId] || []).map(m => m.user_id === memberId ? { ...m, role } : m) }))
  }

  async function handleRevokeInvite(wsId: string, invId: string) {
    await supabase.from('workspace_invitations').update({ status: 'revoked' }).eq('id', invId)
    setWsInvites(prev => ({ ...prev, [wsId]: (prev[wsId] || []).filter(i => i.id !== invId) }))
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail || !inviteWsId) return
    setInviting(true); setInviteMsg('')
    const { error: err } = await supabase.from('workspace_invitations').insert({
      workspace_id: inviteWsId,
      invited_email: inviteEmail.trim().toLowerCase(),
      invited_by: currentUserId,
      role: inviteRole
    })
    if (err) {
      setInviteMsg('Error: ' + (err.message.includes('unique') ? 'Already has a pending invite.' : err.message))
    } else {
      setInviteMsg(`✓ Invite sent to ${inviteEmail}`)
      setInviteEmail('')
      await loadWsDetails(inviteWsId)
    }
    setInviting(false)
  }

  async function handleToggleSuperadmin(userId: string, current: boolean) {
    if (userId === currentUserId && current) {
      if (!confirm('Remove your own superadmin access? You will lose access to this page.')) return
    }
    await supabase.from('user_profiles').update({ is_superadmin: !current }).eq('id', userId)
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, is_superadmin: !current } : u))
  }

  // ─── Access denied ───────────────────────────────────────────────
  if (isSuperadmin === false) {
    return (
      <div>
        <div className="page-header fade-up fade-up-1">
          <h1 className="page-title">Admin Panel</h1>
        </div>
        <div style={{ padding: '48px 32px', textAlign: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 400 }}>
          <Shield size={36} style={{ color: 'var(--red)', display: 'block', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>Superadmin access required</h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)' }}>
            Ask an existing superadmin to grant you access, or run:<br />
            <code style={{ fontSize: 12, background: 'var(--surface-3)', padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginTop: 8 }}>
              UPDATE user_profiles SET is_superadmin = true WHERE id = 'your-uuid';
            </code>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header page-header-row fade-up fade-up-1">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Crown size={20} style={{ color: 'var(--amber)' }} /> Admin Panel
          </h1>
          <p className="page-subtitle">Superadmin view — manage all workspaces and users.</p>
        </div>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>
          <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, background: 'var(--red-alpha)', border: '1px solid var(--red)', borderRadius: 8, color: 'var(--red)', fontSize: 13, display: 'flex', gap: 8, marginBottom: 16 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: 20 }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ─── Stats ───────────────────────────────────────────── */}
          <div className="fade-up fade-up-2" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Workspaces', value: workspaces.length, color: 'var(--accent)' },
              { label: 'Total Members', value: workspaces.reduce((s, w) => s + w.member_count, 0), color: '#3b82f6' },
              { label: 'All Users', value: allUsers.length, color: '#10b981' },
              { label: 'Superadmins', value: allUsers.filter(u => u.is_superadmin).length, color: 'var(--amber)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 18px', minWidth: 110 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ─── Quick Invite ─────────────────────────────────────── */}
          <div className="panel fade-up fade-up-3">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <UserPlus size={14} style={{ color: 'var(--text-secondary)' }} /> Add User to Workspace
              </span>
            </div>
            <div style={{ padding: '16px 24px' }}>
              {inviteMsg && (
                <div style={{ padding: '9px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12, color: inviteMsg.startsWith('Error') ? 'var(--red)' : '#10b981', background: inviteMsg.startsWith('Error') ? 'var(--red-alpha)' : 'rgba(16,185,129,0.08)', border: `1px solid ${inviteMsg.startsWith('Error') ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}` }}>
                  {inviteMsg}
                </div>
              )}
              <form onSubmit={handleSendInvite} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ margin: 0, flex: '2 1 200px' }}>
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@company.com" required />
                </div>
                <div className="form-group" style={{ margin: 0, flex: '1 1 160px' }}>
                  <label className="form-label">Workspace</label>
                  <select className="form-input" value={inviteWsId} onChange={e => setInviteWsId(e.target.value)} required>
                    <option value="">Select workspace…</option>
                    {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0, flex: '0 0 120px' }}>
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
            </div>
          </div>

          {/* ─── All Workspaces ───────────────────────────────────── */}
          <div className="panel fade-up fade-up-4">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Building2 size={14} style={{ color: 'var(--text-secondary)' }} /> Workspaces ({workspaces.length})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {workspaces.map((ws, idx) => (
                <div key={ws.id} style={{ borderBottom: idx < workspaces.length - 1 || expandedWs === ws.id ? '1px solid var(--border)' : 'none' }}>
                  {/* Workspace row */}
                  <button onClick={() => toggleExpand(ws.id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px',
                    background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.15s'
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {ws.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{ws.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>
                        {ws.slug} · {ws.member_count} member{ws.member_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: ws.api_usage_usd > ws.api_limit_usd * 0.9 ? 'var(--red)' : 'var(--text-tertiary)' }}>
                      ${(ws.api_usage_usd || 0).toFixed(2)} / ${ws.api_limit_usd}
                    </div>
                    <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', transform: expandedWs === ws.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                  </button>

                  {/* Expanded details */}
                  {expandedWs === ws.id && (
                    <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-3)' }}>
                      <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Members</div>
                        {(wsMembers[ws.id] || []).length === 0 ? (
                          <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>No members.</div>
                        ) : (
                          (wsMembers[ws.id] || []).map(m => (
                            <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                {(m.full_name || m.email || '?').charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{m.full_name || 'Unnamed'}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{m.email || m.user_id.slice(0, 8) + '…'}</div>
                              </div>
                              <div style={{ position: 'relative' }}>
                                <select value={m.role} onChange={e => handleRoleChange(ws.id, m.user_id, e.target.value)}
                                  style={{ appearance: 'none', background: roleColors[m.role]?.bg, border: `1px solid ${roleColors[m.role]?.text}40`, borderRadius: 20, padding: '3px 22px 3px 8px', fontSize: 11, color: roleColors[m.role]?.text, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none' }}>
                                  <option value="admin">Admin</option>
                                  <option value="editor">Editor</option>
                                  <option value="viewer">Viewer</option>
                                </select>
                                <ChevronDown size={9} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: roleColors[m.role]?.text }} />
                              </div>
                              <button onClick={() => handleRemoveMember(ws.id, m.user_id)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4, borderRadius: 4 }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))
                        )}

                        {/* Pending invites for this workspace */}
                        {(wsInvites[ws.id] || []).length > 0 && (
                          <>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 6 }}>Pending Invitations</div>
                            {wsInvites[ws.id].map(inv => (
                              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(245,158,11,0.06)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)' }}>
                                <Mail size={12} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                                <div style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{inv.invited_email}</div>
                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: roleColors[inv.role]?.bg, color: roleColors[inv.role]?.text, fontWeight: 600 }}>{inv.role}</span>
                                <button onClick={() => handleRevokeInvite(ws.id, inv.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-tertiary)', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-body)' }}
                                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                                  Revoke
                                </button>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ─── All Users ────────────────────────────────────────── */}
          <div className="panel fade-up fade-up-5">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Users size={14} style={{ color: 'var(--text-secondary)' }} /> All Users ({allUsers.length})
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['User', 'Email', 'Superadmin'].map(h => (
                      <th key={h} style={{ padding: '9px 20px', fontSize: 10.5, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'left', background: 'var(--surface-3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((u, idx) => (
                    <tr key={u.id} style={{ borderBottom: idx < allUsers.length - 1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '11px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: u.is_superadmin ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, var(--accent), var(--accent-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                            {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                            {u.full_name || 'Unnamed'}
                            {u.id === currentUserId && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)', background: 'rgba(124,109,250,0.1)', padding: '1px 6px', borderRadius: 10 }}>You</span>}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {u.email || <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 20px' }}>
                        <button onClick={() => handleToggleSuperadmin(u.id, u.is_superadmin)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-body)', border: u.is_superadmin ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border)', background: u.is_superadmin ? 'rgba(245,158,11,0.1)' : 'var(--surface-3)', color: u.is_superadmin ? 'var(--amber)' : 'var(--text-tertiary)' }}>
                          <Crown size={11} /> {u.is_superadmin ? 'Superadmin' : 'Make Superadmin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

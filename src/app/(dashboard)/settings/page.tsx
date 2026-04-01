'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Building2, DollarSign, Save, CheckCircle2, AlertCircle } from 'lucide-react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [profile, setProfile] = useState({ full_name: '', email: '' })
  const [workspace, setWorkspace] = useState({ name: '', slug: '', description: '', api_limit_usd: '20' })
  const [workspaceId, setWorkspaceId] = useState('')
  const [userId, setUserId] = useState('')
  const [apiUsage, setApiUsage] = useState(0)

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    setProfile(p => ({ ...p, email: user.email ?? '' }))

    const { data: roles } = await supabase.from('user_workspace_roles').select('workspace_id').eq('user_id', user.id).limit(1)
    const wsId = roles?.[0]?.workspace_id
    if (!wsId) { setLoading(false); return }
    setWorkspaceId(wsId)

    const [profileRes, wsRes] = await Promise.all([
      supabase.from('user_profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('workspaces').select('name, slug, description, api_usage_usd, api_limit_usd').eq('id', wsId).single()
    ])

    if (profileRes.data) setProfile(p => ({ ...p, full_name: profileRes.data.full_name ?? '' }))
    if (wsRes.data) {
      setWorkspace({
        name: wsRes.data.name ?? '',
        slug: wsRes.data.slug ?? '',
        description: wsRes.data.description ?? '',
        api_limit_usd: String(wsRes.data.api_limit_usd ?? 20)
      })
      setApiUsage(wsRes.data.api_usage_usd ?? 0)
    }
    setLoading(false)
  }

  const showSaved = (key: string) => {
    setSaved(key)
    setTimeout(() => setSaved(null), 2500)
  }

  async function saveProfile() {
    setSaving('profile')
    setError('')
    const { error: profileErr } = await supabase.from('user_profiles').upsert({
      id: userId,
      full_name: profile.full_name
    })
    if (profileErr) { setError(profileErr.message); setSaving(null); return }
    setSaving(null)
    showSaved('profile')
  }

  async function saveWorkspace() {
    setSaving('workspace')
    setError('')
    const { error: wsErr } = await supabase.from('workspaces').update({
      name: workspace.name,
      description: workspace.description,
      api_limit_usd: parseFloat(workspace.api_limit_usd) || 20
    }).eq('id', workspaceId)
    if (wsErr) { setError(wsErr.message); setSaving(null); return }
    setSaving(null)
    showSaved('workspace')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const usagePct = parseFloat(workspace.api_limit_usd) > 0
    ? Math.min((apiUsage / parseFloat(workspace.api_limit_usd)) * 100, 100)
    : 0

  return (
    <div>
      <div className="page-header page-header-row fade-up fade-up-1">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your profile, workspace, and API configuration.</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, background: 'var(--red-alpha)', border: '1px solid var(--red)', borderRadius: 8, color: 'var(--red)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }} className="fade-up">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Profile */}
        <div className="panel fade-up fade-up-2">
          <div className="panel-header">
            <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <User size={14} style={{ color: 'var(--text-secondary)' }} /> Profile
            </span>
          </div>
          <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 20, fontFamily: 'var(--font-display)' }}>
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
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Email is managed by Supabase Auth and cannot be changed here.</div>
            </div>
            <button className="btn btn-primary" onClick={saveProfile} disabled={saving === 'profile' || loading} style={{ alignSelf: 'flex-start' }}>
              {saved === 'profile' ? <><CheckCircle2 size={13} /> Saved!</> : saving === 'profile' ? 'Saving...' : <><Save size={13} /> Save Profile</>}
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="panel fade-up fade-up-3">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Building2 size={14} style={{ color: 'var(--text-secondary)' }} /> Workspace
              </span>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Workspace Name</label>
                <input className="form-input" value={workspace.name} onChange={e => setWorkspace(w => ({ ...w, name: e.target.value }))} placeholder="e.g. Floothink Agency" disabled={loading} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Slug</label>
                <input className="form-input" value={workspace.slug} disabled style={{ opacity: 0.6, cursor: 'not-allowed', fontFamily: 'var(--font-mono)', fontSize: 12 }} />
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Workspace slug is set on creation and cannot be changed.</div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={workspace.description} onChange={e => setWorkspace(w => ({ ...w, description: e.target.value }))} placeholder="Brief description of this workspace..." disabled={loading} />
              </div>
              <button className="btn btn-primary" onClick={saveWorkspace} disabled={saving === 'workspace' || loading} style={{ alignSelf: 'flex-start' }}>
                {saved === 'workspace' ? <><CheckCircle2 size={13} /> Saved!</> : saving === 'workspace' ? 'Saving...' : <><Save size={13} /> Save Workspace</>}
              </button>
            </div>
          </div>

          {/* API Usage */}
          <div className="panel fade-up fade-up-4">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <DollarSign size={14} style={{ color: 'var(--text-secondary)' }} /> API Usage & Limits
              </span>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>This month's usage</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    ${apiUsage.toFixed(4)} / ${workspace.api_limit_usd}
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${usagePct}%`, borderRadius: 4, transition: 'width 0.5s ease',
                    background: usagePct > 90 ? 'var(--red)' : usagePct > 70 ? 'var(--amber)' : 'var(--green)'
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>{usagePct.toFixed(1)}% of monthly limit used</div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Monthly API Limit (USD)</label>
                <input className="form-input" type="number" min="1" step="1" value={workspace.api_limit_usd} onChange={e => setWorkspace(w => ({ ...w, api_limit_usd: e.target.value }))} disabled={loading} />
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Set a spending cap for the Anthropic API. The sidebar shows real-time usage against this limit.</div>
              </div>
              <button className="btn btn-primary" onClick={saveWorkspace} disabled={saving === 'workspace' || loading} style={{ alignSelf: 'flex-start' }}>
                {saved === 'workspace' ? <><CheckCircle2 size={13} /> Saved!</> : saving === 'workspace' ? 'Saving...' : <><Save size={13} /> Save Limit</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="panel fade-up fade-up-5" style={{ marginTop: 20, border: '1px solid rgba(248,113,113,0.25)' }}>
        <div className="panel-header" style={{ borderBottom: '1px solid rgba(248,113,113,0.15)' }}>
          <span className="panel-title" style={{ color: 'var(--red)' }}>Danger Zone</span>
        </div>
        <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>Sign out of FCE</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>You will be redirected to the login page.</div>
          </div>
          <button onClick={handleLogout} style={{
            padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)',
            transition: 'all 0.15s', fontFamily: 'var(--font-body)'
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red)'; (e.currentTarget as HTMLButtonElement).style.color = 'white' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

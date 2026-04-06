'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import {
  LayoutDashboard, Brain, Package, Zap, Megaphone,
  Library, Lightbulb, Settings, ChevronDown, LogOut, Layers, BookOpen, Crown,
  Plus, Check, Building2, X, Loader2
} from 'lucide-react'

export default function Sidebar() {
  const { activeWorkspace, workspaces, workspaceId, switchWorkspace, createWorkspace } = useWorkspace()

  const [usage, setUsage] = useState({ used: 0, limit: 20 })
  const [userName, setUserName] = useState('Workspace User')
  const [initials, setInitials] = useState('U')
  const [counts, setCounts] = useState({ brands: 0, products: 0, library: 0, topics: 0 })
  const [isSuperadmin, setIsSuperadmin] = useState(false)

  // Workspace dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Create workspace modal
  const [createOpen, setCreateOpen] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Load usage + counts whenever active workspace changes
  useEffect(() => {
    if (!workspaceId) return
    let sub: any = null

    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load user profile
      const { data: profile } = await supabase.from('user_profiles').select('full_name, is_superadmin').eq('id', user.id).single()
      if (profile?.full_name) {
        setUserName(profile.full_name)
        setInitials(profile.full_name.substring(0, 1).toUpperCase())
      } else if (user.email) {
        setUserName(user.email)
        setInitials(user.email.substring(0, 1).toUpperCase())
      }
      if (profile?.is_superadmin) setIsSuperadmin(true)

      const [wsRes, brandsRes, productsRes, libraryRes, topicsRes] = await Promise.all([
        supabase.from('workspaces').select('api_usage_usd, api_limit_usd').eq('id', workspaceId).single(),
        supabase.from('brands').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
        supabase.from('generation_outputs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
        supabase.from('content_topics').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
      ])

      if (wsRes.data) {
        setUsage({ used: wsRes.data.api_usage_usd || 0, limit: wsRes.data.api_limit_usd || 20 })
      }

      setCounts({
        brands: brandsRes.count ?? 0,
        products: productsRes.count ?? 0,
        library: libraryRes.count ?? 0,
        topics: topicsRes.count ?? 0,
      })

      sub = supabase.channel(`ws-usage-${workspaceId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'workspaces', filter: `id=eq.${workspaceId}` }, (payload) => {
          const newU = payload.new.api_usage_usd
          const newL = payload.new.api_limit_usd
          if (newU !== undefined && newL !== undefined) {
            setUsage({ used: newU, limit: newL })
          }
        })
        .subscribe()
    }

    loadData()

    return () => {
      if (sub) supabase.removeChannel(sub)
    }
  }, [workspaceId])

  const usagePct = usage.limit > 0 ? Math.min((usage.used / usage.limit) * 100, 100) : 0
  const isDanger = usagePct > 90
  const fillClass = isDanger ? 'red' : usagePct > 70 ? 'amber' : 'green'

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault()
    if (!newWsName.trim()) return
    setCreating(true)
    setCreateError('')
    const id = await createWorkspace(newWsName.trim())
    if (!id) {
      setCreateError('Failed to create workspace. Please try again.')
      setCreating(false)
    } else {
      setNewWsName('')
      setCreateOpen(false)
      setDropdownOpen(false)
      setCreating(false)
    }
  }

  function getWorkspaceAvatar(ws: typeof activeWorkspace) {
    if (!ws) return { letter: 'W', color: '#7c6dfa' }
    const color = ws.avatar_color || '#7c6dfa'
    const letter = ws.avatar_emoji || ws.name.charAt(0).toUpperCase()
    return { letter, color }
  }

  const avatar = getWorkspaceAvatar(activeWorkspace)

  type NavItem =
    | { divider: true; label: string }
    | { icon: React.ElementType; label: string; href: string; badge?: number; active?: boolean }

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { divider: true, label: 'Core' },
    { icon: Brain, label: 'Brand Brain', href: '/brands', badge: counts.brands },
    { icon: Package, label: 'Product Brain', href: '/products', badge: counts.products },
    { divider: true, label: 'Generate' },
    { icon: Layers, label: 'Topic Generator', href: '/topics' },
    { icon: Zap, label: 'Content Generator', href: '/generate' },
    { icon: Megaphone, label: 'Campaign Generator', href: '/campaigns' },
    { divider: true, label: 'Manage' },
    { icon: BookOpen, label: 'Topic Library', href: '/topic-library', badge: counts.topics },
    { icon: Library, label: 'Content Library', href: '/library', badge: counts.library },
    ...(isSuperadmin ? [
      { divider: true, label: 'Admin' } as const,
      { icon: Crown, label: 'Admin Panel', href: '/admin' } as const,
    ] : []),
    { icon: Lightbulb, label: 'Learning Center', href: '/learning' },
  ]

  return (
    <>
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-mark">F</div>
          <div>
            <div className="logo-text">Floothink</div>
            <div className="logo-sub">Content Engine</div>
          </div>
        </div>

        {/* Workspace Switcher */}
        <div ref={dropdownRef} style={{ position: 'relative', padding: '0 10px 8px' }}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            className="workspace-pill"
            style={{
              width: '100%', cursor: 'pointer', background: dropdownOpen ? 'var(--surface-3)' : undefined,
              border: dropdownOpen ? '1px solid var(--border)' : undefined, userSelect: 'none'
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: 5, flexShrink: 0,
              background: avatar.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: 'white'
            }}>
              {avatar.letter}
            </div>
            <span className="workspace-name" style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeWorkspace?.name || 'Select Workspace'}
            </span>
            <ChevronDown size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0, transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 10, right: 10, zIndex: 200,
              background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden'
            }}>
              {/* Workspace list */}
              <div style={{ padding: '6px 0' }}>
                {workspaces.map(ws => {
                  const wsAvatar = getWorkspaceAvatar(ws)
                  const isActive = ws.id === workspaceId
                  return (
                    <button key={ws.id} onClick={() => { switchWorkspace(ws.id); setDropdownOpen(false) }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer',
                        transition: 'background 0.1s', textAlign: 'left'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        background: wsAvatar.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: 'white'
                      }}>
                        {wsAvatar.letter}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ws.name}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 1 }}>
                          {ws.role.charAt(0).toUpperCase() + ws.role.slice(1)}
                        </div>
                      </div>
                      {isActive && <Check size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>

              {/* Divider + actions */}
              <div style={{ height: 1, background: 'var(--border)' }} />
              <div style={{ padding: '6px 0' }}>
                <a href="/workspace-settings"
                  onClick={() => setDropdownOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none', transition: 'background 0.1s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Settings size={13} style={{ color: 'var(--text-tertiary)' }} />
                  Workspace Settings
                </a>
                <button onClick={() => { setCreateOpen(true); setDropdownOpen(false) }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
                    fontSize: 13, transition: 'background 0.1s', textAlign: 'left'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Plus size={13} style={{ color: 'var(--text-tertiary)' }} />
                  New Workspace
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map((item, i) => {
            if ('divider' in item) {
              return <div key={i} className="nav-section-label">{item.label}</div>
            }
            const navItem = item as { icon: React.ElementType; label: string; href: string; badge?: number; active?: boolean }
            const Icon = navItem.icon
            return (
              <a key={i} href={navItem.href} className={`nav-item${navItem.active ? ' active' : ''}`}>
                <Icon />
                <span>{navItem.label}</span>
                {navItem.badge != null && navItem.badge > 0 && (
                  <span className="badge">{navItem.badge}</span>
                )}
              </a>
            )
          })}
        </nav>

        {/* Claude API Usage */}
        <div style={{ padding: '0 16px 12px 16px' }}>
          <div style={{
            background: 'var(--surface-3)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>Claude API</span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                ${usage.used.toFixed(2)} / ${usage.limit.toFixed(2)}
              </span>
            </div>
            <div className="usage-bar-track">
              <div className={`usage-bar-fill ${fillClass}`} style={{ width: `${usagePct}%` }} />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textAlign: 'right' }}>
              {usagePct.toFixed(1)}% of monthly limit
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <a href="/settings" className="nav-item">
            <Settings />
            <span>Settings</span>
          </a>
          <div style={{ height: '1px', background: 'var(--border)', margin: '8px 10px' }} />
          <div className="nav-item" style={{ cursor: 'pointer' }} onClick={handleLogout}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: 'linear-gradient(135deg,#7c6dfa,#a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: 'white',
              fontFamily: 'var(--font-display)', flexShrink: 0
            }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Admin</div>
            </div>
            <LogOut size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          </div>
        </div>
      </aside>

      {/* Create Workspace Modal */}
      {createOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
        }} onClick={e => { if (e.target === e.currentTarget) setCreateOpen(false) }}>
          <div style={{
            background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 16,
            padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>New Workspace</h3>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>Create a separate space for a new brand or client.</p>
              </div>
              <button onClick={() => setCreateOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Workspace Name</label>
                <input
                  className="form-input"
                  value={newWsName}
                  onChange={e => setNewWsName(e.target.value)}
                  placeholder="e.g. Acme Agency, Client X..."
                  autoFocus
                  required
                />
              </div>

              {createError && (
                <div style={{ padding: '9px 12px', background: 'var(--red-alpha)', border: '1px solid var(--red)', borderRadius: 8, color: 'var(--red)', fontSize: 13 }}>
                  {createError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setCreateOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating || !newWsName.trim()}>
                  {creating ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : <><Building2 size={13} /> Create Workspace</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

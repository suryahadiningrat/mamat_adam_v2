'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import {
  LayoutDashboard, Brain, Package, Zap, Megaphone,
  Library, Lightbulb, Settings, ChevronDown, LogOut, Layers, BookOpen, Crown,
  Plus, Check, Building2, X, Loader2, CalendarDays
} from 'lucide-react'

export default function Sidebar() {
  const { data: session } = useSession()
  const { activeWorkspace, workspaces, workspaceId, switchWorkspace, createWorkspace } = useWorkspace()

  const [usage, setUsage] = useState({ used: 0, limit: 20 })
  const [userName, setUserName] = useState('Workspace User')
  const [initials, setInitials] = useState('U')
  const [counts, setCounts] = useState({ brands: 0, products: 0, library: 0, topics: 0 })
  const [isSuperadmin, setIsSuperadmin] = useState(false)

  // Workspace dropdown — use fixed positioning to escape sidebar overflow clip
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const pillRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Create workspace modal
  const [createOpen, setCreateOpen] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        pillRef.current && !pillRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleToggleDropdown() {
    if (!dropdownOpen && pillRef.current) {
      const rect = pillRef.current.getBoundingClientRect()
      setDropdownRect({ top: rect.bottom + 6, left: rect.left, width: rect.width })
    }
    setDropdownOpen(o => !o)
  }

  // Load usage + counts whenever active workspace changes
  useEffect(() => {
    if (!workspaceId) return

    async function loadData() {
      if (!session?.user) return

      setUserName(session.user.name || session.user.email || 'User')
      setInitials((session.user.name || session.user.email || 'U').substring(0, 1).toUpperCase())

      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/stats`)
        if (res.ok) {
          const data = await res.json()
          setIsSuperadmin(data.isSuperadmin || false)
          setUsage({ used: data.usage.used || 0, limit: data.usage.limit || 20 })
          setCounts({
            brands: data.counts.brands || 0,
            products: data.counts.products || 0,
            library: data.counts.library || 0,
            topics: data.counts.topics || 0,
          })
        }
      } catch (err) {
        console.error('Failed to load workspace stats:', err)
      }
    }

    loadData()
  }, [workspaceId, session])

  const usagePct = usage.limit > 0 ? Math.min((usage.used / usage.limit) * 100, 100) : 0
  const isDanger = usagePct > 90
  const fillClass = isDanger ? 'red' : usagePct > 70 ? 'amber' : 'green'

  const handleLogout = async () => { await signOut({ callbackUrl: '/login' }) }

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault()
    if (!newWsName.trim()) return
    setCreating(true); setCreateError('')
    const id = await createWorkspace(newWsName.trim())
    if (!id) {
      setCreateError('Failed to create workspace. Please try again.')
      setCreating(false)
    } else {
      setNewWsName(''); setCreateOpen(false); setDropdownOpen(false); setCreating(false)
    }
  }

  function getWorkspaceAvatar(ws: typeof activeWorkspace) {
    if (!ws) return { letter: 'W', color: 'var(--accent)' }
    const color = ws.avatar_color || 'var(--accent)'
    const letter = ws.avatar_emoji || ws.name.charAt(0).toUpperCase()
    return { letter, color }
  }

  const avatar = getWorkspaceAvatar(activeWorkspace)

  type NavItem =
    | { divider: true; label: string }
    | { icon: React.ElementType; label: string; href: string; badge?: number }

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { divider: true, label: 'Core' },
    { icon: Brain, label: 'Brand Brain', href: '/brands', badge: counts.brands },
    { icon: Package, label: 'Product Brain', href: '/products', badge: counts.products },
    { divider: true, label: 'Plan & Generate' },
    { icon: CalendarDays, label: 'Content Calendar', href: '/calendar' },
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

        {/* ── Logo ───────────────────────────────────────── */}
        <div className="sidebar-logo">
          <img
            src="/floothink-logo.png"
            alt="Floothink"
            style={{ height: 22, width: 'auto', maxWidth: 140, objectFit: 'contain' }}
          />
        </div>

        {/* ── Workspace Switcher Pill ─────────────────────── */}
        <div style={{ padding: '8px 12px 4px' }}>
          <button
            ref={pillRef}
            onClick={handleToggleDropdown}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
              background: dropdownOpen ? 'var(--accent-subtle)' : 'var(--surface-3)',
              border: `1px solid ${dropdownOpen ? 'var(--border-accent)' : 'var(--border)'}`,
              transition: 'all 0.15s', userSelect: 'none'
            }}
            onMouseEnter={e => { if (!dropdownOpen) { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-4)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)' } }}
            onMouseLeave={e => { if (!dropdownOpen) { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-3)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' } }}
          >
            {/* Workspace avatar */}
            <div style={{
              width: 20, height: 20, borderRadius: 5, flexShrink: 0,
              background: avatar.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: 'white', letterSpacing: '-0.3px'
            }}>
              {avatar.letter}
            </div>
            <span style={{
              flex: 1, textAlign: 'left', fontSize: 12.5, fontWeight: 500,
              color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {activeWorkspace?.name || 'Select Workspace'}
            </span>
            <ChevronDown size={12} style={{
              color: 'var(--text-tertiary)', flexShrink: 0,
              transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s'
            }} />
          </button>
        </div>

        {/* ── Nav ────────────────────────────────────────── */}
        <nav className="sidebar-nav">
          {navItems.map((item, i) => {
            if ('divider' in item) return <div key={i} className="nav-section-label">{item.label}</div>
            const Icon = item.icon
            return (
              <a key={i} href={item.href} className="nav-item">
                <Icon />
                <span>{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="badge">{item.badge}</span>
                )}
              </a>
            )
          })}
        </nav>

        {/* ── Claude API Usage ────────────────────────────── */}
        <div style={{ padding: '0 12px 10px' }}>
          <div style={{
            background: 'var(--surface-3)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Claude API</span>
              <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                ${usage.used.toFixed(2)} / ${usage.limit.toFixed(0)}
              </span>
            </div>
            <div className="usage-bar-track">
              <div className={`usage-bar-fill ${fillClass}`} style={{ width: `${usagePct}%` }} />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textAlign: 'right' }}>
              {usagePct.toFixed(1)}% used
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────── */}
        <div className="sidebar-footer">
          <a href="/settings" className="nav-item">
            <Settings />
            <span>Settings</span>
          </a>
          <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
          <div className="nav-item" style={{ cursor: 'pointer' }} onClick={handleLogout}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0
            }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>Sign out</div>
            </div>
            <LogOut size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          </div>
        </div>
      </aside>

      {/* ── Workspace Dropdown — fixed position, escapes sidebar overflow ── */}
      {dropdownOpen && dropdownRect && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownRect.top,
            left: dropdownRect.left,
            width: dropdownRect.width,
            zIndex: 9000,
            background: 'var(--surface-1)',
            border: '1px solid var(--border-hover)',
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Workspace list */}
          <div style={{ padding: '4px 0' }}>
            {workspaces.map(ws => {
              const wsAvatar = getWorkspaceAvatar(ws)
              const isActive = ws.id === workspaceId
              return (
                <button key={ws.id}
                  onClick={() => { switchWorkspace(ws.id); setDropdownOpen(false) }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                    padding: '8px 12px', background: isActive ? 'var(--accent-subtle)' : 'transparent',
                    border: 'none', cursor: 'pointer', transition: 'background 0.1s', textAlign: 'left'
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-3)' }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                    background: wsAvatar.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: 'white'
                  }}>
                    {wsAvatar.letter}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

          {/* Actions */}
          <div style={{ height: 1, background: 'var(--border)' }} />
          <div style={{ padding: '4px 0' }}>
            <a
              href="/workspace-settings"
              onClick={() => setDropdownOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px',
                color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none', transition: 'background 0.1s'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Settings size={13} style={{ color: 'var(--text-tertiary)' }} />
              Workspace Settings
            </a>
            <button
              onClick={() => { setCreateOpen(true); setDropdownOpen(false) }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
                fontSize: 13, transition: 'background 0.1s', textAlign: 'left'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Plus size={13} style={{ color: 'var(--text-tertiary)' }} />
              New Workspace
            </button>
          </div>
        </div>
      )}

      {/* ── Create Workspace Modal ───────────────────────── */}
      {createOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9100, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
        }} onClick={e => { if (e.target === e.currentTarget) setCreateOpen(false) }}>
          <div style={{
            background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 16,
            padding: 28, width: '100%', maxWidth: 400, boxShadow: '0 24px 60px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>New Workspace</h3>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>A separate space for a new brand or client.</p>
              </div>
              <button onClick={() => setCreateOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Workspace Name</label>
                <input className="form-input" value={newWsName} onChange={e => setNewWsName(e.target.value)}
                  placeholder="e.g. Acme Agency, Client X…" autoFocus required />
              </div>
              {createError && (
                <div style={{ padding: '9px 12px', background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 8, color: 'var(--red)', fontSize: 13 }}>
                  {createError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setCreateOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating || !newWsName.trim()}>
                  {creating ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : <><Building2 size={13} /> Create</>}
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

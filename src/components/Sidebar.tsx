'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard, Brain, Package, Zap, Megaphone,
  Library, Lightbulb, Settings, ChevronDown, User, LogOut
} from 'lucide-react'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/', active: true },
  { divider: true, label: 'Core' },
  { icon: Brain, label: 'Brand Brain', href: '/brands', badge: '4' },
  { icon: Package, label: 'Product Brain', href: '/products', badge: '12' },
  { divider: true, label: 'Generate' },
  { icon: Zap, label: 'Content Generator', href: '/generate' },
  { icon: Megaphone, label: 'Campaign Generator', href: '/campaigns' },
  { divider: true, label: 'Manage' },
  { icon: Library, label: 'Content Library', href: '/library', badge: '38' },
  { icon: Lightbulb, label: 'Learning Center', href: '/learning' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [usage, setUsage] = useState({ used: 0, limit: 20 })
  const [userName, setUserName] = useState('Workspace User')
  const [initials, setInitials] = useState('U')

  useEffect(() => {
    let sub: any = null

    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load user profile
      const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
      if (profile && profile.full_name) {
        setUserName(profile.full_name)
        setInitials(profile.full_name.substring(0, 1).toUpperCase())
      } else if (user.email) {
        setUserName(user.email)
        setInitials(user.email.substring(0, 1).toUpperCase())
      }

      // Load workspace roles
      const { data: roles } = await supabase.from('user_workspace_roles').select('workspace_id').eq('user_id', user.id).limit(1)
      if (roles?.[0]) {
        const wsId = roles[0].workspace_id
        
        // Fetch current usage
        const { data: ws } = await supabase.from('workspaces').select('api_usage_usd, api_limit_usd').eq('id', wsId).single()
        if (ws) {
          setUsage({ used: ws.api_usage_usd || 0, limit: ws.api_limit_usd || 20 })
        }

        // Subscribe to workspace updates
        sub = supabase.channel('ws-usage-updates')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'workspaces', filter: `id=eq.${wsId}` }, (payload) => {
            const newU = payload.new.api_usage_usd
            const newL = payload.new.api_limit_usd
            if (newU !== undefined && newL !== undefined) {
              setUsage({ used: newU, limit: newL })
            }
          })
          .subscribe()
      }
    }
    loadData()

    return () => {
      if (sub) supabase.removeChannel(sub)
    }
  }, [])

  const usagePct = usage.limit > 0 ? Math.min((usage.used / usage.limit) * 100, 100) : 0
  const isDanger = usagePct > 90
  const fillClass = isDanger ? 'red' : usagePct > 70 ? 'amber' : 'green'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    // Session state change listener in layout will redirect
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-mark">F</div>
        <div>
          <div className="logo-text">Floothink</div>
          <div className="logo-sub">Content Engine</div>
        </div>
      </div>

      {/* Workspace */}
      <div className="workspace-pill">
        <div className="workspace-dot" />
        <span className="workspace-name">Floothink Agency</span>
        <ChevronDown size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map((item, i) => {
          if ('divider' in item && item.divider) {
            return (
              <div key={i} className="nav-section-label">{item.label}</div>
            )
          }
          const Icon = item.icon!
          return (
            <a
              key={i}
              href={item.href}
              className={`nav-item${item.active ? ' active' : ''}`}
            >
              <Icon />
              <span>{item.label}</span>
              {item.badge && <span className="badge">{item.badge}</span>}
            </a>
          )
        })}
      </nav>

      {/* Claude API Usage */}
      <div style={{ padding: '0 16px 12px 16px' }}>
        <div style={{
          background: 'var(--surface-3)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
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
  )
}

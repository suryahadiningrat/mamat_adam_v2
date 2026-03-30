'use client'
import { useState } from 'react'
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

      {/* Footer */}
      <div className="sidebar-footer">
        <a href="/settings" className="nav-item">
          <Settings />
          <span>Settings</span>
        </a>
        <div className="divider" />
        <div className="nav-item" style={{ cursor: 'pointer' }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: 'linear-gradient(135deg,#7c6dfa,#a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: 'white',
            fontFamily: 'var(--font-display)', flexShrink: 0
          }}>B</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2 }}>Budi Santoso</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Admin</div>
          </div>
          <LogOut size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        </div>
      </div>
    </aside>
  )
}

'use client'
import { Search, Bell, Plus, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'

export default function Topbar() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch — only render theme toggle after mount
  useEffect(() => setMounted(true), [])

  const isDark = theme === 'dark'

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <header className="topbar">
      {/* Search */}
      <div className="topbar-search">
        <Search className="search-icon" />
        <input placeholder="Search brands, content, campaigns…" />
      </div>

      <div className="topbar-actions">
        {/* New content button */}
        <a href="/generate" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12.5 }}>
          <Plus size={13} />
          New Content
        </a>

        {/* Theme toggle */}
        {mounted && (
          <button
            className="icon-btn"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ position: 'relative' }}
          >
            {isDark
              ? <Sun size={15} style={{ color: 'var(--accent-alt)' }} />
              : <Moon size={15} />
            }
          </button>
        )}

        {/* Notifications */}
        <div className="icon-btn" style={{ position: 'relative' }}>
          <Bell size={15} />
          <span style={{
            position: 'absolute', top: 7, right: 7,
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent-alt)',
            boxShadow: '0 0 6px var(--accent-alt-glow)'
          }} />
        </div>

        {/* Avatar */}
        <div className="avatar" onClick={handleLogout} title="Sign Out">F</div>
      </div>
    </header>
  )
}

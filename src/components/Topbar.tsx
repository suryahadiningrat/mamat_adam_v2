'use client'
import { Search, Bell, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function Topbar() {
  const handleLogout = async () => {
    await supabase.auth.signOut()
    // Optional: add router.push('/login') but session state change will handle it via layout
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
        <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12.5 }}>
          <Plus size={13} />
          New Content
        </button>

        {/* Notifications */}
        <div className="icon-btn" style={{ position: 'relative' }}>
          <Bell size={15} />
          <span style={{
            position: 'absolute', top: 7, right: 7,
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 6px var(--accent)'
          }} />
        </div>

        {/* Avatar */}
        <div className="avatar" onClick={handleLogout} title="Sign Out">BS</div>
      </div>
    </header>
  )
}

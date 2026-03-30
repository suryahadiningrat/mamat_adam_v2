'use client'
import { useState } from 'react'
import { Brain, Plus, Search, Package, Zap, ChevronRight, MoreHorizontal, Clock } from 'lucide-react'

const brands = [
  { id: '1', name: 'Lumière', category: 'Beauty & Skincare', color: '#e1306c', status: 'active', products: 5, generations: 98, lastUpdated: '2h ago', brainVersion: 3, tone: 'Bold, playful, youthful', completeness: 88, summary: 'Premium skincare brand for urban women who believe glow is a state of mind, not just a product.' },
  { id: '2', name: 'Velox', category: 'Sports & Performance', color: '#38bdf8', status: 'active', products: 4, generations: 54, lastUpdated: '1d ago', brainVersion: 2, tone: 'Energetic, direct, motivational', completeness: 72, summary: 'Performance footwear and gear for competitive athletes who refuse to slow down.' },
  { id: '3', name: 'Korridor', category: 'Furniture & Design', color: '#22d3a0', status: 'active', products: 2, generations: 22, lastUpdated: '3d ago', brainVersion: 1, tone: 'Calm, considered, understated', completeness: 55, summary: 'Thoughtfully designed office furniture for professionals who value clarity and craftsmanship.' },
  { id: '4', name: 'Zenova', category: 'Wellness & Lifestyle', color: '#f59e0b', status: 'draft', products: 1, generations: 13, lastUpdated: '1w ago', brainVersion: 1, tone: 'Warm, empathetic, expert', completeness: 34, summary: 'Holistic wellness brand for modern Indonesians seeking balance in a busy world.' },
]

export default function BrandsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = brands.filter(b => {
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase()) || b.category.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div>
      <div className="page-header page-header-row fade-up fade-up-1">
        <div>
          <h1 className="page-title">Brand Brain</h1>
          <p className="page-subtitle">Manage brand memory, identity, and knowledge base.</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={13} /> Create Brand
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }} className="fade-up fade-up-2">
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search brands…"
            style={{
              width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 12px 8px 34px', fontSize: 13.5,
              color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none'
            }}
          />
        </div>
        {['all', 'active', 'draft', 'archived'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
            background: statusFilter === s ? 'var(--accent-subtle)' : 'var(--surface-2)',
            border: statusFilter === s ? '1px solid var(--border-accent)' : '1px solid var(--border)',
            color: statusFilter === s ? 'var(--accent)' : 'var(--text-secondary)',
          }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Brand cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="fade-up fade-up-3">
        {filtered.map(b => (
          <div key={b.id} style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.15s, transform 0.15s',
            cursor: 'pointer', position: 'relative'
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
          >
            {/* Color accent bar */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: b.color }} />

            <div style={{ padding: '18px 20px 18px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                {/* Brand icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: `${b.color}18`, border: `1.5px solid ${b.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: b.color
                }}>
                  {b.name[0]}
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{b.name}</span>
                    <span style={{
                      fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                      background: b.status === 'active' ? 'var(--green-bg)' : 'var(--amber-bg)',
                      color: b.status === 'active' ? 'var(--green)' : 'var(--amber)',
                      border: `1px solid ${b.status === 'active' ? 'rgba(34,211,160,0.2)' : 'rgba(245,158,11,0.2)'}`
                    }}>{b.status}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
                      background: 'var(--surface-3)', color: 'var(--text-tertiary)',
                      border: '1px solid var(--border)'
                    }}>v{b.brainVersion}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginBottom: 6 }}>{b.category}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 560 }}>{b.summary}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontStyle: 'italic' }}>"{b.tone}"</span>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{b.products}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Package size={10} /> Products
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{b.generations}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Zap size={10} /> Outputs
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: b.completeness >= 75 ? 'var(--green)' : b.completeness >= 50 ? 'var(--amber)' : 'var(--red)', letterSpacing: '-0.5px' }}>{b.completeness}%</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Brain size={10} /> Brain
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}>
                    Open Brain <ChevronRight size={12} />
                  </button>
                  <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }}>
                    <Zap size={12} /> Generate
                  </button>
                </div>
              </div>

              {/* Brain completeness bar */}
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>Brain completeness</span>
                <div style={{ flex: 1, height: 3, background: 'var(--surface-4)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, width: `${b.completeness}%`,
                    background: b.completeness >= 75 ? 'var(--green)' : b.completeness >= 50 ? 'var(--amber)' : 'var(--red)',
                    transition: 'width 0.6s ease'
                  }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={10} /> {b.lastUpdated}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

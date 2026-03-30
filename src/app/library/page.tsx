'use client'
import { useState } from 'react'
import { Library, Search, CheckCircle2, Clock, XCircle, Copy, ExternalLink, Filter, ChevronDown } from 'lucide-react'

type Status = 'approved' | 'draft' | 'rejected'
type Platform = 'Instagram' | 'TikTok' | 'YouTube' | 'Twitter/X' | 'LinkedIn'

const platformColors: Record<Platform, string> = {
  Instagram: '#e1306c', TikTok: '#888', YouTube: '#ff0000',
  'Twitter/X': '#1d9bf0', LinkedIn: '#0a66c2',
}

const mockLibrary: {
  id: string; title: string; hook: string; brand: string; product: string;
  platform: Platform; status: Status; framework: string; createdAt: string; author: string
}[] = [
  { id: '1', title: 'Ramadan Glow Hook', hook: 'Kulit kamu udah siap menyambut Ramadan?', brand: 'Lumière', product: 'Hydra Serum', platform: 'Instagram', status: 'approved', framework: 'PAS', createdAt: '2h ago', author: 'BS' },
  { id: '2', title: 'Gen Z Product Launch Thread', hook: 'hot take: skincare routine kamu mungkin terlalu ribet', brand: 'Lumière', product: 'Night Repair', platform: 'Twitter/X', status: 'draft', framework: 'AIDA', createdAt: '4h ago', author: 'RA' },
  { id: '3', title: 'TikTok Pain Point Script', hook: 'POV: udah beli 5 serum tapi kulit masih kering', brand: 'Lumière', product: 'Hydra Serum', platform: 'TikTok', status: 'approved', framework: 'BAB', createdAt: '6h ago', author: 'BS' },
  { id: '4', title: 'Brand Awareness YouTube', hook: 'We don\'t sell skincare. We sell confidence.', brand: 'Lumière', product: 'Night Repair', platform: 'YouTube', status: 'rejected', framework: 'AIDA', createdAt: 'Yesterday', author: 'RA' },
  { id: '5', title: 'Runner Pro Performance Ad', hook: 'Every second matters. Every gram counts.', brand: 'Velox', product: 'Runner Pro', platform: 'Instagram', status: 'approved', framework: 'PAS', createdAt: 'Yesterday', author: 'BS' },
  { id: '6', title: 'Office Chair Work-from-home', hook: 'Your back deserves better than that dining chair.', brand: 'Korridor', product: 'Office Chair X', platform: 'LinkedIn', status: 'approved', framework: 'PAS', createdAt: '2 days ago', author: 'BS' },
  { id: '7', title: 'Flash Sale Urgency Caption', hook: '72 jam lagi. Harga balik normal.', brand: 'Lumière', product: 'Hydra Serum', platform: 'Instagram', status: 'approved', framework: 'BAB', createdAt: '2 days ago', author: 'RA' },
  { id: '8', title: 'Wellness Morning Routine', hook: 'Pagi yang tenang dimulai dari satu keputusan kecil.', brand: 'Zenova', product: 'Calm Blend', platform: 'Instagram', status: 'draft', framework: 'PAS', createdAt: '1 week ago', author: 'BS' },
]

const statusConfig: Record<Status, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  approved: { label: 'Approved', cls: 'status-approved', Icon: CheckCircle2 },
  draft: { label: 'Draft', cls: 'status-draft', Icon: Clock },
  rejected: { label: 'Rejected', cls: 'status-rejected', Icon: XCircle },
}

export default function LibraryPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [platformFilter, setPlatformFilter] = useState<string>('all')

  const filtered = mockLibrary.filter(item => {
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.hook.toLowerCase().includes(search.toLowerCase()) ||
      item.brand.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || item.status === statusFilter
    const matchPlatform = platformFilter === 'all' || item.platform === platformFilter
    return matchSearch && matchStatus && matchPlatform
  })

  const counts = {
    approved: mockLibrary.filter(i => i.status === 'approved').length,
    draft: mockLibrary.filter(i => i.status === 'draft').length,
    rejected: mockLibrary.filter(i => i.status === 'rejected').length,
  }

  return (
    <div>
      <div className="page-header page-header-row fade-up fade-up-1">
        <div>
          <h1 className="page-title">Content Library</h1>
          <p className="page-subtitle">All generated outputs — search, filter, and reuse approved work.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['approved', 'draft', 'rejected'] as Status[]).map(s => {
              const { label, cls, Icon } = statusConfig[s]
              return (
                <div key={s} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                  borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)'
                }}>
                  <Icon size={12} className={cls} style={{ color: s === 'approved' ? 'var(--green)' : s === 'draft' ? 'var(--amber)' : 'var(--red)' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{counts[s]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }} className="fade-up fade-up-2">
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search content, hooks, brands…"
            style={{
              width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 12px 8px 34px', fontSize: 13.5,
              color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none'
            }} />
        </div>

        {/* Status filter */}
        <div style={{ position: 'relative' }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{
            appearance: 'none', background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 32px 8px 12px', fontSize: 13, color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none'
          }}>
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="draft">Draft</option>
            <option value="rejected">Rejected</option>
          </select>
          <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
        </div>

        {/* Platform filter */}
        <div style={{ position: 'relative' }}>
          <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} style={{
            appearance: 'none', background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 32px 8px 12px', fontSize: 13, color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none'
          }}>
            <option value="all">All Platforms</option>
            {Object.keys(platformColors).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
        </div>

        <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)', alignSelf: 'center', marginLeft: 4 }}>
          {filtered.length} of {mockLibrary.length} items
        </span>
      </div>

      {/* Table */}
      <div className="panel fade-up fade-up-3">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Content', 'Brand / Product', 'Platform', 'Framework', 'Status', 'Author', 'Created', ''].map(h => (
                  <th key={h} style={{
                    padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600,
                    color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px',
                    whiteSpace: 'nowrap'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const { cls, Icon } = statusConfig[item.status]
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', maxWidth: 280 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: 'italic' }}>"{item.hook}"</div>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{item.brand}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{item.product}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                        color: platformColors[item.platform],
                        background: `${platformColors[item.platform]}18`,
                        border: `1px solid ${platformColors[item.platform]}40`,
                        whiteSpace: 'nowrap'
                      }}>{item.platform}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 11.5, fontFamily: 'var(--font-mono)', fontWeight: 500, padding: '2px 8px',
                        borderRadius: 6, background: 'var(--surface-4)', color: 'var(--text-secondary)',
                        border: '1px solid var(--border)'
                      }}>{item.framework}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`status-pill ${cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                        <Icon size={10} />
                        {statusConfig[item.status].label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 6, background: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10.5, fontWeight: 700, color: 'white', fontFamily: 'var(--font-display)'
                      }}>{item.author}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{item.createdAt}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button title="Copy" style={{
                          width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)',
                          background: 'var(--surface-3)', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', transition: 'all 0.15s'
                        }}>
                          <Copy size={12} />
                        </button>
                        <button title="Open" style={{
                          width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)',
                          background: 'var(--surface-3)', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', transition: 'all 0.15s'
                        }}>
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

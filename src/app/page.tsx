'use client'
import {
  Brain, Package, Zap, Megaphone, TrendingUp,
  Instagram, Youtube, Twitter, Plus, ArrowRight,
  CheckCircle2, Clock, XCircle, ChevronRight, Sparkles,
  BarChart3, Layers, BookOpen, Library, RefreshCw
} from 'lucide-react'

// ─── Mock data ───────────────────────────────────────────────────────────────
const kpiData = [
  {
    icon: Brain, label: 'Active Brands', value: '4',
    delta: '+1 this month', up: true,
    color: '#7c6dfa', bg: 'rgba(124,109,250,0.1)'
  },
  {
    icon: Package, label: 'Products', value: '12',
    delta: '+3 this month', up: true,
    color: '#22d3a0', bg: 'rgba(34,211,160,0.1)'
  },
  {
    icon: Zap, label: 'Generations', value: '187',
    delta: '+42 this week', up: true,
    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'
  },
  {
    icon: Megaphone, label: 'Campaigns', value: '6',
    delta: '2 active now', up: false,
    color: '#38bdf8', bg: 'rgba(56,189,248,0.1)'
  },
]

type StatusType = 'approved' | 'draft' | 'rejected'
type PlatformType = 'Instagram' | 'TikTok' | 'YouTube' | 'Twitter' | 'LinkedIn'

const platformColors: Record<PlatformType, string> = {
  Instagram: '#e1306c',
  TikTok: '#ffffff',
  YouTube: '#ff0000',
  Twitter: '#1d9bf0',
  LinkedIn: '#0a66c2',
}

const recentGenerations: {
  id: string
  title: string
  brand: string
  product: string
  platform: PlatformType
  status: StatusType
  framework: string
  time: string
}[] = [
  { id: '1', title: 'Ramadan Glow Hook — curiosity angle', brand: 'Lumière', product: 'Hydra Serum', platform: 'Instagram', status: 'approved', framework: 'PAS', time: '2h ago' },
  { id: '2', title: 'Product launch thread for Gen Z', brand: 'Velox', product: 'Runner Pro', platform: 'Twitter', status: 'draft', framework: 'AIDA', time: '4h ago' },
  { id: '3', title: 'TikTok pain-point hook video script', brand: 'Lumière', product: 'Night Repair', platform: 'TikTok', status: 'approved', framework: 'BAB', time: '6h ago' },
  { id: '4', title: 'YouTube description — brand awareness', brand: 'Korridor', product: 'Office Chair X', platform: 'YouTube', status: 'rejected', framework: 'AIDA', time: 'Yesterday' },
  { id: '5', title: 'Employee value prop copy for hiring', brand: 'Velox', product: 'Company', platform: 'LinkedIn', status: 'draft', framework: 'PAS', time: 'Yesterday' },
  { id: '6', title: 'Flash sale urgency caption', brand: 'Lumière', product: 'Hydra Serum', platform: 'Instagram', status: 'approved', framework: 'BAB', time: '2 days ago' },
]

const recommendations = {
  frameworks: ['PAS', 'BAB', 'AIDA'],
  hooks: ['Curiosity', 'Pain Point', 'Bold Claim'],
  tones: ['Playful-Bold', 'Warm-Expert', 'Direct'],
}

const quickActions = [
  { icon: Zap, label: 'Generate Content', sub: 'Caption, hook, CTA', color: '#7c6dfa', bg: 'rgba(124,109,250,0.15)', href: '/generate' },
  { icon: Megaphone, label: 'New Campaign', sub: 'Full strategy brief', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', href: '/campaigns' },
  { icon: Brain, label: 'Add Brand', sub: 'Set up brand brain', color: '#22d3a0', bg: 'rgba(34,211,160,0.15)', href: '/brands/new' },
  { icon: Package, label: 'Add Product', sub: 'Link to a brand', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', href: '/products/new' },
]

const brands = [
  { name: 'Lumière', category: 'Beauty', color: '#e1306c', products: 5, generations: 98, status: 'active' },
  { name: 'Velox', category: 'Sports', color: '#38bdf8', products: 4, generations: 54, status: 'active' },
  { name: 'Korridor', category: 'Furniture', color: '#22d3a0', products: 2, generations: 22, status: 'active' },
  { name: 'Zenova', category: 'Wellness', color: '#f59e0b', products: 1, generations: 13, status: 'draft' },
]

const usageStats = [
  { label: 'Brand Brain completeness', val: '72%', pct: 72, variant: 'default' },
  { label: 'Approval rate (this month)', val: '84%', pct: 84, variant: 'green' },
  { label: 'Content Library fill rate', val: '58%', pct: 58, variant: 'default' },
  { label: 'Team activity (last 7d)', val: '91%', pct: 91, variant: 'green' },
]

// ─── Status pill ─────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: StatusType }) {
  const map: Record<StatusType, { cls: string; label: string; Icon: typeof CheckCircle2 }> = {
    approved: { cls: 'status-approved', label: 'Approved', Icon: CheckCircle2 },
    draft: { cls: 'status-draft', label: 'Draft', Icon: Clock },
    rejected: { cls: 'status-rejected', label: 'Rejected', Icon: XCircle },
  }
  const { cls, label, Icon } = map[status]
  return (
    <span className={`status-pill ${cls}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Icon size={10} />
      {label}
    </span>
  )
}

// ─── Platform icon ────────────────────────────────────────────────────────────
function PlatformDot({ platform }: { platform: PlatformType }) {
  return (
    <div
      className="gen-platform-dot"
      style={{ background: platformColors[platform] }}
      title={platform}
    />
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <div>
      {/* Page header */}
      <div className="page-header page-header-row fade-up fade-up-1">
        <div>
          <h1 className="page-title">Good morning, Budi 👋</h1>
          <p className="page-subtitle">Here's what's happening across your workspace today.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary">
            <RefreshCw size={13} />
            Sync
          </button>
          <button className="btn btn-primary">
            <Sparkles size={13} />
            Generate Content
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="kpi-grid fade-up fade-up-2">
        {kpiData.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} className="kpi-card">
              <div className="kpi-icon-wrap" style={{ background: k.bg }}>
                <Icon style={{ color: k.color }} />
              </div>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
              <div className={`kpi-delta ${k.up ? 'up' : 'neutral'}`}>
                {k.up && <TrendingUp size={10} />}
                {k.delta}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick actions */}
      <div className="quick-actions fade-up fade-up-3">
        {quickActions.map((a) => {
          const Icon = a.icon
          return (
            <a key={a.label} href={a.href} className="quick-action-card">
              <div className="quick-action-icon" style={{ background: a.bg }}>
                <Icon style={{ color: a.color }} />
              </div>
              <div>
                <div className="quick-action-label">{a.label}</div>
                <div className="quick-action-sub">{a.sub}</div>
              </div>
            </a>
          )
        })}
      </div>

      {/* Main grid: recent generations + recommendations */}
      <div className="grid-2 fade-up fade-up-4">
        {/* Recent generations */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Recent Generations</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>187 total</span>
              <span className="panel-action" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                View all <ArrowRight size={11} />
              </span>
            </div>
          </div>
          <div className="panel-body">
            {recentGenerations.map((gen) => (
              <div key={gen.id} className="gen-row">
                <PlatformDot platform={gen.platform} />
                <div className="gen-meta">
                  <div className="gen-title">{gen.title}</div>
                  <div className="gen-sub">
                    <span>{gen.brand}</span>
                    <span style={{ color: 'var(--border-hover)' }}>·</span>
                    <span>{gen.product}</span>
                    <span style={{ color: 'var(--border-hover)' }}>·</span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10.5,
                      background: 'var(--surface-3)',
                      padding: '1px 5px',
                      borderRadius: 4,
                      color: 'var(--text-tertiary)'
                    }}>{gen.framework}</span>
                  </div>
                </div>
                <StatusPill status={gen.status} />
                <div className="gen-time">{gen.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Recommendations */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                AI Recommendations
              </span>
            </div>
            <div>
              <div className="rec-section">
                <div className="rec-section-label">Best Frameworks</div>
                <div className="rec-chips">
                  {recommendations.frameworks.map((f) => (
                    <span key={f} className={`rec-chip${f === 'PAS' ? ' highlight' : ''}`}>{f}</span>
                  ))}
                </div>
              </div>
              <div className="rec-section">
                <div className="rec-section-label">Hook Types</div>
                <div className="rec-chips">
                  {recommendations.hooks.map((h) => (
                    <span key={h} className={`rec-chip${h === 'Curiosity' ? ' highlight' : ''}`}>{h}</span>
                  ))}
                </div>
              </div>
              <div className="rec-section">
                <div className="rec-section-label">Tone Profiles</div>
                <div className="rec-chips">
                  {recommendations.tones.map((t) => (
                    <span key={t} className="rec-chip">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Usage summary */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <BarChart3 size={14} style={{ color: 'var(--text-secondary)' }} />
                Workspace Health
              </span>
            </div>
            <div className="panel-body">
              {usageStats.map((u) => (
                <div key={u.label} className="usage-row">
                  <div className="usage-label-row">
                    <span className="usage-label">{u.label}</span>
                    <span className="usage-val">{u.val}</span>
                  </div>
                  <div className="usage-bar-track">
                    <div
                      className={`usage-bar-fill ${u.variant}`}
                      style={{ width: u.val }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom grid: brands + library summary */}
      <div className="grid-2 fade-up fade-up-5" style={{ gridTemplateColumns: '1fr 360px' }}>
        {/* Brands overview */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Brain size={14} style={{ color: 'var(--text-secondary)' }} />
              Brand Brains
            </span>
            <a href="/brands/new" className="btn btn-secondary" style={{ padding: '5px 11px', fontSize: 12 }}>
              <Plus size={12} />
              Add Brand
            </a>
          </div>
          <div className="brand-mini-grid">
            {brands.map((b) => (
              <div key={b.name} className="brand-mini-card" style={{ position: 'relative', overflow: 'hidden', paddingLeft: 16 }}>
                <div className="brand-color-bar" style={{ background: b.color }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <div className="brand-mini-dot" style={{ background: b.color, boxShadow: `0 0 6px ${b.color}` }} />
                  <span className="brand-mini-name">{b.name}</span>
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: 10,
                    padding: '1px 7px',
                    borderRadius: 20,
                    fontWeight: 600,
                    background: b.status === 'active' ? 'var(--green-bg)' : 'var(--amber-bg)',
                    color: b.status === 'active' ? 'var(--green)' : 'var(--amber)',
                    border: `1px solid ${b.status === 'active' ? 'rgba(34,211,160,0.2)' : 'rgba(245,158,11,0.2)'}`
                  }}>
                    {b.status}
                  </span>
                </div>
                <div className="brand-mini-cat">{b.category}</div>
                <div className="brand-mini-stats">
                  <div className="brand-stat">
                    <span className="brand-stat-val">{b.products}</span>
                    <span className="brand-stat-lbl">Products</span>
                  </div>
                  <div className="brand-stat">
                    <span className="brand-stat-val">{b.generations}</span>
                    <span className="brand-stat-lbl">Outputs</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content library summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="panel" style={{ flex: 1 }}>
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Library size={14} style={{ color: 'var(--text-secondary)' }} />
                Content Library
              </span>
              <a href="/library" className="panel-action" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                Open <ArrowRight size={11} />
              </a>
            </div>
            <div className="panel-body">
              {[
                { label: 'Approved', count: 94, color: 'var(--green)', icon: CheckCircle2 },
                { label: 'Draft', count: 51, color: 'var(--amber)', icon: Clock },
                { label: 'Rejected', count: 42, color: 'var(--red)', icon: XCircle },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 20px', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', transition: 'background 0.1s'
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Icon size={14} style={{ color: item.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 18, fontWeight: 700,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.5px'
                    }}>{item.count}</span>
                    <ChevronRight size={13} style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                )
              })}
              <div style={{ padding: '12px 20px' }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 6 }}>Total outputs</div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 32,
                  fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1.5px'
                }}>187</div>
              </div>
            </div>
          </div>

          {/* Learning center teaser */}
          <div className="panel" style={{
            background: 'linear-gradient(135deg, rgba(124,109,250,0.12) 0%, rgba(124,109,250,0.04) 100%)',
            border: '1px solid var(--border-accent)'
          }}>
            <div style={{ padding: '18px 20px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8
              }}>
                <Layers size={15} style={{ color: 'var(--accent)' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Learning Center
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 14 }}>
                Your AI is learning from 187 outputs. PAS framework shows <strong style={{ color: 'var(--green)' }}>+23% higher approval rate</strong> this month.
              </p>
              <a href="/learning" className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 13px' }}>
                <BookOpen size={12} />
                View Insights
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

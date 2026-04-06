'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import {
  Brain, Package, Zap, Megaphone,
  Plus, ArrowRight,
  CheckCircle2, Clock, XCircle, ChevronRight, Sparkles,
  BarChart3, Layers, BookOpen, Library, RefreshCw
} from 'lucide-react'

type StatusType = 'approved' | 'draft' | 'rejected'

const platformColors: Record<string, string> = {
  instagram: '#e1306c',
  tiktok: '#ffffff',
  youtube: '#ff0000',
  twitter: '#1d9bf0',
  linkedin: '#0a66c2',
  facebook: '#1877f2',
}

const recommendations = {
  frameworks: ['PAS', 'BAB', 'AIDA'],
  hooks: ['Curiosity', 'Pain Point', 'Bold Claim'],
  tones: ['Playful-Bold', 'Warm-Expert', 'Direct'],
}

const quickActions = [
  { icon: Zap, label: 'Generate Content', sub: 'Caption, hook, CTA', color: '#7c6dfa', bg: 'rgba(124,109,250,0.15)', href: '/generate' },
  { icon: Megaphone, label: 'New Campaign', sub: 'Full strategy brief', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', href: '/campaigns' },
  { icon: Brain, label: 'Add Brand', sub: 'Set up brand brain', color: '#22d3a0', bg: 'rgba(34,211,160,0.15)', href: '/brands' },
  { icon: Package, label: 'Add Product', sub: 'Link to a brand', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', href: '/products' },
]

function StatusPill({ status }: { status: StatusType }) {
  const map: Record<StatusType, { cls: string; label: string; Icon: typeof CheckCircle2 }> = {
    approved: { cls: 'status-approved', label: 'Approved', Icon: CheckCircle2 },
    draft: { cls: 'status-draft', label: 'Draft', Icon: Clock },
    rejected: { cls: 'status-rejected', label: 'Rejected', Icon: XCircle },
  }
  const { cls, label, Icon } = map[status] ?? map.draft
  return (
    <span className={`status-pill ${cls}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Icon size={10} />
      {label}
    </span>
  )
}

function PlatformDot({ platform }: { platform: string }) {
  return (
    <div
      className="gen-platform-dot"
      style={{ background: platformColors[platform?.toLowerCase()] ?? 'var(--text-tertiary)' }}
      title={platform}
    />
  )
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 172800) return 'Yesterday'
  return `${Math.floor(diff / 86400)} days ago`
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const brandColors = ['#7c6dfa', '#e1306c', '#22d3a0', '#f59e0b', '#38bdf8', '#ec4899', '#a78bfa', '#34d399']

export default function DashboardPage() {
  const { workspaceId } = useWorkspace()
  const [userName, setUserName] = useState('there')
  const [kpis, setKpis] = useState({ brands: 0, products: 0, generations: 0, campaigns: 0 })
  const [recentGenerations, setRecentGenerations] = useState<any[]>([])
  const [libraryCounts, setLibraryCounts] = useState({ approved: 0, draft: 0, rejected: 0 })
  const [brandsData, setBrandsData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (workspaceId) loadDashboard()
  }, [workspaceId])

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const wsId = workspaceId
    if (!wsId) { setLoading(false); return }

    // All data in parallel
    const [
      profileRes,
      brandsRes,
      productsCountRes,
      generationsCountRes,
      campaignsCountRes,
      recentGenRes,
      libraryRes,
      brandStatsRes
    ] = await Promise.all([
      supabase.from('user_profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('brands').select('id, name, category, status').eq('workspace_id', wsId).order('created_at', { ascending: false }),
      supabase.from('products').select('id, brand_id').eq('workspace_id', wsId),
      supabase.from('generation_outputs').select('id', { count: 'exact', head: true }).eq('workspace_id', wsId),
      supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('workspace_id', wsId),
      supabase.from('generation_outputs').select(`
        id, copy_on_visual, slides, scenes, status, created_at, workspace_id,
        generation_requests ( platform, framework_id, brand_id, brands ( name ), products ( name ) )
      `).eq('workspace_id', wsId).order('created_at', { ascending: false }).limit(6),
      supabase.from('generation_outputs').select('status').eq('workspace_id', wsId),
      supabase.from('generation_requests').select('brand_id').eq('workspace_id', wsId),
    ])

    // User name
    if (profileRes.data?.full_name) {
      setUserName(profileRes.data.full_name.split(' ')[0])
    }

    // KPIs
    const allBrands = brandsRes.data || []
    const allProducts = productsCountRes.data || []
    setKpis({
      brands: allBrands.length,
      products: allProducts.length,
      generations: generationsCountRes.count ?? 0,
      campaigns: campaignsCountRes.count ?? 0,
    })

    // Recent generations
    if (recentGenRes.data) {
      setRecentGenerations(recentGenRes.data)
    }

    // Library counts
    const outputs = libraryRes.data || []
    setLibraryCounts({
      approved: outputs.filter((o: any) => o.status === 'approved').length,
      draft: outputs.filter((o: any) => o.status === 'draft').length,
      rejected: outputs.filter((o: any) => o.status === 'rejected').length,
    })

    // Brands with product + output counts
    const productsByBrand: Record<string, number> = {}
    allProducts.forEach((p: any) => {
      productsByBrand[p.brand_id] = (productsByBrand[p.brand_id] || 0) + 1
    })
    const outputsByBrand: Record<string, number> = {}
    ;(brandStatsRes.data || []).forEach((r: any) => {
      if (r.brand_id) outputsByBrand[r.brand_id] = (outputsByBrand[r.brand_id] || 0) + 1
    })
    setBrandsData(allBrands.map((b: any, i: number) => ({
      ...b,
      color: brandColors[i % brandColors.length],
      products: productsByBrand[b.id] || 0,
      generations: outputsByBrand[b.id] || 0,
    })))

    setLoading(false)
  }

  const totalOutputs = libraryCounts.approved + libraryCounts.draft + libraryCounts.rejected

  const kpiCards = [
    { icon: Brain, label: 'Active Brands', value: String(kpis.brands), color: '#7c6dfa', bg: 'rgba(124,109,250,0.1)' },
    { icon: Package, label: 'Products', value: String(kpis.products), color: '#22d3a0', bg: 'rgba(34,211,160,0.1)' },
    { icon: Zap, label: 'Generations', value: String(kpis.generations), color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { icon: Megaphone, label: 'Campaigns', value: String(kpis.campaigns), color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
  ]

  return (
    <div>
      {/* Page header */}
      <div className="page-header page-header-row fade-up fade-up-1">
        <div>
          <h1 className="page-title">{greeting()}, {userName} 👋</h1>
          <p className="page-subtitle">Here's what's happening across your workspace today.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={loadDashboard}>
            <RefreshCw size={13} />
            Sync
          </button>
          <a href="/generate" className="btn btn-primary">
            <Sparkles size={13} />
            Generate Content
          </a>
        </div>
      </div>

      {/* KPI grid */}
      <div className="kpi-grid fade-up fade-up-2">
        {kpiCards.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} className="kpi-card">
              <div className="kpi-icon-wrap" style={{ background: k.bg }}>
                <Icon style={{ color: k.color }} />
              </div>
              <div className="kpi-value">{loading ? '—' : k.value}</div>
              <div className="kpi-label">{k.label}</div>
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
              <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{totalOutputs} total</span>
              <a href="/library" className="panel-action" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                View all <ArrowRight size={11} />
              </a>
            </div>
          </div>
          <div className="panel-body">
            {loading ? (
              <div style={{ padding: '20px', color: 'var(--text-tertiary)', fontSize: 13 }}>Loading...</div>
            ) : recentGenerations.length === 0 ? (
              <div style={{ padding: '20px', color: 'var(--text-tertiary)', fontSize: 13 }}>No generations yet. <a href="/generate" style={{ color: 'var(--accent)' }}>Generate your first →</a></div>
            ) : recentGenerations.map((gen: any) => {
              const req = Array.isArray(gen.generation_requests) ? gen.generation_requests[0] : gen.generation_requests
              const brandName = req?.brands?.name ?? '—'
              const productName = req?.products?.name ?? '—'
              const platform = req?.platform ?? 'instagram'
              const status: StatusType = gen.status ?? 'draft'
              return (
                <div key={gen.id} className="gen-row">
                  <PlatformDot platform={platform} />
                  <div className="gen-meta">
                    <div className="gen-title" style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {gen.copy_on_visual || (gen.slides ? '[Carousel Format]' : gen.scenes ? '[Video Format]' : '(no copy)')}
                    </div>
                    <div className="gen-sub">
                      <span>{brandName}</span>
                      <span style={{ color: 'var(--border-hover)' }}>·</span>
                      <span>{productName}</span>
                      <span style={{ color: 'var(--border-hover)' }}>·</span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10.5,
                        background: 'var(--surface-3)', padding: '1px 5px',
                        borderRadius: 4, color: 'var(--text-tertiary)'
                      }}>{platform}</span>
                    </div>
                  </div>
                  <StatusPill status={status} />
                  <div className="gen-time">{timeAgo(gen.created_at)}</div>
                </div>
              )
            })}
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
              {[
                {
                  label: 'Approval rate',
                  val: totalOutputs > 0 ? `${Math.round((libraryCounts.approved / totalOutputs) * 100)}%` : '—',
                  pct: totalOutputs > 0 ? Math.round((libraryCounts.approved / totalOutputs) * 100) : 0,
                  variant: 'green'
                },
                {
                  label: 'Total outputs',
                  val: String(totalOutputs),
                  pct: Math.min(totalOutputs, 100),
                  variant: 'default'
                },
              ].map((u) => (
                <div key={u.label} className="usage-row">
                  <div className="usage-label-row">
                    <span className="usage-label">{u.label}</span>
                    <span className="usage-val">{u.val}</span>
                  </div>
                  <div className="usage-bar-track">
                    <div
                      className={`usage-bar-fill ${u.variant}`}
                      style={{ width: `${u.pct}%` }}
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
            <a href="/brands" className="btn btn-secondary" style={{ padding: '5px 11px', fontSize: 12 }}>
              <Plus size={12} />
              Add Brand
            </a>
          </div>
          {loading ? (
            <div style={{ padding: '20px', color: 'var(--text-tertiary)', fontSize: 13 }}>Loading brands...</div>
          ) : brandsData.length === 0 ? (
            <div style={{ padding: '20px', color: 'var(--text-tertiary)', fontSize: 13 }}>
              No brands yet. <a href="/brands" style={{ color: 'var(--accent)' }}>Add your first brand →</a>
            </div>
          ) : (
            <div className="brand-mini-grid">
              {brandsData.map((b: any) => (
                <a key={b.id} href="/brands" className="brand-mini-card" style={{ position: 'relative', overflow: 'hidden', paddingLeft: 16, textDecoration: 'none' }}>
                  <div className="brand-color-bar" style={{ background: b.color }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                    <div className="brand-mini-dot" style={{ background: b.color, boxShadow: `0 0 6px ${b.color}` }} />
                    <span className="brand-mini-name">{b.name}</span>
                    <span style={{
                      marginLeft: 'auto', fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 600,
                      background: b.status === 'active' ? 'var(--green-bg)' : 'var(--amber-bg)',
                      color: b.status === 'active' ? 'var(--green)' : 'var(--amber)',
                      border: `1px solid ${b.status === 'active' ? 'rgba(34,211,160,0.2)' : 'rgba(245,158,11,0.2)'}`
                    }}>
                      {b.status}
                    </span>
                  </div>
                  <div className="brand-mini-cat">{b.category || 'Uncategorized'}</div>
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
                </a>
              ))}
            </div>
          )}
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
                { label: 'Approved', count: libraryCounts.approved, color: 'var(--green)', icon: CheckCircle2 },
                { label: 'Draft', count: libraryCounts.draft, color: 'var(--amber)', icon: Clock },
                { label: 'Rejected', count: libraryCounts.rejected, color: 'var(--red)', icon: XCircle },
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
                      fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
                      color: 'var(--text-primary)', letterSpacing: '-0.5px'
                    }}>{loading ? '—' : item.count}</span>
                    <ChevronRight size={13} style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                )
              })}
              <div style={{ padding: '12px 20px' }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 6 }}>Total outputs</div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 32,
                  fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1.5px'
                }}>{loading ? '—' : totalOutputs}</div>
              </div>
            </div>
          </div>

          {/* Learning center teaser */}
          <div className="panel" style={{
            background: 'linear-gradient(135deg, rgba(124,109,250,0.12) 0%, rgba(124,109,250,0.04) 100%)',
            border: '1px solid var(--border-accent)'
          }}>
            <div style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Layers size={15} style={{ color: 'var(--accent)' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Learning Center
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 14 }}>
                Your AI is learning from {totalOutputs} outputs. Explore patterns and approval trends in your workspace.
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

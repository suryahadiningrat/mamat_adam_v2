'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Layers, TrendingUp, CheckCircle2, Clock, XCircle, Brain, Zap, Target, BarChart3, Sparkles } from 'lucide-react'

export default function LearningPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalOutputs: 0,
    approved: 0,
    draft: 0,
    rejected: 0,
    approvalRate: 0,
  })
  const [frameworkStats, setFrameworkStats] = useState<{ name: string; count: number; approved: number; rate: number }[]>([])
  const [platformStats, setPlatformStats] = useState<{ name: string; count: number; approved: number; rate: number }[]>([])
  const [objectiveStats, setObjectiveStats] = useState<{ name: string; count: number }[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => { loadInsights() }, [])

  async function loadInsights() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: roles } = await supabase.from('user_workspace_roles').select('workspace_id').eq('user_id', user.id).limit(1)
    const wsId = roles?.[0]?.workspace_id
    if (!wsId) { setLoading(false); return }

    // Fetch all outputs with their request details
    const { data: outputs } = await supabase.from('generation_outputs')
      .select(`
        id, status, created_at,
        generation_requests ( platform, objective, framework_id, brands ( name ) )
      `)
      .eq('workspace_id', wsId)
      .order('created_at', { ascending: false })

    if (!outputs) { setLoading(false); return }

    // Overall stats
    const total = outputs.length
    const approved = outputs.filter(o => o.status === 'approved').length
    const draft = outputs.filter(o => o.status === 'draft').length
    const rejected = outputs.filter(o => o.status === 'rejected').length
    setStats({
      totalOutputs: total,
      approved,
      draft,
      rejected,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
    })

    // Framework breakdown — framework_id is currently null in most rows, use a label fallback
    // Group by platform
    const platformMap: Record<string, { count: number; approved: number }> = {}
    const objectiveMap: Record<string, number> = {}

    outputs.forEach((o: any) => {
      const req = Array.isArray(o.generation_requests) ? o.generation_requests[0] : o.generation_requests
      const platform = req?.platform ?? 'Unknown'
      const objective = req?.objective ?? 'Unknown'

      if (!platformMap[platform]) platformMap[platform] = { count: 0, approved: 0 }
      platformMap[platform].count++
      if (o.status === 'approved') platformMap[platform].approved++

      objectiveMap[objective] = (objectiveMap[objective] || 0) + 1
    })

    const platformArr = Object.entries(platformMap)
      .map(([name, d]) => ({
        name,
        count: d.count,
        approved: d.approved,
        rate: d.count > 0 ? Math.round((d.approved / d.count) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)

    const objectiveArr = Object.entries(objectiveMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    setPlatformStats(platformArr)
    setObjectiveStats(objectiveArr)

    // Recent activity (last 10)
    setRecentActivity(outputs.slice(0, 10))

    setLoading(false)
  }

  const maxPlatformCount = Math.max(...platformStats.map(p => p.count), 1)
  const maxObjCount = Math.max(...objectiveStats.map(o => o.count), 1)

  const platformColors: Record<string, string> = {
    instagram: '#e1306c', tiktok: '#ffffff', youtube: '#ff0000',
    twitter: '#1d9bf0', 'twitter/x': '#1d9bf0', linkedin: '#0a66c2', facebook: '#1877f2'
  }

  function timeAgo(d: string) {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div>
      <div className="page-header page-header-row fade-up fade-up-1">
        <div>
          <h1 className="page-title">Learning Center</h1>
          <p className="page-subtitle">Insights from your content generation history. Understand what works best.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Learning from {stats.totalOutputs} outputs</span>
        </div>
      </div>

      {/* Overview KPIs */}
      <div className="kpi-grid fade-up fade-up-2">
        {[
          { icon: Zap, label: 'Total Outputs', value: stats.totalOutputs, color: '#7c6dfa', bg: 'rgba(124,109,250,0.1)' },
          { icon: CheckCircle2, label: 'Approved', value: stats.approved, color: '#22d3a0', bg: 'rgba(34,211,160,0.1)' },
          { icon: TrendingUp, label: 'Approval Rate', value: `${stats.approvalRate}%`, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          { icon: XCircle, label: 'Rejected', value: stats.rejected, color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
        ].map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} className="kpi-card">
              <div className="kpi-icon-wrap" style={{ background: k.bg }}><Icon style={{ color: k.color }} /></div>
              <div className="kpi-value">{loading ? '—' : k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          )
        })}
      </div>

      <div className="grid-2 fade-up fade-up-3">
        {/* Platform performance */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Target size={14} style={{ color: 'var(--text-secondary)' }} /> Platform Performance
            </span>
          </div>
          <div className="panel-body">
            {loading ? (
              <div style={{ padding: 20, color: 'var(--text-tertiary)', fontSize: 13 }}>Loading...</div>
            ) : platformStats.length === 0 ? (
              <div style={{ padding: 20, color: 'var(--text-tertiary)', fontSize: 13 }}>No data yet.</div>
            ) : platformStats.map(p => (
              <div key={p.name} style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: platformColors[p.name.toLowerCase()] ?? 'var(--text-tertiary)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{p.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{p.count} outputs</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: p.rate >= 70 ? 'var(--green)' : p.rate >= 40 ? 'var(--amber)' : 'var(--red)' }}>
                    {p.rate}% approved
                  </span>
                </div>
                <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(p.count / maxPlatformCount) * 100}%`, background: platformColors[p.name.toLowerCase()] ?? 'var(--accent)', borderRadius: 4, opacity: 0.7 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Objective breakdown */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <BarChart3 size={14} style={{ color: 'var(--text-secondary)' }} /> Content Objectives
            </span>
          </div>
          <div className="panel-body">
            {loading ? (
              <div style={{ padding: 20, color: 'var(--text-tertiary)', fontSize: 13 }}>Loading...</div>
            ) : objectiveStats.length === 0 ? (
              <div style={{ padding: 20, color: 'var(--text-tertiary)', fontSize: 13 }}>No data yet.</div>
            ) : objectiveStats.map((o, i) => (
              <div key={o.name} style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', minWidth: 20 }}>0{i + 1}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{o.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{o.count}</span>
                </div>
                <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(o.count / maxObjCount) * 100}%`, background: 'var(--accent)', borderRadius: 4, opacity: 0.6 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Output status summary + recent activity */}
      <div className="grid-2 fade-up fade-up-4">
        {/* Status breakdown */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Brain size={14} style={{ color: 'var(--text-secondary)' }} /> Output Status Breakdown
            </span>
          </div>
          <div className="panel-body">
            {[
              { label: 'Approved', count: stats.approved, color: 'var(--green)', icon: CheckCircle2, pct: stats.totalOutputs > 0 ? Math.round((stats.approved / stats.totalOutputs) * 100) : 0 },
              { label: 'Draft', count: stats.draft, color: 'var(--amber)', icon: Clock, pct: stats.totalOutputs > 0 ? Math.round((stats.draft / stats.totalOutputs) * 100) : 0 },
              { label: 'Rejected', count: stats.rejected, color: 'var(--red)', icon: XCircle, pct: stats.totalOutputs > 0 ? Math.round((stats.rejected / stats.totalOutputs) * 100) : 0 },
            ].map(item => {
              const Icon = item.icon
              return (
                <div key={item.label} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Icon size={14} style={{ color: item.color }} />
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}>
                      {loading ? '—' : item.count}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', minWidth: 36, textAlign: 'right' }}>{item.pct}%</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${item.pct}%`, background: item.color, borderRadius: 4, opacity: 0.7, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Layers size={14} style={{ color: 'var(--text-secondary)' }} /> Recent Activity
            </span>
          </div>
          <div className="panel-body">
            {loading ? (
              <div style={{ padding: 20, color: 'var(--text-tertiary)', fontSize: 13 }}>Loading...</div>
            ) : recentActivity.length === 0 ? (
              <div style={{ padding: 20, color: 'var(--text-tertiary)', fontSize: 13 }}>
                No activity yet. <a href="/generate" style={{ color: 'var(--accent)' }}>Generate your first content →</a>
              </div>
            ) : recentActivity.map((o: any) => {
              const req = Array.isArray(o.generation_requests) ? o.generation_requests[0] : o.generation_requests
              const platform = req?.platform ?? '—'
              const brand = req?.brands?.name ?? '—'
              const statusColor = o.status === 'approved' ? 'var(--green)' : o.status === 'rejected' ? 'var(--red)' : 'var(--amber)'
              return (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: platformColors[platform.toLowerCase()] ?? 'var(--text-tertiary)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 500 }}>{brand} · {platform}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 1 }}>{req?.objective ?? '—'}</div>
                  </div>
                  <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}30`, fontWeight: 600 }}>
                    {o.status}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{timeAgo(o.created_at)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tip section */}
      <div className="panel fade-up fade-up-5" style={{
        background: 'linear-gradient(135deg, rgba(124,109,250,0.1) 0%, rgba(124,109,250,0.03) 100%)',
        border: '1px solid var(--border-accent)', marginTop: 4
      }}>
        <div style={{ padding: '20px 24px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <Sparkles size={20} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, fontFamily: 'var(--font-display)' }}>
              How FCE learns from your outputs
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 600 }}>
              As your team approves and rejects content, FCE builds a picture of what resonates for each brand and platform.
              Higher approval rates per platform and objective indicate stronger alignment between your Brand Brain and that content type.
              Use these insights to guide your framework and hook type selections in the Content Generator.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  BookOpen, Tag, Layout, Calendar, Trash2, ArrowRight,
  ChevronDown, RefreshCw, Brain, Layers
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Topic = {
  id: string
  content_title: string
  content_pillar: string | null
  content_format: string | null
  publish_date: string | null
  platform: string | null
  objective: string | null
  status: string
  brand_id: string
  product_id: string | null
  brand_name?: string
  product_name?: string
}

type BrandGroup = {
  brand_id: string
  brand_name: string
  topics: Topic[]
}

const formatColors: Record<string, string> = {
  'Single Image': '#7c6dfa',
  'Carousel': '#3b82f6',
  'Reel / Short Video': '#f43f5e',
  'Story': '#f59e0b',
  'TikTok Video': '#aaaaaa',
  'TikTok Story': '#888888',
  'YouTube Short': '#ff0000',
  'YouTube Video': '#cc0000',
  'Article/Post': '#0a66c2',
}

const platformColors: Record<string, string> = {
  Instagram: '#e1306c', TikTok: '#aaa', YouTube: '#ff0000',
  'Twitter/X': '#1d9bf0', LinkedIn: '#0a66c2', Facebook: '#1877f2'
}

const statusColors: Record<string, { bg: string; text: string }> = {
  draft:     { bg: 'rgba(156,163,175,0.12)', text: '#9ca3af' },
  approved:  { bg: 'rgba(16,185,129,0.12)',  text: '#10b981' },
  generated: { bg: 'rgba(124,109,250,0.12)', text: '#7c6dfa' },
}

function pillarColor(pillar: string): string {
  const colors = ['#7c6dfa', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4']
  let hash = 0
  for (let i = 0; i < pillar.length; i++) hash = pillar.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TopicLibraryPage() {
  const [groups, setGroups] = useState<BrandGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: roles } = await supabase.from('user_workspace_roles').select('workspace_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1)
      if (!roles?.[0]) { setLoading(false); return }
      const wsId = roles[0].workspace_id

      let query = supabase
        .from('content_topics')
        .select('*, brands(name), products(name)')
        .eq('workspace_id', wsId)
        .order('publish_date', { ascending: true })

      if (filterPlatform) query = query.eq('platform', filterPlatform)
      if (filterStatus)   query = query.eq('status', filterStatus)

      const { data, error: qErr } = await query

      if (qErr) {
        if (qErr.message?.includes('schema cache') || qErr.message?.includes('content_topics')) {
          setError('TABLE_MISSING')
        } else {
          setError(qErr.message)
        }
        setLoading(false)
        return
      }

      // Group by brand
      const brandMap: Record<string, BrandGroup> = {}
      for (const row of data || []) {
        const brandId = row.brand_id || '__none__'
        const brandName = (row.brands as any)?.name || 'Unknown Brand'
        if (!brandMap[brandId]) brandMap[brandId] = { brand_id: brandId, brand_name: brandName, topics: [] }
        brandMap[brandId].topics.push({
          ...row,
          brand_name: brandName,
          product_name: (row.products as any)?.name || null,
        })
      }
      setGroups(Object.values(brandMap))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filterPlatform, filterStatus])

  useEffect(() => { load() }, [load])

  async function handleDelete(topicId: string) {
    if (!confirm('Delete this topic?')) return
    setDeleting(topicId)
    await supabase.from('content_topics').delete().eq('id', topicId)
    setGroups(prev => prev
      .map(g => ({ ...g, topics: g.topics.filter(t => t.id !== topicId) }))
      .filter(g => g.topics.length > 0)
    )
    setDeleting(null)
  }

  async function handleStatusChange(topicId: string, status: string) {
    await supabase.from('content_topics').update({ status }).eq('id', topicId)
    setGroups(prev => prev.map(g => ({
      ...g, topics: g.topics.map(t => t.id === topicId ? { ...t, status } : t)
    })))
  }

  function toggleCollapse(brandId: string) {
    setCollapsed(prev => ({ ...prev, [brandId]: !prev[brandId] }))
  }

  const totalTopics = groups.reduce((s, g) => s + g.topics.length, 0)
  const approvedCount = groups.reduce((s, g) => s + g.topics.filter(t => t.status === 'approved').length, 0)
  const generatedCount = groups.reduce((s, g) => s + g.topics.filter(t => t.status === 'generated').length, 0)

  return (
    <div>
      <div className="page-header page-header-row fade-up fade-up-1">
        <div>
          <h1 className="page-title">Topic Library</h1>
          <p className="page-subtitle">All saved content topics, grouped by brand.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="btn btn-secondary" href="/topics" style={{ fontSize: 13, textDecoration: 'none' }}>
            <Layers size={13} /> New Topics
          </a>
          <button className="btn btn-secondary" onClick={load} disabled={loading} style={{ fontSize: 13 }}>
            <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
          </button>
        </div>
      </div>

      {/* ─── Error: table missing ────────────────────────────────── */}
      {error === 'TABLE_MISSING' ? (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '24px 28px', maxWidth: 560 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>Database table missing</h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
            The <code style={{ background: 'var(--surface-3)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>content_topics</code> table
            doesn't exist yet. Run the migration in your Supabase SQL Editor:
          </p>
          <div style={{ background: 'var(--surface-3)', borderRadius: 8, padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
            migrate_content_topics.sql
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 10 }}>
            Go to Supabase → SQL Editor → paste the file contents → Run.
          </p>
        </div>
      ) : error ? (
        <div style={{ color: '#ef4444', fontSize: 13, padding: 16 }}>Error: {error}</div>

      ) : loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2].map(i => (
            <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, opacity: 0.5, animation: 'pulse 1.5s ease-in-out infinite' }}>
              <div style={{ height: 16, width: 180, borderRadius: 6, background: 'var(--surface-3)', marginBottom: 16 }} />
              {[1, 2, 3].map(j => <div key={j} style={{ height: 48, borderRadius: 8, background: 'var(--surface-3)', marginBottom: 8 }} />)}
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="fade-up fade-up-2" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Topics', value: totalTopics, color: 'var(--accent)' },
              { label: 'Approved', value: approvedCount, color: '#10b981' },
              { label: 'Generated', value: generatedCount, color: '#7c6dfa' },
              { label: 'Brands', value: groups.length, color: 'var(--text-secondary)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 18px', minWidth: 100 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="fade-up fade-up-3" style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <FilterSelect label="Platform" value={filterPlatform} onChange={setFilterPlatform}
              options={['Instagram', 'TikTok', 'YouTube', 'Twitter/X', 'LinkedIn', 'Facebook']} />
            <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus}
              options={['draft', 'approved', 'generated']} />
          </div>

          {/* Brand groups */}
          {groups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 32px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16 }}>
              <BookOpen size={36} style={{ color: 'var(--text-tertiary)', display: 'block', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>No saved topics yet</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginBottom: 20 }}>
                {filterPlatform || filterStatus ? 'No topics match your filters.' : 'Generate topics and save them to build your content calendar.'}
              </p>
              <a className="btn btn-primary" href="/topics" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                <Layers size={13} /> Generate Topics
              </a>
            </div>
          ) : (
            <div className="fade-up fade-up-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {groups.map(group => (
                <BrandSection
                  key={group.brand_id}
                  group={group}
                  collapsed={!!collapsed[group.brand_id]}
                  onToggle={() => toggleCollapse(group.brand_id)}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  deleting={deleting}
                />
              ))}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
      `}</style>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ appearance: 'none', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 30px 7px 12px', fontSize: 12.5, color: value ? 'var(--text-primary)' : 'var(--text-tertiary)', fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none' }}
        onFocus={e => e.target.style.borderColor = 'var(--border-accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'}>
        <option value="">All {label}s</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={11} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
    </div>
  )
}

function BrandSection({ group, collapsed, onToggle, onDelete, onStatusChange, deleting }: {
  group: BrandGroup
  collapsed: boolean
  onToggle: () => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string) => void
  deleting: string | null
}) {
  const approvedCount = group.topics.filter(t => t.status === 'approved').length
  const generatedCount = group.topics.filter(t => t.status === 'generated').length

  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
      {/* Brand header */}
      <button onClick={onToggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
        background: 'none', border: 'none', cursor: 'pointer', borderBottom: collapsed ? 'none' : '1px solid var(--border)',
        transition: 'background 0.15s',
      }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7c6dfa, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Brain size={15} style={{ color: 'white' }} />
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{group.brand_name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 1 }}>
            {group.topics.length} topic{group.topics.length !== 1 ? 's' : ''}
            {approvedCount > 0 && <> · <span style={{ color: '#10b981' }}>{approvedCount} approved</span></>}
            {generatedCount > 0 && <> · <span style={{ color: '#7c6dfa' }}>{generatedCount} generated</span></>}
          </div>
        </div>
        <ChevronDown size={15} style={{ color: 'var(--text-tertiary)', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>

      {/* Topics table */}
      {!collapsed && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Title', 'Pillar', 'Format', 'Publish Date', 'Platform', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '9px 16px', fontSize: 10.5, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'left', whiteSpace: 'nowrap', background: 'var(--surface-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.topics.map((topic, idx) => (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  isLast={idx === group.topics.length - 1}
                  onDelete={() => onDelete(topic.id)}
                  onStatusChange={(s) => onStatusChange(topic.id, s)}
                  deleting={deleting === topic.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TopicRow({ topic, isLast, onDelete, onStatusChange, deleting }: {
  topic: Topic
  isLast: boolean
  onDelete: () => void
  onStatusChange: (s: string) => void
  deleting: boolean
}) {
  const fmtColor = formatColors[topic.content_format || ''] || '#7c6dfa'
  const pColor = pillarColor(topic.content_pillar || '')
  const sc = statusColors[topic.status] || statusColors.draft
  const pltColor = platformColors[topic.platform || ''] || 'var(--text-tertiary)'

  const generateUrl = `/generate?` + new URLSearchParams({
    topic: topic.content_title,
    format: topic.content_format || '',
    pillar: topic.content_pillar || '',
    platform: topic.platform || '',
    brandId: topic.brand_id || '',
    ...(topic.objective ? { objective: topic.objective } : {}),
    ...(topic.product_id ? { productId: topic.product_id } : {})
  }).toString()

  return (
    <tr style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)', transition: 'background 0.1s' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

      {/* Title */}
      <td style={{ padding: '12px 16px', maxWidth: 340, minWidth: 200 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, display: 'block' }}>
          {topic.content_title}
        </span>
        {topic.product_name && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, display: 'block' }}>{topic.product_name}</span>
        )}
      </td>

      {/* Pillar */}
      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
        {topic.content_pillar ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 8px', borderRadius: 20, background: `${pColor}18`, border: `1px solid ${pColor}40`, color: pColor, fontWeight: 500 }}>
            <Tag size={9} /> {topic.content_pillar}
          </span>
        ) : <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>}
      </td>

      {/* Format */}
      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
        {topic.content_format ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 8px', borderRadius: 20, background: `${fmtColor}18`, border: `1px solid ${fmtColor}40`, color: fmtColor, fontWeight: 500 }}>
            <Layout size={9} /> {topic.content_format}
          </span>
        ) : <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>}
      </td>

      {/* Date */}
      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
        {topic.publish_date ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
            <Calendar size={11} style={{ color: 'var(--text-tertiary)' }} />
            {fmtDate(topic.publish_date)}
          </span>
        ) : <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>}
      </td>

      {/* Platform */}
      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
        {topic.platform ? (
          <span style={{ fontSize: 12, color: pltColor, fontWeight: 500 }}>{topic.platform}</span>
        ) : <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>}
      </td>

      {/* Status */}
      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
        <div style={{ position: 'relative' }}>
          <select value={topic.status} onChange={e => onStatusChange(e.target.value)}
            style={{ appearance: 'none', background: sc.bg, border: `1px solid ${sc.text}40`, borderRadius: 20, padding: '3px 24px 3px 8px', fontSize: 11, color: sc.text, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none' }}>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="generated">Generated</option>
          </select>
          <ChevronDown size={10} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', color: sc.text, pointerEvents: 'none' }} />
        </div>
      </td>

      {/* Actions */}
      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <a href={generateUrl} title="Generate content" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-accent)', background: 'rgba(124,109,250,0.06)' }}>
            Generate <ArrowRight size={10} />
          </a>
          <button onClick={onDelete} disabled={deleting} title="Delete" style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: deleting ? 'not-allowed' : 'pointer', padding: 4, borderRadius: 4, display: 'flex', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  )
}

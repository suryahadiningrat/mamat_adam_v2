'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  BookOpen, Tag, Layout, Calendar, Trash2, ArrowRight,
  ChevronDown, RefreshCw, Layers, Search
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/contexts/WorkspaceContext'

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
  const { workspaceId } = useWorkspace()
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Filters (all client-side)
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: qErr } = await supabase
        .from('content_topics')
        .select('*, brands(name), products(name)')
        .eq('workspace_id', workspaceId)
        .order('publish_date', { ascending: true })

      if (qErr) {
        if (qErr.message?.includes('schema cache') || qErr.message?.includes('content_topics')) {
          setError('TABLE_MISSING')
        } else {
          setError(qErr.message)
        }
        setLoading(false)
        return
      }

      setTopics((data || []).map((row: any) => ({
        ...row,
        brand_name: (row.brands as any)?.name || 'Unknown Brand',
        product_name: (row.products as any)?.name || null,
      })))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { load() }, [load])

  async function handleDelete(topicId: string) {
    if (!confirm('Delete this topic?')) return
    setDeleting(topicId)
    await supabase.from('content_topics').delete().eq('id', topicId)
    setTopics(prev => prev.filter(t => t.id !== topicId))
    setDeleting(null)
  }

  async function handleStatusChange(topicId: string, status: string) {
    await supabase.from('content_topics').update({ status }).eq('id', topicId)
    setTopics(prev => prev.map(t => t.id === topicId ? { ...t, status } : t))
  }

  // Derived filter options
  const brandOptions = Array.from(new Set(topics.map(t => t.brand_name).filter(Boolean))) as string[]
  const platformOptions = Array.from(new Set(topics.map(t => t.platform).filter(Boolean))) as string[]

  // Client-side filtering
  const filtered = topics.filter(t => {
    const matchSearch = !search ||
      t.content_title?.toLowerCase().includes(search.toLowerCase()) ||
      t.brand_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.content_pillar?.toLowerCase().includes(search.toLowerCase())
    const matchBrand = brandFilter === 'all' || t.brand_name === brandFilter
    const matchPlatform = platformFilter === 'all' || t.platform === platformFilter
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    return matchSearch && matchBrand && matchPlatform && matchStatus
  })

  // Stats from full unfiltered set
  const approvedCount = topics.filter(t => t.status === 'approved').length
  const generatedCount = topics.filter(t => t.status === 'generated').length
  const brandCount = brandOptions.length

  return (
    <div>
      <div className="page-header page-header-row fade-up fade-up-1">
        <div>
          <h1 className="page-title">Topic Library</h1>
          <p className="page-subtitle">Your saved content topics and calendar.</p>
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
            doesn't exist yet. Run the migration in your Supabase SQL Editor.
          </p>
        </div>
      ) : error ? (
        <div style={{ color: '#ef4444', fontSize: 13, padding: 16 }}>Error: {error}</div>
      ) : (
        <>
          {/* Stats */}
          <div className="fade-up fade-up-2" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Topics', value: topics.length, color: 'var(--accent)' },
              { label: 'Approved', value: approvedCount, color: '#10b981' },
              { label: 'Generated', value: generatedCount, color: '#7c6dfa' },
              { label: 'Brands', value: brandCount, color: 'var(--text-secondary)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 18px', minWidth: 100 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="fade-up fade-up-3" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search topics, brands, pillars…"
                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px 8px 34px', fontSize: 13.5, color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
            {/* Brand */}
            {brandOptions.length > 0 && (
              <FilterSelect label="Brand" value={brandFilter} onChange={setBrandFilter} options={brandOptions} allLabel="All Brands" />
            )}
            {/* Platform */}
            <FilterSelect label="Platform" value={platformFilter} onChange={setPlatformFilter} options={platformOptions} allLabel="All Platforms" />
            {/* Status */}
            <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={['draft', 'approved', 'generated']} allLabel="All Statuses" />
            <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)', alignSelf: 'center', marginLeft: 4 }}>{filtered.length} topics</span>
          </div>

          {/* Table */}
          <div className="panel fade-up fade-up-4">
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 32px' }}>
                <BookOpen size={36} style={{ color: 'var(--text-tertiary)', display: 'block', margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>No topics found</h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginBottom: 20 }}>
                  {search || brandFilter !== 'all' || platformFilter !== 'all' || statusFilter !== 'all'
                    ? 'No topics match your filters.'
                    : 'Generate topics and save them to build your content calendar.'}
                </p>
                <a className="btn btn-primary" href="/topics" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                  <Layers size={13} /> Generate Topics
                </a>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-1)' }}>
                      {['Topic Title', 'Brand', 'Pillar', 'Format', 'Platform', 'Date', 'Status', ''].map(h => (
                        <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(topic => {
                      const fmtColor = formatColors[topic.content_format || ''] || '#7c6dfa'
                      const pColor = pillarColor(topic.content_pillar || '')
                      const pltColor = platformColors[topic.platform || ''] || 'var(--text-tertiary)'
                      const sc = statusColors[topic.status] || statusColors.draft

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
                        <tr key={topic.id}
                          style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>

                          {/* Title */}
                          <td style={{ padding: '12px 16px', maxWidth: 320, minWidth: 180 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                              {topic.content_title}
                            </div>
                            {topic.product_name && (
                              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{topic.product_name}</div>
                            )}
                          </td>

                          {/* Brand */}
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{topic.brand_name}</div>
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

                          {/* Platform */}
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            {topic.platform ? (
                              <span style={{ fontSize: 12, color: pltColor, fontWeight: 500 }}>{topic.platform}</span>
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

                          {/* Status */}
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <div style={{ position: 'relative' }}>
                              <select value={topic.status} onChange={e => handleStatusChange(topic.id, e.target.value)}
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
                              <a href={generateUrl} target="_blank" rel="noopener noreferrer" title="Generate content"
                                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-accent)', background: 'rgba(124,109,250,0.06)' }}>
                                Generate <ArrowRight size={10} />
                              </a>
                              <button onClick={() => handleDelete(topic.id)} disabled={deleting === topic.id} title="Delete"
                                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: deleting === topic.id ? 'not-allowed' : 'pointer', padding: 4, borderRadius: 4, display: 'flex', transition: 'color 0.15s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options, allLabel }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; allLabel: string
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ appearance: 'none', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 30px 8px 12px', fontSize: 13, color: value !== 'all' ? 'var(--text-primary)' : 'var(--text-tertiary)', fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none' }}
        onFocus={e => e.target.style.borderColor = 'var(--border-accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}>
        <option value="all">{allLabel}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={11} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
    </div>
  )
}

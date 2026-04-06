'use client'
import { useState, useEffect } from 'react'
import {
  Layers, Sparkles, RefreshCw, Brain, ChevronDown,
  Calendar, Tag, Layout, Trash2, CheckCircle2, ArrowRight, Save
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/contexts/WorkspaceContext'

const platforms = ['Instagram', 'TikTok', 'YouTube', 'Twitter/X', 'LinkedIn', 'Facebook']

const platformColors: Record<string, string> = {
  Instagram: '#e1306c', TikTok: '#aaa', YouTube: '#ff0000',
  'Twitter/X': '#1d9bf0', LinkedIn: '#0a66c2', Facebook: '#1877f2'
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

type Topic = {
  id?: string
  content_title: string
  content_pillar: string
  content_format: string
  publish_date: string
  saved?: boolean
}

type DBBrand = {
  id: string; name: string
  brand_brain_versions: {
    tone_of_voice: string; brand_personality: string
    audience_persona: any; messaging_rules: any; source_summary: string
    brand_promise: string
  }[]
}

type DBProduct = {
  id: string; brand_id: string; name: string
  product_brain_versions: { usp: string }[]
}

function parseExt(raw: any) {
  try {
    const d = typeof raw === 'string' ? JSON.parse(raw) : (raw || {})
    return {
      industry: d.industry || '',
      content_pillars: d.content_pillars || [],
      social_media_platforms: d.social_media_platforms || [],
      marketing_strategy: d.marketing_strategy || '',
      content_language: d.content_language || 'English',
    }
  } catch {
    return { industry: '', content_pillars: [], social_media_platforms: [], marketing_strategy: '', content_language: 'English' }
  }
}

function pillarColor(pillar: string): string {
  const colors = ['#7c6dfa', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4']
  let hash = 0
  for (let i = 0; i < pillar.length; i++) hash = pillar.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function TopicsPage() {
  const { workspaceId } = useWorkspace()
  const [brands, setBrands] = useState<DBBrand[]>([])
  const [products, setProducts] = useState<DBProduct[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  const [form, setForm] = useState({
    brandId: '',
    productId: '',
    platform: 'Instagram',
    objective: '',
    count: 10,
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  })

  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [allSaved, setAllSaved] = useState(false)

  useEffect(() => {
    if (!workspaceId) return
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const [{ data: bData }, { data: pData }] = await Promise.all([
        supabase.from('brands').select('id, name, brand_brain_versions(tone_of_voice, brand_personality, audience_persona, messaging_rules, source_summary, brand_promise)').eq('workspace_id', workspaceId),
        supabase.from('products').select('id, brand_id, name, product_brain_versions(usp)').eq('workspace_id', workspaceId)
      ])
      if (bData) setBrands(bData as DBBrand[])
      if (pData) setProducts(pData as DBProduct[])
    }
    init()
  }, [workspaceId])

  const selectedBrand = brands.find(b => b.id === form.brandId)
  const availableProducts = products.filter(p => p.brand_id === form.brandId)
  const selectedProduct = availableProducts.find(p => p.id === form.productId)
  const ext = parseExt(selectedBrand?.brand_brain_versions?.[0]?.messaging_rules)
  const canGenerate = !!form.brandId && !!form.platform

  async function handleGenerate() {
    if (!canGenerate || !selectedBrand) return
    setLoading(true)
    setTopics([])
    setAllSaved(false)

    const brain = selectedBrand.brand_brain_versions?.[0]
    const brandPayload = {
      name: selectedBrand.name,
      industry: ext.industry,
      toneOfVoice: brain?.tone_of_voice || '',
      personality: brain?.brand_personality || '',
      audience: brain?.audience_persona || '',
      brandSummary: brain?.source_summary || '',
      contentPillars: ext.content_pillars,
      socialPlatforms: ext.social_media_platforms,
      marketingStrategy: ext.marketing_strategy,
    }

    const productPayload = selectedProduct && form.productId !== '__general__'
      ? { name: selectedProduct.name, usp: selectedProduct.product_brain_versions?.[0]?.usp || '' }
      : null

    try {
      const res = await fetch('/api/generate-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brandPayload,
          product: productPayload,
          platform: form.platform,
          count: form.count,
          dateFrom: form.dateFrom,
          dateTo: form.dateTo,
          workspace_id: workspaceId,
        })
      })
      const data = await res.json()
      if (data.success) {
        setTopics(data.topics.map((t: Topic) => ({ ...t, saved: false })))
      } else {
        alert(data.error || 'Generation failed')
      }
    } catch {
      alert('Network error — check your connection')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveAll() {
    if (!topics.length || !workspaceId || !userId || !form.brandId) return
    setSaving(true)
    const toSave = topics.filter(t => !t.saved)
    try {
      const rows = toSave.map(t => ({
        workspace_id: workspaceId,
        brand_id: form.brandId,
        product_id: (form.productId && form.productId !== '__general__') ? form.productId : null,
        content_title: t.content_title,
        content_pillar: t.content_pillar,
        content_format: t.content_format,
        platform: form.platform,
        objective: form.objective || null,
        publish_date: t.publish_date || null,
        status: 'approved',
        created_by: userId,
      }))
      const { error } = await supabase.from('content_topics').insert(rows)
      if (error) throw error
      setTopics(prev => prev.map(t => ({ ...t, saved: true })))
      setAllSaved(true)
    } catch (e: any) {
      const msg = e.message || ''
      if (msg.includes('schema cache') || msg.includes('relation "content_topics" does not exist')) {
        alert('Table not found.\n\nPlease run migrate_content_topics.sql in your Supabase SQL Editor first, then try again.')
      } else {
        alert('Save failed: ' + msg)
      }
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(idx: number) {
    setTopics(prev => prev.filter((_, i) => i !== idx))
  }

  const set = (k: string) => (v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      <div className="page-header page-header-row fade-up fade-up-1">
        <div>
          <h1 className="page-title">Topic Generator</h1>
          <p className="page-subtitle">Generate a bulk content calendar before building individual posts.</p>
        </div>
        {topics.length > 0 && (
          <button
            className={`btn ${allSaved ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleSaveAll}
            disabled={saving || allSaved}
            style={{ opacity: allSaved ? 0.6 : 1 }}
          >
            {saving ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> :
             allSaved ? <><CheckCircle2 size={13} /> Saved to Calendar</> :
             <><Save size={13} /> Save All Topics</>}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ─── Config Panel ──────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="panel fade-up fade-up-2">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Brain size={14} style={{ color: 'var(--text-secondary)' }} /> Context
              </span>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Brand */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Brand *</label>
                <div style={{ position: 'relative' }}>
                  <select value={form.brandId} onChange={e => { set('brandId')(e.target.value); set('productId')('') }}
                    style={{ width: '100%', appearance: 'none', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 32px 8px 12px', fontSize: 13, color: form.brandId ? 'var(--text-primary)' : 'var(--text-tertiary)', fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = 'var(--border-accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'}>
                    <option value="">Select a brand</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Product */}
              {form.brandId && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Product <span style={{ color: 'var(--text-tertiary)' }}>(optional)</span></label>
                  <div style={{ position: 'relative' }}>
                    <select value={form.productId} onChange={e => set('productId')(e.target.value)}
                      style={{ width: '100%', appearance: 'none', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 32px 8px 12px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none' }}
                      onFocus={e => e.target.style.borderColor = 'var(--border-accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'}>
                      <option value="">— Brand-level topics —</option>
                      {availableProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                  </div>
                </div>
              )}

              {/* Pillar preview */}
              {ext.content_pillars.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {ext.content_pillars.map((p: string) => (
                    <span key={p} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: `${pillarColor(p)}18`, border: `1px solid ${pillarColor(p)}40`, color: pillarColor(p) }}>{p}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Platform & Objective */}
          <div className="panel fade-up fade-up-3">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Layout size={14} style={{ color: 'var(--text-secondary)' }} /> Platform & Objective
              </span>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {platforms.map(p => (
                  <button key={p} onClick={() => set('platform')(p)} style={{
                    padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                    border: form.platform === p ? `1.5px solid ${platformColors[p]}` : '1px solid var(--border)',
                    background: form.platform === p ? `${platformColors[p]}18` : 'var(--surface-3)',
                    color: form.platform === p ? platformColors[p] : 'var(--text-secondary)',
                  }}>{p}</button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Objective</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['Awareness', 'Engagement', 'Education', 'Conversion', 'Retention'].map(o => (
                    <button key={o} onClick={() => set('objective')(form.objective === o ? '' : o)} style={{
                      padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                      border: form.objective === o ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                      background: form.objective === o ? 'rgba(124,109,250,0.12)' : 'var(--surface-3)',
                      color: form.objective === o ? 'var(--accent)' : 'var(--text-secondary)',
                    }}>{o}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Schedule & Count */}
          <div className="panel fade-up fade-up-4">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Calendar size={14} style={{ color: 'var(--text-secondary)' }} /> Schedule
              </span>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>From</label>
                <input type="date" value={form.dateFrom} onChange={e => set('dateFrom')(e.target.value)}
                  style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none', width: '100%' }}
                  onFocus={e => e.target.style.borderColor = 'var(--border-accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>To</label>
                <input type="date" value={form.dateTo} onChange={e => set('dateTo')(e.target.value)}
                  style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none', width: '100%' }}
                  onFocus={e => e.target.style.borderColor = 'var(--border-accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Number of topics: <strong style={{ color: 'var(--text-primary)' }}>{form.count}</strong>
                </label>
                <input type="range" min={5} max={30} step={5} value={form.count} onChange={e => set('count')(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)' }}>
                  <span>5</span><span>15</span><span>30</span>
                </div>
              </div>
            </div>
          </div>

          <button className="btn btn-primary" onClick={handleGenerate} disabled={!canGenerate || loading}
            style={{ width: '100%', justifyContent: 'center', padding: 11, fontSize: 14, opacity: (!canGenerate || loading) ? 0.5 : 1, cursor: (!canGenerate || loading) ? 'not-allowed' : 'pointer' }}>
            {loading
              ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
              : <><Sparkles size={14} /> Generate {form.count} Topics</>}
          </button>
          {!canGenerate && (
            <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: -4 }}>Select a brand to continue</p>
          )}
        </div>

        {/* ─── Topics Output ─────────────────────────────────────── */}
        <div>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {Array.from({ length: form.count }).map((_, i) => (
                <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, height: 110, animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.05}s` }} />
              ))}
            </div>
          ) : topics.length > 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{topics.length}</strong> topics for {selectedBrand?.name} · {form.platform}
                  {selectedProduct ? ` · ${selectedProduct.name}` : ''}
                </span>
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={handleGenerate}>
                  <RefreshCw size={12} /> Regenerate
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {topics.map((topic, idx) => (
                  <TopicCard
                    key={idx} topic={topic} onDelete={() => handleDelete(idx)}
                    brandId={form.brandId} productId={form.productId}
                    platform={form.platform} objective={form.objective}
                  />
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
              <div style={{ textAlign: 'center', padding: '48px 32px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 400 }}>
                <Layers size={36} style={{ color: 'var(--accent)', margin: '0 auto 16px', display: 'block' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>No topics yet</h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Select a brand and platform, set your date range, then click Generate to build your content calendar.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
      `}</style>
    </div>
  )
}

function TopicCard({ topic, onDelete, brandId, productId, platform, objective }: {
  topic: Topic; onDelete: () => void
  brandId: string; productId: string; platform: string; objective: string
}) {
  const fmtColor = formatColors[topic.content_format] || '#7c6dfa'
  const pColor = pillarColor(topic.content_pillar || '')

  const generateUrl = `/generate?` + new URLSearchParams({
    topic: topic.content_title,
    format: topic.content_format || '',
    pillar: topic.content_pillar || '',
    platform,
    brandId,
    ...(objective ? { objective } : {}),
    ...(productId && productId !== '__general__' ? { productId } : {})
  }).toString()

  return (
    <div style={{
      background: topic.saved ? 'rgba(16,185,129,0.04)' : 'var(--surface-2)',
      border: `1px solid ${topic.saved ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
      borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
      transition: 'all 0.2s', position: 'relative'
    }}>
      {/* Delete */}
      {!topic.saved && (
        <button onClick={onDelete} style={{
          position: 'absolute', top: 10, right: 10, background: 'none', border: 'none',
          color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4, lineHeight: 1,
          borderRadius: 4, transition: 'color 0.15s'
        }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
          <Trash2 size={13} />
        </button>
      )}

      {/* Title */}
      <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.45, paddingRight: 20, margin: 0 }}>
        {topic.content_title}
      </p>

      {/* Meta row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {/* Pillar */}
        {topic.content_pillar && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 8px', borderRadius: 20, background: `${pColor}18`, border: `1px solid ${pColor}40`, color: pColor, fontWeight: 500 }}>
            <Tag size={9} /> {topic.content_pillar}
          </span>
        )}
        {/* Format */}
        {topic.content_format && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 8px', borderRadius: 20, background: `${fmtColor}18`, border: `1px solid ${fmtColor}40`, color: fmtColor, fontWeight: 500 }}>
            <Layout size={9} /> {topic.content_format}
          </span>
        )}
        {/* Date */}
        {topic.publish_date && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-tertiary)', fontWeight: 500 }}>
            <Calendar size={9} /> {new Date(topic.publish_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      {/* Generate link */}
      {topic.saved ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#10b981' }}>
          <CheckCircle2 size={12} /> Saved to calendar
        </div>
      ) : (
        <a href={generateUrl} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
          Generate content <ArrowRight size={11} />
        </a>
      )}
    </div>
  )
}

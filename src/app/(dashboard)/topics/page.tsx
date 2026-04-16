'use client'
import { useState, useEffect } from 'react'
import {
  Layers, Sparkles, RefreshCw, Brain, ChevronDown,
  Calendar, Tag, Layout, Trash2, CheckCircle2, ArrowRight, Save, Link, X
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
  product_id?: string
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
    productMode: 'general' as 'general' | 'mixed' | 'specific',
    selectedProductIds: [] as string[],
    selectedPillars: [] as string[],
    platform: 'Instagram',
    objective: '',
    count: 10,
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    context: '',
    referenceUrl: '',
  })

  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [allSaved, setAllSaved] = useState(false)

  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState('')
  const [scrapeResult, setScrapeResult] = useState<{ title: string; content_type: string; main_topic: string; key_claims: string[]; tone: string; summary: string; content_angles: string[] } | null>(null)
  const [referenceSummary, setReferenceSummary] = useState('')

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

    let productsPayload: { id: string; name: string; usp: string }[] | null = null
    if (form.productMode === 'mixed') {
      productsPayload = availableProducts.map(p => ({ id: p.id, name: p.name, usp: p.product_brain_versions?.[0]?.usp || '' }))
    } else if (form.productMode === 'specific' && form.selectedProductIds.length > 0) {
      productsPayload = availableProducts.filter(p => form.selectedProductIds.includes(p.id)).map(p => ({ id: p.id, name: p.name, usp: p.product_brain_versions?.[0]?.usp || '' }))
    }

    try {
      const res = await fetch('/api/generate-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brandPayload,
          products: productsPayload,
          platform: form.platform,
          count: form.count,
          dateFrom: form.dateFrom,
          dateTo: form.dateTo,
          selectedPillars: form.selectedPillars.length > 0 ? form.selectedPillars : undefined,
          context: form.context || undefined,
          referenceUrl: form.referenceUrl || undefined,
          referenceSummary: referenceSummary || undefined,
          language: ext.content_language || 'Indonesian',
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
        product_id: form.productMode === 'general' ? null : (t.product_id || null),
        content_title: t.content_title.substring(0, 255),
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

  function handleUpdateTopic(idx: number, updates: Partial<Topic>) {
    setTopics(prev => prev.map((t, i) => i === idx ? { ...t, ...updates } : t))
  }

  async function handleRegenerateOne(idx: number, revisionContext: string) {
    if (!selectedBrand) return
    const brain = selectedBrand.brand_brain_versions?.[0]
    const brandPayload = {
      name: selectedBrand.name, industry: ext.industry,
      toneOfVoice: brain?.tone_of_voice || '', personality: brain?.brand_personality || '',
      audience: brain?.audience_persona || '', brandSummary: brain?.source_summary || '',
      contentPillars: ext.content_pillars, socialPlatforms: ext.social_media_platforms, marketingStrategy: ext.marketing_strategy,
    }
    let productsPayload: { id: string; name: string; usp: string }[] | null = null
    if (form.productMode === 'mixed') {
      productsPayload = availableProducts.map(p => ({ id: p.id, name: p.name, usp: p.product_brain_versions?.[0]?.usp || '' }))
    } else if (form.productMode === 'specific' && form.selectedProductIds.length > 0) {
      productsPayload = availableProducts.filter(p => form.selectedProductIds.includes(p.id)).map(p => ({ id: p.id, name: p.name, usp: p.product_brain_versions?.[0]?.usp || '' }))
    }
    try {
      const res = await fetch('/api/generate-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brandPayload, products: productsPayload, platform: form.platform,
          count: 1, dateFrom: topics[idx]?.publish_date || form.dateFrom,
          dateTo: form.dateTo, context: revisionContext,
          referenceSummary: referenceSummary || undefined,
          language: ext.content_language || 'Indonesian',
          workspace_id: workspaceId,
        })
      })
      const data = await res.json()
      if (data.success && data.topics[0]) {
        setTopics(prev => prev.map((t, i) => i === idx ? { ...data.topics[0], saved: false } : t))
      }
    } catch { alert('Regeneration failed') }
  }

  async function handleScrapeUrl() {
    if (!form.referenceUrl.trim()) return
    setScraping(true)
    setScrapeError('')
    setScrapeResult(null)
    setReferenceSummary('')
    try {
      const res = await fetch('/api/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.referenceUrl.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setScrapeResult(data.extracted)
        setReferenceSummary(data.contextString)
      } else {
        setScrapeError(data.error || 'Could not analyze this URL')
      }
    } catch {
      setScrapeError('Network error — check your connection')
    } finally {
      setScraping(false)
    }
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
                  <select value={form.brandId} onChange={e => { set('brandId')(e.target.value); set('selectedProductIds')([]); set('selectedPillars')([]) }}
                    style={{ width: '100%', appearance: 'none', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 32px 8px 12px', fontSize: 13, color: form.brandId ? 'var(--text-primary)' : 'var(--text-tertiary)', fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = 'var(--border-accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'}>
                    <option value="">Select a brand</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Product Mode */}
              {form.brandId && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Product</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['general', 'mixed', 'specific'] as const).map(mode => (
                      <button key={mode} onClick={() => set('productMode')(mode)} style={{
                        flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 11.5, fontWeight: 500,
                        cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s', textAlign: 'center',
                        border: form.productMode === mode ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                        background: form.productMode === mode ? 'rgba(91,71,157,0.12)' : 'var(--surface-3)',
                        color: form.productMode === mode ? 'var(--accent)' : 'var(--text-secondary)',
                      }}>
                        {mode === 'general' ? 'General' : mode === 'mixed' ? 'Mixed' : 'Specific'}
                      </button>
                    ))}
                  </div>
                  {form.productMode === 'mixed' && (
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
                      Topics distributed across all {availableProducts.length} product{availableProducts.length !== 1 ? 's' : ''}
                    </p>
                  )}
                  {form.productMode === 'specific' && availableProducts.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 140, overflowY: 'auto' }}>
                      {availableProducts.map(p => {
                        const checked = form.selectedProductIds.includes(p.id)
                        return (
                          <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-primary)', padding: '4px 6px', borderRadius: 6, background: checked ? 'rgba(91,71,157,0.08)' : 'transparent' }}>
                            <input type="checkbox" checked={checked} onChange={() => {
                              const ids = checked ? form.selectedProductIds.filter(id => id !== p.id) : [...form.selectedProductIds, p.id]
                              set('selectedProductIds')(ids)
                            }} style={{ accentColor: 'var(--accent)', width: 13, height: 13, cursor: 'pointer', flexShrink: 0 }} />
                            {p.name}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Pillar selection */}
              {ext.content_pillars.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
                      Content Pillars
                    </label>
                    {form.selectedPillars.length > 0 && (
                      <button onClick={() => set('selectedPillars')([])} style={{ fontSize: 10.5, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)', textDecoration: 'underline' }}>
                        All pillars
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {ext.content_pillars.map((p: string) => {
                      const color = pillarColor(p)
                      const active = form.selectedPillars.length === 0 || form.selectedPillars.includes(p)
                      const selected = form.selectedPillars.includes(p)
                      return (
                        <button key={p} onClick={() => {
                          const next = selected
                            ? form.selectedPillars.filter(x => x !== p)
                            : [...form.selectedPillars, p]
                          set('selectedPillars')(next)
                        }} style={{
                          fontSize: 11, padding: '3px 9px', borderRadius: 20, cursor: 'pointer',
                          fontFamily: 'var(--font-body)', fontWeight: selected ? 600 : 400,
                          border: `1px solid ${selected ? color : 'var(--border)'}`,
                          background: selected ? `${color}20` : active ? `${color}08` : 'var(--surface-3)',
                          color: active ? color : 'var(--text-tertiary)',
                          opacity: active ? 1 : 0.45,
                          transition: 'all 0.15s',
                        }}>
                          {p}
                        </button>
                      )
                    })}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.4 }}>
                    {form.selectedPillars.length === 0
                      ? 'All pillars will be used — click to restrict'
                      : `Generating topics for: ${form.selectedPillars.join(', ')}`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Context */}
          <div className="panel fade-up fade-up-3">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Link size={14} style={{ color: 'var(--text-secondary)' }} /> Reference & Context <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span>
              </span>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Reference URL</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="url"
                    value={form.referenceUrl}
                    onChange={e => { set('referenceUrl')(e.target.value); setScrapeResult(null); setScrapeError(''); setReferenceSummary('') }}
                    placeholder="https://…"
                    style={{ flex: 1, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none', minWidth: 0 }}
                    onFocus={e => e.target.style.borderColor = 'var(--border-accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    onKeyDown={e => e.key === 'Enter' && handleScrapeUrl()}
                  />
                  <button onClick={handleScrapeUrl} disabled={scraping || !form.referenceUrl.trim()} style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8,
                    fontSize: 12, fontWeight: 500, cursor: scraping || !form.referenceUrl.trim() ? 'not-allowed' : 'pointer',
                    background: scrapeResult ? 'rgba(16,185,129,0.12)' : 'rgba(91,71,157,0.12)',
                    border: scrapeResult ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--border-accent)',
                    color: scrapeResult ? '#10b981' : 'var(--accent)',
                    fontFamily: 'var(--font-body)', opacity: scraping || !form.referenceUrl.trim() ? 0.55 : 1, transition: 'all 0.15s'
                  }}>
                    {scraping ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : scrapeResult ? <CheckCircle2 size={12} /> : <Link size={12} />}
                    {scraping ? 'Analyzing…' : scrapeResult ? 'Analyzed' : 'Analyze'}
                  </button>
                </div>
                {scrapeError && (
                  <p style={{ fontSize: 11.5, color: 'var(--red)', margin: 0, lineHeight: 1.4 }}>{scrapeError}</p>
                )}
                {scrapeResult && (
                  <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#10b981' }}>
                          {scrapeResult.content_type?.replace(/_/g, ' ')}
                        </span>
                        <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35 }}>{scrapeResult.title}</p>
                      </div>
                      <button onClick={() => { setScrapeResult(null); setReferenceSummary(''); setScrapeError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2, lineHeight: 1, flexShrink: 0 }}>
                        <X size={12} />
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{scrapeResult.main_topic}</p>
                    {scrapeResult.content_angles?.length > 0 && (
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: 10.5, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Suggested angles</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {scrapeResult.content_angles.map((a, i) => (
                            <span key={i} style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}>· {a}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Direction / notes</label>
                <textarea
                  value={form.context}
                  onChange={e => set('context')(e.target.value)}
                  placeholder="E.g. Focus on upcoming Ramadan campaign, avoid competitor mentions…"
                  rows={3}
                  style={{ resize: 'vertical', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none', width: '100%', lineHeight: 1.5 }}
                  onFocus={e => e.target.style.borderColor = 'var(--border-accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>
          </div>

          {/* Platform & Objective */}
          <div className="panel fade-up fade-up-5">
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
                <input type="range" min={1} max={30} step={1} value={form.count} onChange={e => set('count')(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)' }}>
                  <span>1</span><span>15</span><span>30</span>
                </div>
              </div>
            </div>
          </div>

          <button className="btn btn-accent" onClick={handleGenerate} disabled={!canGenerate || loading}
            style={{ width: '100%', justifyContent: 'center', padding: 11, fontSize: 14 }}>
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
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{topics.length}</strong> topics for {selectedBrand?.name} · {form.platform}
                  {form.productMode === 'mixed' ? ' · Mixed products' : form.productMode === 'specific' && form.selectedProductIds.length > 0 ? ` · ${form.selectedProductIds.length} product${form.selectedProductIds.length > 1 ? 's' : ''}` : ''}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {topics.map((topic, idx) => {
                  // When exactly one product is in scope and the AI doesn't embed product_id
                  // (API only adds product_id to schema when products.length > 1), pass it as fallback
                  const defaultProductId =
                    form.productMode === 'specific' && form.selectedProductIds.length === 1
                      ? form.selectedProductIds[0]
                      : form.productMode === 'mixed' && availableProducts.length === 1
                      ? availableProducts[0].id
                      : ''
                  return (
                    <TopicCard
                      key={idx} topic={topic} onDelete={() => handleDelete(idx)}
                      onUpdate={updates => handleUpdateTopic(idx, updates)}
                      onRegenerate={ctx => handleRegenerateOne(idx, ctx)}
                      brandId={form.brandId}
                      platform={form.platform} objective={form.objective}
                      defaultProductId={defaultProductId}
                    />
                  )
                })}
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

const availableFormats = Object.keys(formatColors)

function TopicCard({ topic, onDelete, onUpdate, onRegenerate, brandId, platform, objective, defaultProductId }: {
  topic: Topic; onDelete: () => void
  onUpdate: (updates: Partial<Topic>) => void
  onRegenerate: (context: string) => Promise<void>
  brandId: string; platform: string; objective: string
  defaultProductId?: string
}) {
  const [regenOpen, setRegenOpen] = useState(false)
  const [regenContext, setRegenContext] = useState('')
  const [regenerating, setRegenerating] = useState(false)

  const fmtColor = formatColors[topic.content_format] || '#7c6dfa'
  const pColor = pillarColor(topic.content_pillar || '')

  // Use topic's own product_id if present; fall back to the contextual default
  const resolvedProductId = topic.product_id || defaultProductId || ''

  const generateUrl = `/generate?` + new URLSearchParams({
    topic: topic.content_title, format: topic.content_format || '',
    pillar: topic.content_pillar || '', platform, brandId,
    ...(objective ? { objective } : {}),
    ...(resolvedProductId ? { productId: resolvedProductId } : {})
  }).toString()

  async function handleRegen() {
    if (!regenContext.trim()) return
    setRegenerating(true)
    await onRegenerate(regenContext)
    setRegenerating(false)
    setRegenOpen(false)
    setRegenContext('')
  }

  const inputBase: React.CSSProperties = {
    background: 'transparent', border: 'none', outline: 'none', width: '100%',
    fontFamily: 'var(--font-body)', color: 'var(--text-primary)', padding: 0,
  }

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

      {/* Title — editable */}
      {topic.saved ? (
        <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.45, paddingRight: 20, margin: 0 }}>
          {topic.content_title}
        </p>
      ) : (
        <textarea
          value={topic.content_title}
          onChange={e => onUpdate({ content_title: e.target.value })}
          rows={2}
          style={{ ...inputBase, fontSize: 13.5, fontWeight: 600, lineHeight: 1.45, paddingRight: 20, resize: 'none', overflow: 'hidden' }}
          onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px' }}
        />
      )}

      {/* Meta row — editable */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Pillar */}
        {topic.saved ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 8px', borderRadius: 20, background: `${pColor}18`, border: `1px solid ${pColor}40`, color: pColor, fontWeight: 500, width: 'fit-content' }}>
            <Tag size={9} /> {topic.content_pillar}
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Tag size={10} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <input value={topic.content_pillar} onChange={e => onUpdate({ content_pillar: e.target.value })}
              placeholder="Content pillar"
              style={{ ...inputBase, fontSize: 12, padding: '2px 6px', borderRadius: 6, background: `${pColor}10`, border: `1px solid ${pColor}30`, color: pColor, fontWeight: 500 }} />
          </div>
        )}
        {/* Format */}
        {topic.saved ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 8px', borderRadius: 20, background: `${fmtColor}18`, border: `1px solid ${fmtColor}40`, color: fmtColor, fontWeight: 500, width: 'fit-content' }}>
            <Layout size={9} /> {topic.content_format}
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Layout size={10} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <select value={topic.content_format} onChange={e => onUpdate({ content_format: e.target.value })}
              style={{ fontSize: 12, padding: '2px 6px', borderRadius: 6, background: `${fmtColor}10`, border: `1px solid ${fmtColor}30`, color: fmtColor, fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none', appearance: 'none' }}>
              {availableFormats.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        )}
        {/* Date */}
        {topic.publish_date && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Calendar size={10} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            {topic.saved ? (
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {new Date(topic.publish_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            ) : (
              <input type="date" value={topic.publish_date} onChange={e => onUpdate({ publish_date: e.target.value })}
                style={{ fontSize: 11, padding: '2px 4px', borderRadius: 5, background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)', outline: 'none' }} />
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {topic.saved ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#10b981' }}>
            <CheckCircle2 size={12} /> Saved
          </div>
          <a href={generateUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-accent)', background: 'rgba(124,109,250,0.06)' }}>
            Generate Content <ArrowRight size={11} />
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a href={generateUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
            Generate <ArrowRight size={11} />
          </a>
          <button onClick={() => setRegenOpen(o => !o)} style={{
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, background: 'none', border: 'none',
            color: regenOpen ? 'var(--accent)' : 'var(--text-tertiary)', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)', transition: 'color 0.15s'
          }}>
            <RefreshCw size={11} /> Regen
          </button>
        </div>
      )}

      {/* Regen panel */}
      {regenOpen && !topic.saved && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <textarea
            value={regenContext}
            onChange={e => setRegenContext(e.target.value)}
            placeholder="What should be different? (e.g. make it more educational, focus on pricing…)"
            rows={2}
            autoFocus
            style={{ fontSize: 12, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 10px', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none', lineHeight: 1.5 }}
            onFocus={e => e.target.style.borderColor = 'var(--border-accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleRegen} disabled={regenerating || !regenContext.trim()} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '6px 10px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: regenerating || !regenContext.trim() ? 'not-allowed' : 'pointer',
              background: 'var(--accent)', color: '#fff', border: 'none', fontFamily: 'var(--font-body)',
              opacity: regenerating || !regenContext.trim() ? 0.55 : 1, transition: 'opacity 0.15s'
            }}>
              {regenerating ? <><RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> Regenerating…</> : <><RefreshCw size={11} /> Regenerate</>}
            </button>
            <button onClick={() => { setRegenOpen(false); setRegenContext('') }} style={{
              padding: '6px 10px', borderRadius: 7, fontSize: 12, background: 'var(--surface-3)',
              border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)'
            }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

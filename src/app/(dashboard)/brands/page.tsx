'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import {
  Brain, Plus, Trash2, X, Save, AlertCircle, Globe, Sparkles,
  Building2, Mic, Target, Layers, Shield, Check, ChevronRight, ExternalLink
} from 'lucide-react'

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Twitter/X', 'LinkedIn', 'Facebook']
const LANGUAGES = ['English', 'Indonesian', 'Bilingual (EN/ID)', 'Malay', 'Thai', 'Vietnamese', 'Tagalog', 'Other']

type ExtendedBrain = {
  website: string
  industry: string
  content_language: string
  social_media_platforms: string[]
  content_pillars: string[]
  marketing_strategy: string
  unique_selling_points: string
  dos: string[]
  donts: string[]
}

type BrandBrain = {
  id: string
  brand_personality: string
  tone_of_voice: string
  brand_promise: string
  brand_values: any
  audience_persona: any
  source_summary: string
  messaging_rules: any
}

type Brand = {
  id: string
  name: string
  slug: string
  category: string
  summary: string
  brain?: BrandBrain
}

const EMPTY_FORM = {
  name: '', category: '', summary: '',
  // Brain Voice
  tone_of_voice: '', brand_personality: '', content_language: 'English',
  social_media_platforms: [] as string[],
  // Brand DNA
  target_audience: '', brand_values: [] as string[], brand_promise: '', unique_selling_points: '',
  // Content Strategy
  content_pillars: [] as string[], marketing_strategy: '',
  // Extended
  website: '', industry: '',
  // Rules
  dos: [''] as string[], donts: [''] as string[],
}

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: Building2 },
  { id: 'voice', label: 'Brand Voice', icon: Mic },
  { id: 'dna', label: 'Brand DNA', icon: Brain },
  { id: 'strategy', label: 'Content Strategy', icon: Target },
  { id: 'rules', label: "Do's & Don'ts", icon: Shield },
]

export default function BrandsPage() {
  const { workspaceId } = useWorkspace()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  const [isOpen, setIsOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [activeSection, setActiveSection] = useState('overview')
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState('')
  const [valueInput, setValueInput] = useState('')

  useEffect(() => { if (workspaceId) loadBrands() }, [workspaceId])

  async function loadBrands() {
    setLoading(true)
    const wsId = workspaceId
    if (!wsId) { setLoading(false); return }

    // Heal orphaned brands (workspace_id = null) from before workspace setup
    await supabase.from('brands').update({ workspace_id: wsId }).is('workspace_id', null)

    const { data, error } = await supabase
      .from('brands')
      .select(`
        id, name, slug, category, summary,
        brand_brain_versions (
          id, brand_personality, tone_of_voice, brand_promise,
          brand_values, audience_persona, source_summary, messaging_rules
        )
      `)
      .eq('workspace_id', wsId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setBrands(data.map((b: any) => ({
        ...b,
        brain: b.brand_brain_versions?.[0] ?? undefined
      })))
    }
    setLoading(false)
  }

  function parseExt(brain?: BrandBrain): ExtendedBrain {
    const mr = (typeof brain?.messaging_rules === 'string'
      ? JSON.parse(brain.messaging_rules || '{}')
      : brain?.messaging_rules) || {}
    return {
      website: mr.website || '',
      industry: mr.industry || '',
      content_language: mr.content_language || 'English',
      social_media_platforms: mr.social_media_platforms || [],
      content_pillars: mr.content_pillars || [],
      marketing_strategy: mr.marketing_strategy || '',
      unique_selling_points: mr.unique_selling_points || '',
      dos: mr.dos?.length ? mr.dos : [''],
      donts: mr.donts?.length ? mr.donts : [''],
    }
  }

  function openNew() {
    setEditingBrand(null)
    setForm({ ...EMPTY_FORM, dos: [''], donts: [''] })
    setActiveSection('overview')
    setErrorMsg('')
    setScrapeError('')
    setValueInput('')
    setIsOpen(true)
  }

  function openEdit(brand: Brand) {
    const ext = parseExt(brand.brain)
    const bv = Array.isArray(brand.brain?.brand_values)
      ? brand.brain!.brand_values
      : typeof brand.brain?.brand_values === 'string'
        ? brand.brain!.brand_values.split(',').map((s: string) => s.trim()).filter(Boolean)
        : []
    const ap = typeof brand.brain?.audience_persona === 'string'
      ? brand.brain!.audience_persona
      : JSON.stringify(brand.brain?.audience_persona || '')

    setEditingBrand(brand)
    setForm({
      name: brand.name || '',
      category: brand.category || '',
      summary: brand.brain?.source_summary || brand.summary || '',
      tone_of_voice: brand.brain?.tone_of_voice || '',
      brand_personality: brand.brain?.brand_personality || '',
      content_language: ext.content_language,
      social_media_platforms: ext.social_media_platforms,
      target_audience: ap,
      brand_values: bv,
      brand_promise: brand.brain?.brand_promise || '',
      unique_selling_points: ext.unique_selling_points,
      content_pillars: ext.content_pillars,
      marketing_strategy: ext.marketing_strategy,
      website: ext.website,
      industry: ext.industry,
      dos: ext.dos.length ? ext.dos : [''],
      donts: ext.donts.length ? ext.donts : [''],
    })
    setValueInput('')
    setActiveSection('overview')
    setErrorMsg('')
    setScrapeError('')
    setIsOpen(true)
  }

  const setF = (k: keyof typeof EMPTY_FORM) => (v: any) => setForm(f => ({ ...f, [k]: v }))

  async function handleScrape() {
    if (!form.website) return
    setScraping(true)
    setScrapeError('')
    try {
      const res = await fetch('/api/scrape-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.website })
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setScrapeError(json.error || 'Scrape failed')
      } else {
        const d = json.data
        setForm(f => ({
          ...f,
          name: d.name || f.name,
          industry: d.industry || f.industry,
          summary: d.summary || f.summary,
          tone_of_voice: d.tone_of_voice || f.tone_of_voice,
          brand_personality: d.brand_personality || f.brand_personality,
          target_audience: d.target_audience || f.target_audience,
          brand_values: d.brand_values?.length ? d.brand_values : f.brand_values,
          brand_promise: d.brand_promise || f.brand_promise,
          unique_selling_points: d.unique_selling_points || f.unique_selling_points,
          content_pillars: d.content_pillars?.length ? d.content_pillars : f.content_pillars,
          social_media_platforms: d.social_media_platforms?.length ? d.social_media_platforms : f.social_media_platforms,
          content_language: d.content_language || f.content_language,
          marketing_strategy: d.marketing_strategy || f.marketing_strategy,
          dos: d.dos?.length ? d.dos : f.dos,
          donts: d.donts?.length ? d.donts : f.donts,
        }))
      }
    } catch {
      setScrapeError('Network error')
    }
    setScraping(false)
  }

  async function handleSave() {
    if (!form.name.trim()) { setErrorMsg('Brand name is required.'); return }
    setSaving(true)
    setErrorMsg('')

    const messagingRules = {
      website: form.website,
      industry: form.industry,
      content_language: form.content_language,
      social_media_platforms: form.social_media_platforms,
      content_pillars: form.content_pillars.filter(Boolean),
      marketing_strategy: form.marketing_strategy,
      unique_selling_points: form.unique_selling_points,
      dos: form.dos.filter(Boolean),
      donts: form.donts.filter(Boolean),
    }

    try {
      let brandId = editingBrand?.id

      if (editingBrand) {
        await supabase.from('brands').update({
          name: form.name, category: form.industry || form.category,
          summary: form.summary, updated_at: new Date().toISOString()
        }).eq('id', editingBrand.id)

        if (editingBrand.brain) {
          await supabase.from('brand_brain_versions').update({
            brand_personality: form.brand_personality,
            tone_of_voice: form.tone_of_voice,
            brand_promise: form.brand_promise,
            brand_values: form.brand_values,
            audience_persona: form.target_audience,
            source_summary: form.summary,
            messaging_rules: messagingRules,
          }).eq('id', editingBrand.brain.id)
        } else {
          await supabase.from('brand_brain_versions').insert({
            brand_id: editingBrand.id, workspace_id: workspaceId, version_no: 1,
            brand_personality: form.brand_personality, tone_of_voice: form.tone_of_voice,
            brand_promise: form.brand_promise, brand_values: form.brand_values,
            audience_persona: form.target_audience, source_summary: form.summary,
            messaging_rules: messagingRules, status: 'approved'
          })
        }
      } else {
        const slug = form.name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(Math.random() * 1000)
        const { data: bd, error: be } = await supabase.from('brands').insert({
          workspace_id: workspaceId, name: form.name, slug,
          category: form.industry || form.category, summary: form.summary, status: 'active'
        }).select().single()
        if (be) throw be
        brandId = bd.id

        await supabase.from('brand_brain_versions').insert({
          brand_id: brandId, workspace_id: workspaceId, version_no: 1,
          brand_personality: form.brand_personality, tone_of_voice: form.tone_of_voice,
          brand_promise: form.brand_promise, brand_values: form.brand_values,
          audience_persona: form.target_audience, source_summary: form.summary,
          messaging_rules: messagingRules, status: 'approved'
        })
      }

      await loadBrands()
      setIsOpen(false)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving brand')
    }
    setSaving(false)
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this brand? All associated products and content will also be deleted.')) return
    await supabase.from('brands').delete().eq('id', id)
    setBrands(brands.filter(b => b.id !== id))
  }

  // Tag helpers
  function addValue(val: string) {
    const v = val.trim()
    if (v && !form.brand_values.includes(v)) setF('brand_values')([...form.brand_values, v])
    setValueInput('')
  }
  function removeValue(v: string) { setF('brand_values')(form.brand_values.filter(x => x !== v)) }
  function togglePlatform(p: string) {
    setF('social_media_platforms')(
      form.social_media_platforms.includes(p)
        ? form.social_media_platforms.filter(x => x !== p)
        : [...form.social_media_platforms, p]
    )
  }
  function addPillar() { setF('content_pillars')([...form.content_pillars, '']) }
  function setPillar(i: number, v: string) { const arr = [...form.content_pillars]; arr[i] = v; setF('content_pillars')(arr) }
  function removePillar(i: number) { setF('content_pillars')(form.content_pillars.filter((_, j) => j !== i)) }
  function setDo(i: number, v: string) { const a = [...form.dos]; a[i] = v; setF('dos')(a) }
  function addDo() { setF('dos')([...form.dos, '']) }
  function removeDo(i: number) { setF('dos')(form.dos.filter((_, j) => j !== i)) }
  function setDont(i: number, v: string) { const a = [...form.donts]; a[i] = v; setF('donts')(a) }
  function addDont() { setF('donts')([...form.donts, '']) }
  function removeDont(i: number) { setF('donts')(form.donts.filter((_, j) => j !== i)) }

  // --- Card brand brain preview ---
  function getBrainExt(brand: Brand) {
    return parseExt(brand.brain)
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header page-header-row fade-up fade-up-1">
        <div>
          <h1 className="page-title">Brand Brain</h1>
          <p className="page-subtitle">Each brand's DNA — the source of truth for all content generation.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={15} /> Add Brand
        </button>
      </div>

      {/* Grid */}
      <div className="fade-up fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {loading ? (
          <div style={{ color: 'var(--text-tertiary)', padding: 20 }}>Loading brands...</div>
        ) : brands.length === 0 ? (
          <div style={{ gridColumn: '1/-1', padding: 48, textAlign: 'center', background: 'var(--surface-2)', borderRadius: 14, border: '1px dashed var(--border)' }}>
            <Brain size={36} style={{ color: 'var(--text-tertiary)', margin: '0 auto 14px' }} />
            <h3 style={{ fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>No Brands Yet</h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginBottom: 20 }}>Add your first brand to unlock content generation.</p>
            <button className="btn btn-primary" style={{ margin: '0 auto' }} onClick={openNew}>Create Brand</button>
          </div>
        ) : brands.map(brand => {
          const ext = getBrainExt(brand)
          return (
            <div key={brand.id} className="panel" style={{ cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}
              onClick={() => openEdit(brand)}>
              <button onClick={e => handleDelete(brand.id, e)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4, zIndex: 10 }} title="Delete">
                <Trash2 size={13} />
              </button>

              <div style={{ padding: '20px 20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,var(--accent),#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-display)', flexShrink: 0 }}>
                    {brand.name.charAt(0)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{brand.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{ext.industry || brand.category || 'No industry set'}</div>
                  </div>
                </div>

                {ext.website && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--accent)', marginBottom: 10 }}>
                    <Globe size={11} />{ext.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </div>
                )}

                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {brand.brain?.source_summary || brand.summary || 'No summary yet.'}
                </p>
              </div>

              {/* Brain matrix */}
              <div style={{ background: 'var(--surface-3)', margin: '0 12px 12px', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                  <Brain size={11} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>Brand DNA</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Tone', val: brand.brain?.tone_of_voice },
                    { label: 'Personality', val: brand.brain?.brand_personality },
                    { label: 'Language', val: ext.content_language },
                    { label: 'Pillars', val: ext.content_pillars.length ? `${ext.content_pillars.length} defined` : null },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 12, color: val ? 'var(--text-primary)' : 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platforms */}
              {ext.social_media_platforms.length > 0 && (
                <div style={{ padding: '0 12px 14px', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {ext.social_media_platforms.map(p => (
                    <span key={p} style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 20, background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--border-accent)', fontWeight: 500 }}>{p}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Drawer */}
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}
          onClick={() => setIsOpen(false)}>
          <div style={{ width: '100%', maxWidth: 820, background: 'var(--surface-1)', height: '100vh', display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 60px rgba(0,0,0,0.5)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            {/* Drawer header */}
            <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                  {editingBrand ? `Edit: ${editingBrand.name}` : 'New Brand Brain'}
                </h2>
                <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 2 }}>Define your brand's DNA for AI-powered content generation.</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setIsOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : <><Save size={14} /> Save Brand</>}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div style={{ margin: '12px 28px 0', padding: 10, background: 'var(--red-alpha, rgba(244,63,94,0.1))', border: '1px solid var(--red)', borderRadius: 8, color: 'var(--red)', fontSize: 12.5, display: 'flex', gap: 7, alignItems: 'center', flexShrink: 0 }}>
                <AlertCircle size={13} /> {errorMsg}
              </div>
            )}

            {/* Body: sidebar + content */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Section nav */}
              <div style={{ width: 180, borderRight: '1px solid var(--border)', padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0, overflowY: 'auto' }}>
                {SECTIONS.map(s => {
                  const Icon = s.icon
                  const active = activeSection === s.id
                  return (
                    <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 8,
                      border: active ? '1px solid var(--border-accent)' : '1px solid transparent',
                      background: active ? 'var(--accent-subtle)' : 'none',
                      color: active ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer',
                      fontFamily: 'var(--font-body)', textAlign: 'left', width: '100%', transition: 'all 0.15s'
                    }}>
                      <Icon size={14} style={{ flexShrink: 0 }} />
                      {s.label}
                    </button>
                  )
                })}
              </div>

              {/* Section content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

                {/* ── OVERVIEW ── */}
                {activeSection === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <SectionTitle icon={Globe} title="Website" subtitle="Enter the brand website URL to auto-fill brand information using AI." />

                    <div style={{ display: 'flex', gap: 10 }}>
                      <input className="form-input" style={{ flex: 1 }} value={form.website}
                        onChange={e => setF('website')(e.target.value)}
                        placeholder="https://brand.com"
                        onKeyDown={e => e.key === 'Enter' && handleScrape()} />
                      <button className="btn btn-secondary" onClick={handleScrape} disabled={!form.website || scraping} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {scraping ? <><div className="loading-spinner" style={{ width: 13, height: 13 }} /> Scanning…</> : <><Sparkles size={13} /> Auto-fill from Website</>}
                      </button>
                    </div>
                    {scrapeError && (
                      <div style={{ fontSize: 12, color: 'var(--red)', display: 'flex', gap: 6, alignItems: 'center' }}>
                        <AlertCircle size={12} /> {scrapeError}
                      </div>
                    )}

                    <Divider />
                    <SectionTitle icon={Building2} title="Brand Info" subtitle="Core identity of this brand." />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div className="form-group">
                        <label className="form-label">Brand Name *</label>
                        <input className="form-input" value={form.name} onChange={e => setF('name')(e.target.value)} placeholder="e.g. TableCheck" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Industry</label>
                        <input className="form-input" value={form.industry} onChange={e => setF('industry')(e.target.value)} placeholder="e.g. SaaS, F&B, Fashion, Healthcare" />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Brand Summary</label>
                      <textarea className="form-input" rows={4} value={form.summary} onChange={e => setF('summary')(e.target.value)}
                        placeholder="What does this brand do? Who do they serve? What's their mission? This becomes the AI's core understanding of the brand." />
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Auto-filled from website scan, or write manually.</div>
                    </div>
                  </div>
                )}

                {/* ── BRAND VOICE ── */}
                {activeSection === 'voice' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <SectionTitle icon={Mic} title="Brand Voice" subtitle="How this brand communicates — guides tone in every generated piece." />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div className="form-group">
                        <label className="form-label">Tone of Voice</label>
                        <input className="form-input" value={form.tone_of_voice} onChange={e => setF('tone_of_voice')(e.target.value)}
                          placeholder="e.g. Professional, Friendly, Bold, Empathetic" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Brand Personality</label>
                        <input className="form-input" value={form.brand_personality} onChange={e => setF('brand_personality')(e.target.value)}
                          placeholder="e.g. The Trusted Expert, The Bold Disruptor" />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Content Language</label>
                      <select className="form-input" value={form.content_language} onChange={e => setF('content_language')(e.target.value)}>
                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Social Media Platforms</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                        {PLATFORMS.map(p => {
                          const active = form.social_media_platforms.includes(p)
                          return (
                            <button key={p} onClick={() => togglePlatform(p)} style={{
                              padding: '6px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 500,
                              cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-body)',
                              background: active ? 'var(--accent)' : 'var(--surface-3)',
                              color: active ? 'white' : 'var(--text-secondary)',
                              border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                            }}>{active && <Check size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />}{p}</button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── BRAND DNA ── */}
                {activeSection === 'dna' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <SectionTitle icon={Brain} title="Brand DNA" subtitle="The core beliefs, audience, and unique position of this brand." />

                    <div className="form-group">
                      <label className="form-label">Target Audience</label>
                      <textarea className="form-input" rows={3} value={form.target_audience} onChange={e => setF('target_audience')(e.target.value)}
                        placeholder="Who is this brand for? Age, role, pain points, goals, lifestyle…" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Brand Values</label>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <input className="form-input" style={{ flex: 1 }} value={valueInput} onChange={e => setValueInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addValue(valueInput) } }}
                          placeholder="Type a value and press Enter (e.g. Innovation)" />
                        <button className="btn btn-secondary" onClick={() => addValue(valueInput)} style={{ flexShrink: 0 }}>Add</button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {form.brand_values.map(v => (
                          <span key={v} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--border-accent)', fontSize: 12.5 }}>
                            {v}
                            <button onClick={() => removeValue(v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', lineHeight: 1, padding: 0, fontSize: 14 }}>×</button>
                          </span>
                        ))}
                        {!form.brand_values.length && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No values added yet.</span>}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Brand Promise</label>
                      <input className="form-input" value={form.brand_promise} onChange={e => setF('brand_promise')(e.target.value)}
                        placeholder="e.g. We help restaurants fill seats and delight guests." />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Unique Selling Points</label>
                      <textarea className="form-input" rows={3} value={form.unique_selling_points} onChange={e => setF('unique_selling_points')(e.target.value)}
                        placeholder="What makes this brand stand out? Key differentiators vs. competitors…" />
                    </div>
                  </div>
                )}

                {/* ── CONTENT STRATEGY ── */}
                {activeSection === 'strategy' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <SectionTitle icon={Layers} title="Content Strategy" subtitle="The recurring themes and approach that shape all content." />

                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        Content Pillars
                        <button onClick={addPillar} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0 }}>+ Add Pillar</button>
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                        {form.content_pillars.map((p, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8 }}>
                            <input className="form-input" style={{ flex: 1 }} value={p} onChange={e => setPillar(i, e.target.value)}
                              placeholder={`Pillar ${i + 1} (e.g. Product Education)`} />
                            <button onClick={() => removePillar(i)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '0 4px' }}>
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        {!form.content_pillars.length && (
                          <button className="btn btn-secondary" onClick={addPillar} style={{ alignSelf: 'flex-start' }}>
                            <Plus size={13} /> Add First Pillar
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>Content pillars define the recurring themes the brand consistently communicates about.</div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Marketing Strategy</label>
                      <textarea className="form-input" rows={4} value={form.marketing_strategy} onChange={e => setF('marketing_strategy')(e.target.value)}
                        placeholder="Describe the overall marketing approach, focus areas, campaign types, funnel strategy…" />
                    </div>
                  </div>
                )}

                {/* ── DO'S & DON'TS ── */}
                {activeSection === 'rules' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <SectionTitle icon={Shield} title="Content Rules" subtitle="Hard rules the AI will always follow when generating content for this brand." />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                      {/* Do's */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Check size={13} /> Do's
                          </label>
                          <button onClick={addDo} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0 }}>+ Add</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {form.dos.map((d, i) => (
                            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                              <input className="form-input" style={{ flex: 1, fontSize: 13 }} value={d} onChange={e => setDo(i, e.target.value)}
                                placeholder="e.g. Always lead with a benefit" />
                              <button onClick={() => removeDo(i)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '0 2px' }}>
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Don'ts */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <X size={13} /> Don'ts
                          </label>
                          <button onClick={addDont} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0 }}>+ Add</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {form.donts.map((d, i) => (
                            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
                              <input className="form-input" style={{ flex: 1, fontSize: 13 }} value={d} onChange={e => setDont(i, e.target.value)}
                                placeholder="e.g. Never use aggressive sales language" />
                              <button onClick={() => removeDont(i)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '0 2px' }}>
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section navigation footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                  {SECTIONS.findIndex(s => s.id === activeSection) > 0 ? (
                    <button className="btn btn-secondary" onClick={() => setActiveSection(SECTIONS[SECTIONS.findIndex(s => s.id === activeSection) - 1].id)}>
                      ← Previous
                    </button>
                  ) : <div />}
                  {SECTIONS.findIndex(s => s.id === activeSection) < SECTIONS.length - 1 ? (
                    <button className="btn btn-primary" onClick={() => setActiveSection(SECTIONS[SECTIONS.findIndex(s => s.id === activeSection) + 1].id)}>
                      Next <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : <><Save size={14} /> Save Brand</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={15} style={{ color: 'var(--accent)' }} /> {title}
      </h3>
      <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 3 }}>{subtitle}</p>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
}

'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import {
  Megaphone, Plus, Brain, Package, Target, Calendar,
  DollarSign, Layers, Copy, Save, Check, AlertCircle,
  ChevronDown, ChevronRight, Sparkles, Clock, CheckCircle2, XCircle
} from 'lucide-react'

type Brand = { id: string; name: string; category: string; brain?: any }
type Product = { id: string; name: string; brand_id: string; brain?: any }

const CHANNELS = ['Instagram', 'TikTok', 'YouTube', 'Twitter/X', 'LinkedIn', 'Facebook']
const OBJECTIVES = ['Brand Awareness', 'Product Launch', 'Engagement', 'Lead Generation', 'Conversion', 'Retention', 'Event Promotion']

function CampaignsContent() {
  const { workspaceId } = useWorkspace()
  const searchParams = useSearchParams()
  const preselectedBrandId = searchParams.get('brandId') || ''
  const preselectedProductId = searchParams.get('productId') || ''
  const [brands, setBrands] = useState<Brand[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Form
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [form, setForm] = useState({
    name: '',
    objective: '',
    audienceSegment: '',
    flightStart: '',
    flightEnd: '',
    budgetRange: '',
    keyMessage: '',
    channelMix: [] as string[],
    culturalContext: ''
  })

  // Output
  const [generating, setGenerating] = useState(false)
  const [output, setOutput] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => { if (workspaceId) loadData() }, [workspaceId])

  async function loadData() {
    setLoading(true)
    const wsId = workspaceId
    if (!wsId) { setLoading(false); return }

    const [brandsRes, productsRes, campaignsRes] = await Promise.all([
      supabase.from('brands').select('id, name, category, brand_brain_versions(brand_personality, tone_of_voice, brand_promise, target_audience)').eq('workspace_id', wsId).order('name'),
      supabase.from('products').select('id, name, brand_id, product_brain_versions(usp, emotional_benefits, target_audience)').eq('workspace_id', wsId).order('name'),
      supabase.from('campaigns').select(`id, name, objective, status, created_at, brands(name), products(name), campaign_outputs(big_idea, campaign_theme, status)`).eq('workspace_id', wsId).order('created_at', { ascending: false })
    ])

    if (brandsRes.data) {
      const parsedBrands = brandsRes.data.map((b: any) => ({ ...b, brain: b.brand_brain_versions?.[0] }))
      setBrands(parsedBrands)
      if (preselectedBrandId) {
        const match = parsedBrands.find((b: any) => b.id === preselectedBrandId)
        if (match) setSelectedBrand(match)
      }
    }
    if (productsRes.data) {
      const parsedProducts = productsRes.data.map((p: any) => ({ ...p, brain: p.product_brain_versions?.[0] }))
      setProducts(parsedProducts)
      if (preselectedProductId) {
        const match = parsedProducts.find((p: any) => p.id === preselectedProductId)
        if (match) setSelectedProduct(match)
      }
    }
    if (campaignsRes.data) setCampaigns(campaignsRes.data)
    setLoading(false)
  }

  const filteredProducts = selectedBrand
    ? products.filter(p => p.brand_id === selectedBrand.id)
    : products

  const toggleChannel = (ch: string) => {
    setForm(f => ({
      ...f,
      channelMix: f.channelMix.includes(ch)
        ? f.channelMix.filter(c => c !== ch)
        : [...f.channelMix, ch]
    }))
  }

  const handleGenerate = async () => {
    if (!selectedBrand || !selectedProduct || !form.name || !form.objective) {
      setErrorMsg('Please fill in brand, product, campaign name, and objective.')
      return
    }
    setGenerating(true)
    setErrorMsg('')
    setOutput(null)
    setSaved(false)

    try {
      const res = await fetch('/api/generate-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: {
            name: selectedBrand.name,
            category: selectedBrand.category,
            personality: selectedBrand.brain?.brand_personality,
            toneOfVoice: selectedBrand.brain?.tone_of_voice,
            brandPromise: selectedBrand.brain?.brand_promise,
            audience: selectedBrand.brain?.target_audience,
          },
          product: {
            name: selectedProduct.name,
            usp: selectedProduct.brain?.usp,
            emotionalBenefits: selectedProduct.brain?.emotional_benefits,
            targetAudience: selectedProduct.brain?.target_audience,
          },
          campaignName: form.name,
          objective: form.objective,
          audienceSegment: form.audienceSegment,
          flightStart: form.flightStart,
          flightEnd: form.flightEnd,
          budgetRange: form.budgetRange,
          keyMessage: form.keyMessage,
          channelMix: form.channelMix,
          culturalContext: form.culturalContext,
          workspace_id: workspaceId
        })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Generation failed.')
      } else {
        setOutput(data.output)
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
    }
    setGenerating(false)
  }

  const handleSave = async () => {
    if (!output || !selectedBrand || !selectedProduct) return
    setSaving(true)
    try {
      const { data: campaignData, error: campaignErr } = await supabase.from('campaigns').insert({
        workspace_id: workspaceId,
        brand_id: selectedBrand.id,
        product_id: selectedProduct.id,
        name: form.name,
        objective: form.objective,
        audience_segment: form.audienceSegment,
        flight_start: form.flightStart || null,
        flight_end: form.flightEnd || null,
        budget_range: form.budgetRange,
        key_message: form.keyMessage,
        channel_mix: form.channelMix,
        cultural_context: form.culturalContext,
        status: 'draft'
      }).select().single()

      if (campaignErr) throw campaignErr

      await supabase.from('campaign_outputs').insert({
        campaign_id: campaignData.id,
        version_no: 1,
        big_idea: output.big_idea,
        campaign_theme: output.campaign_theme,
        message_pillars: output.message_pillars,
        audience_insight: output.audience_insight,
        funnel_journey: output.funnel_journey,
        channel_role_mapping: output.channel_role_mapping,
        deliverables_recommendation: output.deliverables_recommendation,
        kpi_recommendation: output.kpi_recommendation,
        rationale: output.rationale,
        status: 'draft'
      })

      setSaved(true)
      await loadData()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving campaign')
    }
    setSaving(false)
  }

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  function CopyBtn({ id, text }: { id: string; text: string }) {
    return (
      <button onClick={() => copy(id, text)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedKey === id ? 'var(--green)' : 'var(--text-tertiary)', padding: 4 }}>
        {copiedKey === id ? <Check size={13} /> : <Copy size={13} />}
      </button>
    )
  }

  function StatusPill({ status }: { status: string }) {
    const map: Record<string, { cls: string; label: string; Icon: typeof CheckCircle2 }> = {
      approved: { cls: 'status-approved', label: 'Approved', Icon: CheckCircle2 },
      draft: { cls: 'status-draft', label: 'Draft', Icon: Clock },
      archived: { cls: 'status-rejected', label: 'Archived', Icon: XCircle },
    }
    const { cls, label, Icon } = map[status] ?? map.draft
    return (
      <span className={`status-pill ${cls}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon size={10} />{label}
      </span>
    )
  }

  const canGenerate = selectedBrand && selectedProduct && form.name && form.objective && !generating

  return (
    <div>
      <div className="page-header page-header-row fade-up fade-up-1">
        <div>
          <h1 className="page-title">Campaign Generator</h1>
          <p className="page-subtitle">Generate full campaign strategy briefs powered by your Brand and Product Brains.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 20, alignItems: 'start' }} className="fade-up fade-up-2">
        {/* Left: Setup form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Brand + Product */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Brain size={14} style={{ color: 'var(--accent)' }} /> Context
              </span>
            </div>
            <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Brand *</label>
                <select className="form-input" value={selectedBrand?.id || ''} onChange={e => {
                  const b = brands.find(x => x.id === e.target.value) || null
                  setSelectedBrand(b)
                  setSelectedProduct(null)
                }}>
                  <option value="">Select brand...</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Product *</label>
                <select className="form-input" value={selectedProduct?.id || ''} onChange={e => setSelectedProduct(filteredProducts.find(x => x.id === e.target.value) || null)} disabled={!selectedBrand}>
                  <option value="">{selectedBrand ? 'Select product...' : 'Select a brand first'}</option>
                  {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {selectedBrand && (
                <div style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent)' }}>Brand Brain</div>
                  <div>{selectedBrand.brain?.tone_of_voice || 'No tone configured'}</div>
                  {selectedProduct?.brain?.usp && <div style={{ marginTop: 4, color: 'var(--text-tertiary)' }}>USP: {selectedProduct.brain.usp}</div>}
                </div>
              )}
            </div>
          </div>

          {/* Campaign details */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Target size={14} style={{ color: 'var(--text-secondary)' }} /> Campaign Details
              </span>
            </div>
            <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Campaign Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ramadan 2025 Launch" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Objective *</label>
                <select className="form-input" value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}>
                  <option value="">Select objective...</option>
                  {OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Target Audience Segment</label>
                <input className="form-input" value={form.audienceSegment} onChange={e => setForm(f => ({ ...f, audienceSegment: e.target.value }))} placeholder="e.g. Urban millennials 25-34" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Flight Start</label>
                  <input className="form-input" type="date" value={form.flightStart} onChange={e => setForm(f => ({ ...f, flightStart: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Flight End</label>
                  <input className="form-input" type="date" value={form.flightEnd} onChange={e => setForm(f => ({ ...f, flightEnd: e.target.value }))} />
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Budget Range</label>
                <input className="form-input" value={form.budgetRange} onChange={e => setForm(f => ({ ...f, budgetRange: e.target.value }))} placeholder="e.g. $5,000 – $10,000" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Key Message</label>
                <textarea className="form-input" rows={2} value={form.keyMessage} onChange={e => setForm(f => ({ ...f, keyMessage: e.target.value }))} placeholder="The one thing the audience should take away..." />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Channel Mix</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {CHANNELS.map(ch => (
                    <button key={ch} onClick={() => toggleChannel(ch)} style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                      background: form.channelMix.includes(ch) ? 'var(--accent)' : 'var(--surface-3)',
                      color: form.channelMix.includes(ch) ? 'white' : 'var(--text-secondary)',
                      border: form.channelMix.includes(ch) ? '1px solid var(--accent)' : '1px solid var(--border)'
                    }}>
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Cultural Context</label>
                <input className="form-input" value={form.culturalContext} onChange={e => setForm(f => ({ ...f, culturalContext: e.target.value }))} placeholder="e.g. Ramadan season, back-to-school" />
              </div>
            </div>
          </div>

          {errorMsg && (
            <div style={{ padding: 12, background: 'var(--red-alpha)', border: '1px solid var(--red)', borderRadius: 8, color: 'var(--red)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertCircle size={14} /> {errorMsg}
            </div>
          )}

          <button className="btn btn-primary" onClick={handleGenerate} disabled={!canGenerate} style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14 }}>
            {generating ? (
              <><div className="loading-spinner" style={{ width: 16, height: 16, marginRight: 8 }} /> Generating Brief...</>
            ) : (
              <><Sparkles size={15} /> Generate Campaign Brief</>
            )}
          </button>
        </div>

        {/* Right: Output */}
        <div>
          {!output && !generating && (
            <div style={{ padding: 60, textAlign: 'center', background: 'var(--surface-2)', borderRadius: 12, border: '1px dashed var(--border)', color: 'var(--text-tertiary)' }}>
              <Megaphone size={32} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
              <p style={{ fontSize: 14 }}>Fill in the campaign details and generate your strategy brief.</p>
            </div>
          )}

          {generating && (
            <div style={{ padding: 60, textAlign: 'center', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Crafting your campaign strategy...</p>
            </div>
          )}

          {output && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn btn-secondary" onClick={handleGenerate} disabled={generating}>
                  <Sparkles size={13} /> Regenerate
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving || saved}
                  style={saved ? { background: 'var(--green)', borderColor: 'var(--green)' } : {}}
                >
                  {saved ? <><Check size={13} /> Saved!</> : saving ? 'Saving...' : <><Save size={13} /> Save Campaign</>}
                </button>
              </div>

              {/* Big Idea */}
              <div className="panel">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>Big Idea</span>
                  <CopyBtn id="big_idea" text={output.big_idea || ''} />
                </div>
                <div style={{ padding: '16px 20px' }}>
                  <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, fontFamily: 'var(--font-display)' }}>{output.big_idea}</p>
                  {output.campaign_theme && (
                    <p style={{ marginTop: 8, fontSize: 14, color: 'var(--accent)', fontStyle: 'italic' }}>"{output.campaign_theme}"</p>
                  )}
                </div>
              </div>

              {/* Message Pillars */}
              {output.message_pillars?.length > 0 && (
                <div className="panel">
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>Message Pillars</span>
                  </div>
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {output.message_pillars.map((p: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', minWidth: 20, paddingTop: 2 }}>0{i + 1}</span>
                        <span style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audience Insight */}
              {output.audience_insight && (
                <div className="panel">
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>Audience Insight</span>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>"{output.audience_insight}"</p>
                  </div>
                </div>
              )}

              {/* Funnel Journey + Channel Mapping side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {output.funnel_journey && (
                  <div className="panel">
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>Funnel Journey</span>
                    </div>
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {Object.entries(output.funnel_journey).map(([stage, desc]: [string, any]) => (
                        <div key={stage}>
                          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'capitalize', color: 'var(--accent)', marginBottom: 3 }}>{stage}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {output.channel_role_mapping && (
                  <div className="panel">
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>Channel Roles</span>
                    </div>
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {Object.entries(output.channel_role_mapping).map(([ch, role]: [string, any]) => (
                        <div key={ch}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 3 }}>{ch}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{role}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Deliverables + KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {output.deliverables_recommendation?.length > 0 && (
                  <div className="panel">
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>Deliverables</span>
                    </div>
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {output.deliverables_recommendation.map((d: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <ChevronRight size={12} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {output.kpi_recommendation?.length > 0 && (
                  <div className="panel">
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>KPIs</span>
                    </div>
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {output.kpi_recommendation.map((k: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <ChevronRight size={12} style={{ color: '#22d3a0', marginTop: 2, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{k}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rationale */}
              {output.rationale && (
                <div className="panel">
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)' }}>Rationale</span>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.7 }}>{output.rationale}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Past campaigns */}
      {campaigns.length > 0 && (
        <div className="panel fade-up fade-up-3" style={{ marginTop: 28 }}>
          <div className="panel-header">
            <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Layers size={14} style={{ color: 'var(--text-secondary)' }} /> Past Campaigns
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Campaign', 'Brand', 'Objective', 'Big Idea', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-tertiary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c: any) => {
                const campaignOutput = c.campaign_outputs?.[0]
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                    <td style={{ padding: '12px 20px', color: 'var(--text-secondary)' }}>
                      {Array.isArray(c.brands) ? c.brands[0]?.name : c.brands?.name ?? '—'}
                    </td>
                    <td style={{ padding: '12px 20px', color: 'var(--text-secondary)' }}>{c.objective}</td>
                    <td style={{ padding: '12px 20px', color: 'var(--text-tertiary)', maxWidth: 240 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {campaignOutput?.big_idea || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <StatusPill status={c.status} />
                    </td>
                    <td style={{ padding: '12px 20px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function CampaignsPage() {
  return (
    <Suspense>
      <CampaignsContent />
    </Suspense>
  )
}

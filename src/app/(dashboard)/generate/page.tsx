'use client'
import { useState, useEffect } from 'react'
import {
  Zap, ChevronDown, Sparkles, Copy, RefreshCw,
  CheckCircle2, Hash, Image, MessageSquare, ArrowRight,
  ToggleLeft, ToggleRight, Info, Brain, Package, Save
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

const platforms = ['Instagram', 'TikTok', 'YouTube', 'Twitter/X', 'LinkedIn', 'Facebook']
const objectives = ['Awareness', 'Engagement', 'Education', 'Conversion', 'Retention']
const frameworks = ['PAS', 'AIDA', 'BAB']
const hookTypes = ['Curiosity', 'Pain Point', 'Bold Claim', 'Social Proof', 'Story']
const toneVariations = ['Default brand tone', 'Playful-Bold', 'Warm-Expert', 'Direct-Urgent', 'Soft-Empathetic']
const visualStyles = ['Editorial', 'Lifestyle', 'Minimal', 'Energetic', 'Luxury', 'Raw/Authentic']
const outputLengths = ['Short (caption)', 'Medium (post)', 'Long (thread/script)']

const platformColors: Record<string, string> = {
  Instagram: '#e1306c', TikTok: '#aaa', YouTube: '#ff0000',
  'Twitter/X': '#1d9bf0', LinkedIn: '#0a66c2', Facebook: '#1877f2'
}

type DBBrand = {
  id: string; name: string;
  brand_brain_versions: {
    tone_of_voice: string; brand_personality: string; brand_values: any;
    brand_promise: string; source_summary: string; audience_persona: any; messaging_rules: any
  }[]
}

function parseExt(raw: any) {
  try {
    const d = typeof raw === 'string' ? JSON.parse(raw) : (raw || {})
    return {
      industry: d.industry || '',
      website: d.website || '',
      content_language: d.content_language || 'English',
      social_media_platforms: d.social_media_platforms || [],
      content_pillars: d.content_pillars || [],
      marketing_strategy: d.marketing_strategy || '',
      unique_selling_points: d.unique_selling_points || '',
      dos: d.dos || [],
      donts: d.donts || []
    }
  } catch { return { industry: '', website: '', content_language: 'English', social_media_platforms: [], content_pillars: [], marketing_strategy: '', unique_selling_points: '', dos: [], donts: [] } }
}

type DBProduct = {
  id: string; brand_id: string; name: string;
  product_brain_versions: { usp: string; functional_benefits: any }[]
}

export default function GeneratePage() {
  const [advancedMode, setAdvancedMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [savingLibrary, setSavingLibrary] = useState(false)
  const [librarySaved, setLibrarySaved] = useState(false)
  
  const [output, setOutput] = useState<null | {
    hook: string; main_copy: string; cta_options: string[];
    hashtag_pack: string[]; visual_direction: string; rationale: string
  }>(null)
  const [usage, setUsage] = useState<null | Record<string, number>>(null)

  const [form, setForm] = useState({
    brandId: '', productId: '', platform: '', objective: '',
    framework: '', hookType: '', tone: '', visualStyle: '',
    outputLength: '', additionalContext: ''
  })
  
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [brands, setBrands] = useState<DBBrand[]>([])
  const [products, setProducts] = useState<DBProduct[]>([])

  useEffect(() => {
    async function initData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: roles } = await supabase.from('user_workspace_roles').select('workspace_id').eq('user_id', user.id).limit(1)
      if (roles?.[0]) {
        const wsId = roles[0].workspace_id
        setWorkspaceId(wsId)
        
        // Fetch Brands
        const { data: bData } = await supabase.from('brands').select('id, name, brand_brain_versions(tone_of_voice, brand_personality, brand_values, brand_promise, source_summary, audience_persona, messaging_rules)').eq('workspace_id', wsId)
        if (bData) setBrands(bData as DBBrand[])
        
        // Fetch Products
        const { data: pData } = await supabase.from('products').select('id, brand_id, name, product_brain_versions(usp, functional_benefits)').eq('workspace_id', wsId)
        if (pData) setProducts(pData as DBProduct[])
      }
    }
    initData()
  }, [])

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const selectedBrand = brands.find(b => b.id === form.brandId)
  const availableProducts = products.filter(p => p.brand_id === form.brandId)
  const selectedProduct = availableProducts.find(p => p.id === form.productId)

  const isGeneralMode = form.productId === '__general__'
  const canGenerate = form.brandId && form.productId && form.platform && form.objective

  // Safe extractors for the UI and API payload mapping
  const toneVoice = selectedBrand?.brand_brain_versions?.[0]?.tone_of_voice || 'Standard Professional'
  const brainUSP = isGeneralMode ? 'Brand-level content' : (selectedProduct?.product_brain_versions?.[0]?.usp || 'Premium Quality')

  async function handleGenerate() {
    if (!canGenerate || !selectedBrand) return
    setLoading(true)
    setOutput(null)
    setLibrarySaved(false)

    try {
      const brain = selectedBrand.brand_brain_versions?.[0]
      const ext = parseExt(brain?.messaging_rules)
      const promptBrandPayload = {
        name: selectedBrand.name,
        industry: ext.industry,
        website: ext.website,
        brandSummary: brain?.source_summary || '',
        toneOfVoice: toneVoice,
        personality: brain?.brand_personality || '',
        brandPromise: brain?.brand_promise || '',
        audience: brain?.audience_persona || '',
        brandValues: brain?.brand_values || [],
        uniqueSellingPoints: ext.unique_selling_points,
        contentPillars: ext.content_pillars,
        socialPlatforms: ext.social_media_platforms,
        contentLanguage: ext.content_language,
        marketingStrategy: ext.marketing_strategy,
        dos: ext.dos,
        donts: ext.donts,
        vocabularyBlacklist: [],
        vocabularyWhitelist: []
      }
      const promptProductPayload = isGeneralMode
        ? null
        : {
            name: selectedProduct!.name,
            usp: selectedProduct!.product_brain_versions?.[0]?.usp || '',
            rtb: '',
            keyClaims: [],
            mandatoryDisclaimers: '',
            targetAudience: selectedProduct!.product_brain_versions?.[0]?.functional_benefits || '',
            emotionalBenefits: ''
          }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: promptBrandPayload,
          product: promptProductPayload,
          platform: form.platform,
          objective: form.objective,
          framework: form.framework || 'PAS',
          hookType: form.hookType || 'Curiosity',
          tone: form.tone,
          visualStyle: form.visualStyle,
          outputLength: form.outputLength,
          additionalContext: form.additionalContext,
          workspace_id: workspaceId
        })
      })
      const data = await res.json()
      if (data.success) {
        setOutput(data.output)
        setUsage(data.usage)
      } else {
        alert(data.error || 'Generation failed')
      }
    } catch {
      alert('Network error — check your API key configuration')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveToLibrary() {
    if (!output || !workspaceId || !selectedBrand || !userId) return
    setSavingLibrary(true)

    try {
      // 1. Insert Request
      const { data: reqData, error: reqErr } = await supabase.from('generation_requests').insert({
        workspace_id: workspaceId,
        brand_id: selectedBrand.id,
        product_id: isGeneralMode ? null : (selectedProduct?.id ?? null),
        platform: form.platform,
        objective: form.objective,
        framework_id: null,
        hook_type_id: null,
        tone_override: form.tone,
        visual_style: form.visualStyle,
        output_length: form.outputLength,
        additional_context: form.additionalContext,
        source_context_summary: `Brand: ${selectedBrand.name}, Product: ${isGeneralMode ? 'General' : (selectedProduct?.name ?? '')}, Framework: ${form.framework || 'PAS'}`,
        status: 'completed',
        created_by: userId
      }).select('id').single()

      if (reqErr) throw reqErr

      // 2. Insert Output
      const { error: outErr } = await supabase.from('generation_outputs').insert({
        request_id: reqData.id,
        workspace_id: workspaceId,
        hook: output.hook,
        main_copy: output.main_copy,
        cta_options: output.cta_options,
        hashtag_pack: output.hashtag_pack,
        visual_direction: output.visual_direction,
        rationale: output.rationale,
        raw_response: output,
        status: 'approved' // Automatically approve saves to library
      })

      if (outErr) throw outErr
      
      setLibrarySaved(true)
    } catch (e: any) {
      alert('Failed to save to library: ' + e.message)
    } finally {
      setSavingLibrary(false)
    }
  }

  // ─── UI Components ────────────────────────────────────────────────────────
  function Select({ label, options, value, onChange, placeholder }: {
    label: string; options: string[]; value: string;
    onChange: (v: string) => void; placeholder?: string
  }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>{label}</label>
        <div style={{ position: 'relative' }}>
          <select value={value} onChange={e => onChange(e.target.value)}
            style={{
              width: '100%', appearance: 'none', background: 'var(--surface-3)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 32px 8px 12px', fontSize: 13.5, color: value ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none', transition: 'border-color 0.15s'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--border-accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'}>
            <option value="">{placeholder || `Select ${label}`}</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
        </div>
      </div>
    )
  }

  function CopyBtn({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    return (
      <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)',
          background: 'var(--surface-3)', cursor: 'pointer', fontSize: 11.5, color: copied ? 'var(--green)' : 'var(--text-secondary)',
          transition: 'all 0.15s', fontFamily: 'var(--font-body)'
        }}>
        {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
        {copied ? 'Copied!' : 'Copy'}
      </button>
    )
  }

  function OutputSection({ icon: Icon, label, color, children, extra }: {
    icon: typeof Zap; label: string; color: string; children: React.ReactNode; extra?: React.ReactNode
  }) {
    return (
      <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icon size={13} style={{ color }} /><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span></div>
          {extra}
        </div>
        <div style={{ padding: '14px 16px' }}>{children}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header page-header-row fade-up fade-up-1">
        <div>
          <h1 className="page-title">Content Generator</h1>
          <p className="page-subtitle">Generate platform-native content from Brand Brain and Product Brain.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
            {advancedMode ? 'Advanced' : 'Basic'} mode
          </span>
          <button onClick={() => setAdvancedMode(m => !m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
            {advancedMode ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: output ? '380px 1fr' : '480px 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Context */}
          <div className="panel fade-up fade-up-2">
            <div className="panel-header"><span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Brain size={14} style={{ color: 'var(--text-secondary)' }} /> Context</span></div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Select label="Brand" options={brands.map(b => b.name)} value={selectedBrand?.name || ''}
                onChange={v => { set('brandId')(brands.find(b => b.name === v)?.id || ''); set('productId')('') }} placeholder="Select a brand" />
              {/* Product — General option + specific products */}
              {form.brandId ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>Product</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={form.productId}
                      onChange={e => set('productId')(e.target.value)}
                      style={{
                        width: '100%', appearance: 'none', background: 'var(--surface-3)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '8px 32px 8px 12px', fontSize: 13.5,
                        color: form.productId ? 'var(--text-primary)' : 'var(--text-tertiary)',
                        fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none', transition: 'border-color 0.15s'
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--border-accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    >
                      <option value="">Select a product</option>
                      <option value="__general__">— General (Brand-level, no product) —</option>
                      {availableProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                  </div>
                </div>
              ) : (
                <Select label="Product" options={[]} value="" onChange={() => {}} placeholder="Select brand first" />
              )}

              {selectedBrand && form.productId && (
                <div style={{ background: 'var(--surface-4)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)', fontSize: 12 }}>
                  <div style={{ color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Brain Context</div>
                  <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}><span style={{ color: 'var(--accent)' }}>Tone:</span> {toneVoice}</div>
                  <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 2 }}>
                    {isGeneralMode
                      ? <><span style={{ color: 'var(--text-tertiary)' }}>Mode:</span> Brand-level content (no specific product)</>
                      : <><span style={{ color: 'var(--green)' }}>USP:</span> {brainUSP}</>
                    }
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Target */}
          <div className="panel fade-up fade-up-3">
            <div className="panel-header"><span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Zap size={14} style={{ color: 'var(--text-secondary)' }} /> Target</span></div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Platform</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {platforms.map(p => (
                    <button key={p} onClick={() => set('platform')(p)} style={{
                      padding: '5px 11px', borderRadius: 20, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-body)',
                      border: form.platform === p ? `1.5px solid ${platformColors[p]}` : '1px solid var(--border)', background: form.platform === p ? `${platformColors[p]}18` : 'var(--surface-3)',
                      color: form.platform === p ? platformColors[p] : 'var(--text-secondary)',
                    }}>{p}</button>
                  ))}
                </div>
              </div>
              <Select label="Objective" options={objectives} value={form.objective} onChange={set('objective')} />
            </div>
          </div>

          {/* Strategy */}
          {advancedMode && (
            <div className="panel fade-up fade-up-4">
              <div className="panel-header"><span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Package size={14} style={{ color: 'var(--text-secondary)' }} /> Strategy Controls</span></div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Select label="Framework" options={frameworks} value={form.framework} onChange={set('framework')} placeholder="PAS (recommended)" />
                <Select label="Hook Type" options={hookTypes} value={form.hookType} onChange={set('hookType')} placeholder="Curiosity (recommended)" />
                <Select label="Tone Variation" options={toneVariations} value={form.tone} onChange={set('tone')} />
                <Select label="Visual Style" options={visualStyles} value={form.visualStyle} onChange={set('visualStyle')} />
                <Select label="Output Length" options={outputLengths} value={form.outputLength} onChange={set('outputLength')} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Additional Context</label>
                  <textarea value={form.additionalContext} onChange={e => set('additionalContext')(e.target.value)} rows={3} style={{
                    background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none', transition: 'border-color 0.15s', lineHeight: 1.5
                  }} onFocus={e => e.target.style.borderColor = 'var(--border-accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                </div>
              </div>
            </div>
          )}

          <button className="btn btn-primary" onClick={handleGenerate} disabled={!canGenerate || loading} style={{
            width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14, opacity: (!canGenerate || loading) ? 0.5 : 1, cursor: (!canGenerate || loading) ? 'not-allowed' : 'pointer'
          }}>
            {loading ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</> : <><Sparkles size={14} /> Generate Content</>}
          </button>
          {!canGenerate && (<p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: -4 }}>Select brand, product, platform and objective to continue</p>)}

          {usage && (
            <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 11.5 }}>
              <div style={{ color: 'var(--text-tertiary)', marginBottom: 6, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Token Usage</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-secondary)' }}>In: <strong style={{ color: 'var(--text-primary)' }}>{usage.input_tokens}</strong></span>
                <span style={{ color: 'var(--text-secondary)' }}>Out: <strong style={{ color: 'var(--text-primary)' }}>{usage.output_tokens}</strong></span>
                {usage.cache_read_input_tokens > 0 && <span style={{ color: 'var(--green)' }}>✓ Cached: {usage.cache_read_input_tokens}</span>}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {output ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{selectedBrand?.name} / {isGeneralMode ? 'General' : selectedProduct?.name} / {form.platform}</span>
                  <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-tertiary)' }}>{form.objective}</span>
                </div>
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={handleGenerate}><RefreshCw size={12} /> Regenerate All</button>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={handleSaveToLibrary} disabled={savingLibrary || librarySaved}>{librarySaved ? <><CheckCircle2 size={12} /> Approved</> : <><CheckCircle2 size={12} /> Approve</>}</button>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'rgba(124,109,250,0.06)', border: '1px solid var(--border-accent)', borderRadius: 10, fontSize: 12.5 }}>
                <Info size={13} style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--accent)' }}>Brand tone:</strong> {toneVoice} &nbsp;·&nbsp;
                  <strong style={{ color: 'var(--green)' }}>USP:</strong> {brainUSP} &nbsp;·&nbsp;
                  <strong style={{ color: 'var(--text-secondary)' }}>Framework:</strong> {form.framework || 'PAS'}
                </span>
              </div>

              <OutputSection icon={Zap} label="Hook" color="var(--accent)" extra={<div style={{ display: 'flex', gap: 6 }}><CopyBtn text={output.hook} /><button className="btn btn-secondary" style={{ fontSize: 11.5, padding: '4px 9px' }} onClick={handleGenerate}><RefreshCw size={11} />Regen</button></div>}>
                <p style={{ fontSize: 14.5, color: 'var(--text-primary)', lineHeight: 1.65, fontWeight: 500 }}>{output.hook}</p>
              </OutputSection>
              <OutputSection icon={MessageSquare} label="Main Copy" color="var(--blue)" extra={<CopyBtn text={output.main_copy} />}>
                <p style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{output.main_copy}</p>
              </OutputSection>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                <OutputSection icon={ArrowRight} label="CTA Options" color="var(--green)" extra={undefined}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {output.cta_options?.map((cta, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 10px', background: 'var(--surface-2)', borderRadius: 7, border: '1px solid var(--border)', fontSize: 13 }}>
                        <span style={{ color: 'var(--text-primary)' }}>{cta}</span><CopyBtn text={cta} />
                      </div>
                    ))}
                  </div>
                </OutputSection>
                <OutputSection icon={Hash} label="Hashtag Pack" color="var(--amber)" extra={<CopyBtn text={output.hashtag_pack?.join(' ')} />}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {output.hashtag_pack?.map((tag, i) => (
                      <span key={i} style={{ fontSize: 12.5, padding: '3px 9px', borderRadius: 20, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--amber)' }}>{tag}</span>
                    ))}
                  </div>
                </OutputSection>
              </div>

              <OutputSection icon={Image} label="Visual Direction" color="var(--text-secondary)" extra={<CopyBtn text={output.visual_direction} />}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, fontStyle: 'italic' }}>{output.visual_direction}</p>
              </OutputSection>
              <OutputSection icon={Info} label="Rationale" color="var(--text-tertiary)" extra={undefined}>
                <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.65 }}>{output.rationale}</p>
              </OutputSection>

              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button 
                  className={`btn ${librarySaved ? 'btn-primary' : 'btn-secondary'}`} 
                  style={{ flex: 1, justifyContent: 'center', background: librarySaved ? 'var(--green)' : undefined, color: librarySaved ? 'black' : undefined, border: librarySaved ? 'none' : undefined }}
                  onClick={handleSaveToLibrary}
                  disabled={savingLibrary || librarySaved}
                >
                  {savingLibrary ? 'Saving...' : librarySaved ? <><CheckCircle2 size={14}/> Saved to Library</> : <><Save size={14}/> Save to Library</>}
                </button>
                <a className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
                  href={`/campaigns?brandId=${form.brandId}&productId=${form.productId}`}>
                  Use in Campaign
                </a>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, padding: '48px 32px', textAlign: 'center' }}>
                <Sparkles size={32} style={{ color: 'var(--accent)', margin: '0 auto 14px', display: 'block' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Ready to generate</h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>Configure the left panel and click Generate. FCE will build a complete content bundle from your Brand Brain and Product Brain.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

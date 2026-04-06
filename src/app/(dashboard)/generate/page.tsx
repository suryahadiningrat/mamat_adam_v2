'use client'
import { useState, useEffect } from 'react'
import {
  Zap, ChevronDown, Sparkles, Copy, RefreshCw,
  CheckCircle2, Hash, Image, MessageSquare, ArrowRight,
  ToggleLeft, ToggleRight, Info, Brain, Package, Save,
  Plus, Trash2, Film, Layers, Monitor, type LucideIcon
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Platform → Available Formats ────────────────────────────────────────────
const platformFormats: Record<string, { label: string; icon: string; isVideo: boolean; isCarousel: boolean }[]> = {
  Instagram: [
    { label: 'Single Image', icon: '🖼️', isVideo: false, isCarousel: false },
    { label: 'Carousel', icon: '🎠', isVideo: false, isCarousel: true },
    { label: 'Reels', icon: '🎬', isVideo: true, isCarousel: false },
    { label: 'Story – Image', icon: '📱', isVideo: false, isCarousel: false },
    { label: 'Story – Video', icon: '📹', isVideo: true, isCarousel: false },
  ],
  TikTok: [
    { label: 'TikTok Video', icon: '🎵', isVideo: true, isCarousel: false },
    { label: 'TikTok Carousel', icon: '🎠', isVideo: false, isCarousel: true },
  ],
  YouTube: [
    { label: 'Long Video', icon: '📺', isVideo: true, isCarousel: false },
    { label: 'YouTube Shorts', icon: '⚡', isVideo: true, isCarousel: false },
  ],
  'Twitter/X': [
    { label: 'Single Tweet', icon: '🐦', isVideo: false, isCarousel: false },
    { label: 'Thread', icon: '🧵', isVideo: false, isCarousel: true },
    { label: 'Video Tweet', icon: '🎬', isVideo: true, isCarousel: false },
  ],
  LinkedIn: [
    { label: 'Single Post', icon: '💼', isVideo: false, isCarousel: false },
    { label: 'Carousel Post', icon: '🎠', isVideo: false, isCarousel: true },
    { label: 'LinkedIn Video', icon: '🎬', isVideo: true, isCarousel: false },
    { label: 'Article', icon: '📝', isVideo: false, isCarousel: false },
  ],
  Facebook: [
    { label: 'Feed Post', icon: '📰', isVideo: false, isCarousel: false },
    { label: 'Carousel Ad', icon: '🎠', isVideo: false, isCarousel: true },
    { label: 'Reel / Short Video', icon: '🎬', isVideo: true, isCarousel: false },
    { label: 'Story', icon: '📱', isVideo: false, isCarousel: false },
  ],
}

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

type Slide = { slide_number: number; copy_on_visual: string; visual_direction: string }
type Scene = { scene_number: number; script: string; visual_direction: string }

type GeneratedOutput = {
  content_title?: string
  copy_on_visual?: string
  caption?: string
  cta_options?: string[]
  hashtag_pack?: string[]
  visual_direction?: string
  rationale?: string
  slides?: Slide[]
  scenes?: Scene[]
}

// ─── Module-level sub-components (must be outside GeneratePage for Fast Refresh) ─
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
          onFocus={e => e.target.style.borderColor = 'var(--border-accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}>
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
  icon: LucideIcon;
  label: string; color: string; children: React.ReactNode; extra?: React.ReactNode
}) {
  return (
    <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon size={13} style={{ color }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        </div>
        {extra}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}

const cellStyle: React.CSSProperties = {
  background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6,
  padding: '7px 10px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-body)',
  resize: 'vertical', outline: 'none', width: '100%', minHeight: 60, transition: 'border-color 0.15s', lineHeight: 1.5
}

export default function GeneratePage() {
  const [advancedMode, setAdvancedMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [savingLibrary, setSavingLibrary] = useState(false)
  const [librarySaved, setLibrarySaved] = useState(false)

  const [output, setOutput] = useState<GeneratedOutput | null>(null)
  const [editableTitle, setEditableTitle] = useState('')
  const [editableSlides, setEditableSlides] = useState<Slide[]>([])
  const [editableScenes, setEditableScenes] = useState<Scene[]>([])
  const [usage, setUsage] = useState<null | Record<string, number>>(null)

  const [form, setForm] = useState({
    brandId: '', productId: '', platform: '', outputFormat: '',
    objective: '', framework: '', hookType: '', tone: '', visualStyle: '',
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

        const { data: bData } = await supabase.from('brands').select('id, name, brand_brain_versions(tone_of_voice, brand_personality, brand_values, brand_promise, source_summary, audience_persona, messaging_rules)').eq('workspace_id', wsId)
        if (bData) setBrands(bData as DBBrand[])

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

  // When platform changes, reset outputFormat
  const handlePlatformChange = (p: string) => {
    setForm(f => ({ ...f, platform: p, outputFormat: '' }))
    setOutput(null)
    setEditableSlides([])
    setEditableScenes([])
  }

  const availableFormats = form.platform ? (platformFormats[form.platform] || []) : []
  const selectedFormat = availableFormats.find(f => f.label === form.outputFormat)
  const isCarousel = selectedFormat?.isCarousel ?? false
  const isVideo = selectedFormat?.isVideo ?? false

  const canGenerate = form.brandId && form.productId && form.platform && form.outputFormat && form.objective

  const toneVoice = selectedBrand?.brand_brain_versions?.[0]?.tone_of_voice || 'Standard Professional'
  const brainUSP = isGeneralMode ? 'Brand-level content' : (selectedProduct?.product_brain_versions?.[0]?.usp || 'Premium Quality')

  async function handleGenerate() {
    if (!canGenerate || !selectedBrand) return
    setLoading(true)
    setOutput(null)
    setEditableTitle('')
    setEditableSlides([])
    setEditableScenes([])
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
          outputFormat: form.outputFormat,
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
        setEditableTitle(data.output.content_title || '')
        if (data.output.slides) setEditableSlides(data.output.slides)
        if (data.output.scenes) setEditableScenes(data.output.scenes)
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
      const { data: reqData, error: reqErr } = await supabase.from('generation_requests').insert({
        workspace_id: workspaceId,
        brand_id: selectedBrand.id,
        product_id: isGeneralMode ? null : (selectedProduct?.id ?? null),
        platform: form.platform,
        output_format: form.outputFormat,
        objective: form.objective,
        framework_id: null,
        hook_type_id: null,
        tone_override: form.tone,
        visual_style: form.visualStyle,
        output_length: form.outputLength,
        additional_context: form.additionalContext,
        source_context_summary: `Brand: ${selectedBrand.name}, Product: ${isGeneralMode ? 'General' : (selectedProduct?.name ?? '')}, Format: ${form.outputFormat}, Framework: ${form.framework || 'PAS'}`,
        status: 'completed',
        created_by: userId
      }).select('id').single()

      if (reqErr) throw reqErr

      const { error: outErr } = await supabase.from('generation_outputs').insert({
        request_id: reqData.id,
        workspace_id: workspaceId,
        content_title: editableTitle || output.content_title || null,
        copy_on_visual: output.copy_on_visual || null,
        caption: output.caption || null,
        slides: isCarousel ? editableSlides : null,
        scenes: isVideo ? editableScenes : null,
        cta_options: output.cta_options || null,
        hashtag_pack: output.hashtag_pack || null,
        visual_direction: output.visual_direction || null,
        rationale: output.rationale || null,
        raw_response: output,
        status: 'approved'
      })

      if (outErr) throw outErr
      setLibrarySaved(true)
    } catch (e: any) {
      alert('Failed to save to library: ' + e.message)
    } finally {
      setSavingLibrary(false)
    }
  }

  // ─── Slide/Scene table editors ────────────────────────────────────────────
  function updateSlide(idx: number, field: keyof Slide, value: string) {
    setEditableSlides(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }
  function addSlide() {
    setEditableSlides(prev => [...prev, { slide_number: prev.length + 1, copy_on_visual: '', visual_direction: '' }])
  }
  function removeSlide(idx: number) {
    setEditableSlides(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, slide_number: i + 1 })))
  }

  function updateScene(idx: number, field: keyof Scene, value: string) {
    setEditableScenes(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }
  function addScene() {
    setEditableScenes(prev => [...prev, { scene_number: prev.length + 1, script: '', visual_direction: '' }])
  }
  function removeScene(idx: number) {
    setEditableScenes(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, scene_number: i + 1 })))
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
        {/* ─── Left Panel ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Context */}
          <div className="panel fade-up fade-up-2">
            <div className="panel-header"><span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Brain size={14} style={{ color: 'var(--text-secondary)' }} /> Context</span></div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Select label="Brand" options={brands.map(b => b.name)} value={selectedBrand?.name || ''}
                onChange={v => { set('brandId')(brands.find(b => b.name === v)?.id || ''); set('productId')('') }} placeholder="Select a brand" />
              {form.brandId ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>Product</label>
                  <div style={{ position: 'relative' }}>
                    <select value={form.productId} onChange={e => set('productId')(e.target.value)}
                      style={{ width: '100%', appearance: 'none', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 32px 8px 12px', fontSize: 13.5, color: form.productId ? 'var(--text-primary)' : 'var(--text-tertiary)', fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none' }}
                      onFocus={e => e.target.style.borderColor = 'var(--border-accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}>
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
                      ? <><span style={{ color: 'var(--text-tertiary)' }}>Mode:</span> Brand-level content</>
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
              {/* Platform */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Platform</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.keys(platformFormats).map(p => (
                    <button key={p} onClick={() => handlePlatformChange(p)} style={{
                      padding: '5px 11px', borderRadius: 20, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-body)',
                      border: form.platform === p ? `1.5px solid ${platformColors[p]}` : '1px solid var(--border)',
                      background: form.platform === p ? `${platformColors[p]}18` : 'var(--surface-3)',
                      color: form.platform === p ? platformColors[p] : 'var(--text-secondary)',
                    }}>{p}</button>
                  ))}
                </div>
              </div>

              {/* Output Format — only show when platform is selected */}
              {form.platform && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                    Output Format <span style={{ color: 'var(--red)', fontSize: 11 }}>*required</span>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {availableFormats.map(fmt => (
                      <button key={fmt.label} onClick={() => { set('outputFormat')(fmt.label); setOutput(null) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                          fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, transition: 'all 0.15s', textAlign: 'left',
                          border: form.outputFormat === fmt.label ? '1.5px solid var(--border-accent)' : '1px solid var(--border)',
                          background: form.outputFormat === fmt.label ? 'rgba(124,109,250,0.1)' : 'var(--surface-3)',
                          color: form.outputFormat === fmt.label ? 'var(--accent)' : 'var(--text-secondary)',
                        }}>
                        <span style={{ fontSize: 16 }}>{fmt.icon}</span>
                        <span style={{ flex: 1 }}>{fmt.label}</span>
                        {fmt.isCarousel && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(124,109,250,0.15)', color: 'var(--accent)', fontWeight: 600 }}>SLIDES</span>}
                        {fmt.isVideo && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(248,113,113,0.15)', color: 'var(--red)', fontWeight: 600 }}>VIDEO</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
          {!canGenerate && (<p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: -4 }}>
            Select brand, product, platform, format and objective to continue
          </p>)}

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

        {/* ─── Right Panel: Output ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {output ? (
            <>
              {/* Header bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                    {selectedBrand?.name} / {isGeneralMode ? 'General' : selectedProduct?.name}
                  </span>
                  <span style={{ marginLeft: 8, fontSize: 12, padding: '2px 8px', borderRadius: 20, background: 'rgba(124,109,250,0.1)', color: 'var(--accent)', fontWeight: 500, border: '1px solid var(--border-accent)' }}>
                    {selectedFormat?.icon} {form.outputFormat}
                  </span>
                  <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>{form.platform} · {form.objective}</span>
                </div>
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={handleGenerate}><RefreshCw size={12} /> Regenerate</button>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={handleSaveToLibrary} disabled={savingLibrary || librarySaved}>
                  {librarySaved ? <><CheckCircle2 size={12} /> Approved</> : <><CheckCircle2 size={12} /> Approve</>}
                </button>
              </div>

              {/* Content Title */}
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface-3)' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Content Title</span>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>Internal use only · not shown in caption or visual</span>
                </div>
                <input
                  value={editableTitle}
                  onChange={e => setEditableTitle(e.target.value)}
                  placeholder="e.g. City Go Wet Road Safety – Instagram Reel Hook"
                  style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    padding: '10px 14px', fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)', boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Context badge */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'rgba(124,109,250,0.06)', border: '1px solid var(--border-accent)', borderRadius: 10, fontSize: 12.5 }}>
                <Info size={13} style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--accent)' }}>Brand tone:</strong> {toneVoice} &nbsp;·&nbsp;
                  <strong style={{ color: 'var(--green)' }}>USP:</strong> {brainUSP} &nbsp;·&nbsp;
                  <strong style={{ color: 'var(--text-secondary)' }}>Framework:</strong> {form.framework || 'PAS'}
                </span>
              </div>

              {/* ── CAROUSEL OUTPUT ─────────────────────────────────────── */}
              {isCarousel && editableSlides.length > 0 && (
                <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Layers size={13} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Carousel Slides <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>({editableSlides.length} slides)</span>
                      </span>
                    </div>
                    <button onClick={addSlide} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border-accent)', background: 'rgba(124,109,250,0.1)', cursor: 'pointer', fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-body)' }}>
                      <Plus size={12} /> Add Slide
                    </button>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                          {['#', 'Copy On Visual', 'Visual Direction', ''].map(h => (
                            <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {editableSlides.map((slide, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 14px', textAlign: 'center', width: 36 }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(124,109,250,0.15)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{slide.slide_number}</div>
                            </td>
                            <td style={{ padding: '10px 12px', width: '40%' }}>
                              <textarea value={slide.copy_on_visual} onChange={e => updateSlide(idx, 'copy_on_visual', e.target.value)}
                                style={cellStyle} onFocus={e => e.target.style.borderColor = 'var(--border-accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <textarea value={slide.visual_direction} onChange={e => updateSlide(idx, 'visual_direction', e.target.value)}
                                style={cellStyle} onFocus={e => e.target.style.borderColor = 'var(--border-accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                            </td>
                            <td style={{ padding: '10px 12px', width: 40 }}>
                              <button onClick={() => removeSlide(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 4, transition: 'color 0.15s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── VIDEO / SCENES OUTPUT ───────────────────────────────── */}
              {isVideo && editableScenes.length > 0 && (
                <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Film size={13} style={{ color: 'var(--red)' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Video Scenes <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>({editableScenes.length} scenes)</span>
                      </span>
                    </div>
                    <button onClick={addScene} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.1)', cursor: 'pointer', fontSize: 12, color: 'var(--red)', fontFamily: 'var(--font-body)' }}>
                      <Plus size={12} /> Add Scene
                    </button>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                          {['Scene', 'Script / Dialogue', 'Visual Direction', ''].map(h => (
                            <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {editableScenes.map((scene, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 14px', textAlign: 'center', width: 36 }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(248,113,113,0.15)', color: 'var(--red)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{scene.scene_number}</div>
                            </td>
                            <td style={{ padding: '10px 12px', width: '45%' }}>
                              <textarea value={scene.script} onChange={e => updateScene(idx, 'script', e.target.value)}
                                style={cellStyle} onFocus={e => e.target.style.borderColor = 'var(--border-accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <textarea value={scene.visual_direction} onChange={e => updateScene(idx, 'visual_direction', e.target.value)}
                                style={cellStyle} onFocus={e => e.target.style.borderColor = 'var(--border-accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                            </td>
                            <td style={{ padding: '10px 12px', width: 40 }}>
                              <button onClick={() => removeScene(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 4, transition: 'color 0.15s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── STANDARD COPY OUTPUT (Single Image, Story, etc) ─────── */}
              {!isCarousel && !isVideo && output.copy_on_visual && (
                <OutputSection icon={Monitor} label="Copy On Visual" color="var(--accent)"
                  extra={<div style={{ display: 'flex', gap: 6 }}><CopyBtn text={output.copy_on_visual} /><button className="btn btn-secondary" style={{ fontSize: 11.5, padding: '4px 9px' }} onClick={handleGenerate}><RefreshCw size={11} />Regen</button></div>}>
                  <p style={{ fontSize: 14.5, color: 'var(--text-primary)', lineHeight: 1.65, fontWeight: 500 }}>{output.copy_on_visual}</p>
                </OutputSection>
              )}

              {/* Caption — always shown for non-complex formats */}
              {output.caption && (
                <OutputSection icon={MessageSquare} label="Caption" color="var(--blue)" extra={<CopyBtn text={output.caption} />}>
                  <p style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{output.caption}</p>
                </OutputSection>
              )}

              {/* CTA + Hashtags */}
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
                <OutputSection icon={Hash} label="Hashtag Pack" color="var(--amber)" extra={<CopyBtn text={output.hashtag_pack?.join(' ') || ''} />}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {output.hashtag_pack?.map((tag, i) => (
                      <span key={i} style={{ fontSize: 12.5, padding: '3px 9px', borderRadius: 20, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--amber)' }}>{tag}</span>
                    ))}
                  </div>
                </OutputSection>
              </div>

              {output.visual_direction && (
                <OutputSection icon={Image} label="Visual Direction" color="var(--text-secondary)" extra={<CopyBtn text={output.visual_direction} />}>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, fontStyle: 'italic' }}>{output.visual_direction}</p>
                </OutputSection>
              )}
              {output.rationale && (
                <OutputSection icon={Info} label="Rationale" color="var(--text-tertiary)" extra={undefined}>
                  <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.65 }}>{output.rationale}</p>
                </OutputSection>
              )}

              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button
                  className={`btn ${librarySaved ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, justifyContent: 'center', background: librarySaved ? 'var(--green)' : undefined, color: librarySaved ? 'black' : undefined, border: librarySaved ? 'none' : undefined }}
                  onClick={handleSaveToLibrary}
                  disabled={savingLibrary || librarySaved}>
                  {savingLibrary ? 'Saving...' : librarySaved ? <><CheckCircle2 size={14} /> Saved to Library</> : <><Save size={14} /> Save to Library</>}
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
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
                  Configure the left panel and click Generate. FCE will build content tailored to your chosen format — slides, scenes, or single-post copy.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

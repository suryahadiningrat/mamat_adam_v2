'use client'
import { useState, useEffect, useRef } from 'react'
import {
  Zap, ChevronDown, Sparkles, Copy, RefreshCw,
  CheckCircle2, Hash, Image, MessageSquare, ArrowRight,
  ToggleLeft, ToggleRight, Info, Brain, Package, Save,
  Plus, Trash2, Film, Layers, Monitor, Link as LinkIcon, X, PenTool, type LucideIcon
} from 'lucide-react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useSession } from 'next-auth/react'

function pillarColor(pillar: string): string {
  const colors = ['#7c6dfa', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4']
  let hash = 0
  for (let i = 0; i < pillar.length; i++) hash = pillar.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

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
  product_brain_versions: {
    usp: string
    rtb: string
    functional_benefits: any
    emotional_benefits: any
    key_claims: any
    target_audience: string
    mandatory_disclaimers: string
  }[]
}

type Slide = { slide_number: number; copy_on_visual: string; visual_direction: string; sketch_url?: string }
type Scene = { scene_number: number; script: string; visual_direction: string; sketch_url?: string }

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

// Map a topic-generator format string to the exact label used in platformFormats
function matchFormat(fmt: string, platform: string): string {
  const formats = platformFormats[platform] || []
  if (!fmt || !formats.length) return formats[0]?.label || ''
  const fl = fmt.toLowerCase()
  const exact = formats.find(f => f.label.toLowerCase() === fl)
  if (exact) return exact.label
  const contains = formats.find(f => f.label.toLowerCase().includes(fl) || fl.includes(f.label.toLowerCase()))
  if (contains) return contains.label
  if (fl.includes('carousel')) return formats.find(f => f.isCarousel)?.label || ''
  if (fl.includes('reel') || fl.includes('short') || fl.includes('video')) return formats.find(f => f.isVideo)?.label || ''
  if (fl.includes('story')) return formats.find(f => f.label.toLowerCase().includes('story'))?.label || ''
  return formats[0]?.label || ''
}

export default function GeneratePage() {
  const [advancedMode, setAdvancedMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [savingLibrary, setSavingLibrary] = useState(false)
  const [librarySaved, setLibrarySaved] = useState(false)
  const [topicRef, setTopicRef] = useState<{ title: string; pillar: string; format: string } | null>(null)

  const [output, setOutput] = useState<GeneratedOutput | null>(null)
  const [editableTitle, setEditableTitle] = useState('')
  const [editableSlides, setEditableSlides] = useState<Slide[]>([])
  const [editableScenes, setEditableScenes] = useState<Scene[]>([])
  const [editCopyOnVisual, setEditCopyOnVisual] = useState('')
  const [editCaption, setEditCaption] = useState('')
  const [editCtaOptions, setEditCtaOptions] = useState<string[]>([])
  const [editHashtags, setEditHashtags] = useState('')
  const [editVisualDirection, setEditVisualDirection] = useState('')
  const [editRationale, setEditRationale] = useState('')
  const [regenOpen, setRegenOpen] = useState(false)
  const [regenContext, setRegenContext] = useState('')
  const [sketchUrl, setSketchUrl] = useState<string>('')
  const [slideSketches, setSlideSketches] = useState<Record<number, string>>({})
  const [sceneSketches, setSceneSketches] = useState<Record<number, string>>({})
  const [sketchLoading, setSketchLoading] = useState<Record<string, boolean>>({})
  const [fullScreenImg, setFullScreenImg] = useState<string | null>(null)
  const [sketchRevision, setSketchRevision] = useState<Record<string, string>>({})
  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState('')
  const [scrapeResult, setScrapeResult] = useState<{ title: string; content_type: string; main_topic: string; key_claims: string[]; tone: string; summary: string; content_angles: string[] } | null>(null)
  const [referenceSummary, setReferenceSummary] = useState('')
  const [usage, setUsage] = useState<null | Record<string, number>>(null)
  const urlParamsApplied = useRef(false)

  const [form, setForm] = useState({
    brandId: '', productId: '', platform: '', outputFormat: '',
    contentPillar: '',
    objective: '', framework: '', hookType: '', tone: '', visualStyle: '',
    outputLength: '', additionalContext: '', referenceUrl: '', date: ''
  })

  const { workspaceId } = useWorkspace()
  const { data: session } = useSession()
  const [userId, setUserId] = useState<string | null>(null)
  const [brands, setBrands] = useState<DBBrand[]>([])
  const [products, setProducts] = useState<DBProduct[]>([])

  useEffect(() => {
    if (!workspaceId || !session?.user) return
    async function initData() {
      setUserId((session?.user as any)?.id)

      const [bDataRes, pDataRes] = await Promise.all([
        fetch(`/api/brands?workspaceId=${workspaceId}`),
        fetch(`/api/products?workspaceId=${workspaceId}`)
      ])

      if (bDataRes.ok) {
        const brandsData = await bDataRes.json()
        setBrands(brandsData.map((b: any) => ({
          ...b,
          brand_brain_versions: b.brain ? [b.brain] : []
        })))
      }

      if (pDataRes.ok) {
        const productsData = await pDataRes.json()
        setProducts(productsData.map((p: any) => ({
          ...p,
          product_brain_versions: p.brain ? [p.brain] : []
        })))
      }
    }
    initData()
  }, [workspaceId, session?.user])

  // Apply URL params (from Topic Generator / Topic Library) after data loads
  // Wait for both brands AND products so selectedProduct resolves correctly on first render
  useEffect(() => {
    if (!brands.length || urlParamsApplied.current) return
    const params = new URLSearchParams(window.location.search)
    const topicParam     = params.get('topic')
    const formatParam    = params.get('format')
    const pillarParam    = params.get('pillar')
    const platformParam  = params.get('platform')
    const brandIdParam   = params.get('brandId')
    const productIdParam = params.get('productId')
    const objectiveParam = params.get('objective')
    const calendarIdParam = params.get('calendarId')
    const topicIdParam = params.get('topicId')

    if (!topicParam && !brandIdParam && !calendarIdParam && !topicIdParam) return

    if (topicIdParam) {
      fetch(`/api/topics/${topicIdParam}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.id) {
            setTopicRef({ title: data.content_title, pillar: data.content_pillar || '', format: data.content_format || '' })
            setForm(f => ({
              ...f,
              brandId: data.brand_id || f.brandId,
              productId: data.product_id || f.productId,
              platform: data.platform || f.platform,
              outputFormat: data.content_format && data.platform ? matchFormat(data.content_format, data.platform) : f.outputFormat,
              date: data.publish_date ? new Date(data.publish_date).toISOString().split('T')[0] : f.date,
              additionalContext: `Topic reference: "${data.content_title}"${data.content_pillar ? ` — Pillar: ${data.content_pillar}` : ''}. Generate content specifically for this topic.`
            }))
          }
        })
        .catch(err => console.error('Failed to fetch topic', err))
    }

    if (calendarIdParam) {
      fetch(`/api/calendar/${calendarIdParam}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.id) {
            setForm(f => ({
              ...f,
              platform: data.channel || f.platform,
              outputFormat: data.format || f.outputFormat,
              date: data.date ? new Date(data.date).toISOString().split('T')[0] : f.date,
              additionalContext: `Calendar post reference: "${data.title}". Generate content for this calendar item.`
            }))
          }
        })
        .catch(err => console.error('Failed to fetch calendar item', err))
    }

    if (calendarIdParam || topicIdParam) {
      const qs = []
      if (calendarIdParam) qs.push(`calendarId=${calendarIdParam}`)
      if (topicIdParam) qs.push(`topicId=${topicIdParam}`)

      fetch(`/api/generations/latest?${qs.join('&')}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.id) {
            setOutput(data)
            setEditableTitle(data.content_title || '')
            setEditableSlides(data.slides || [])
            setEditableScenes(data.scenes || [])
            setEditCopyOnVisual(data.copy_on_visual || '')
            setEditCaption(data.caption || '')
            setEditCtaOptions(data.cta_options || [])
            setEditHashtags((data.hashtag_pack || []).join(' '))
            setEditVisualDirection(data.visual_direction || '')
            setEditRationale(data.rationale || '')
            setLibrarySaved(data.status === 'approved')

            setForm(f => ({
              ...f,
              brandId: data.request?.brand_id || f.brandId,
              productId: data.request?.product_id || f.productId,
              platform: data.request?.platform || f.platform,
              outputFormat: data.request?.output_format || f.outputFormat,
              objective: data.request?.objective || f.objective,
              framework: data.request?.framework_id || f.framework,
              hookType: data.request?.hook_type_id || f.hookType,
              tone: data.request?.tone_override || f.tone,
              visualStyle: data.request?.visual_style || f.visualStyle,
              outputLength: data.request?.output_length || f.outputLength,
              additionalContext: data.request?.additional_context || f.additionalContext
            }))
          }
        })
        .catch(err => console.error('Failed to fetch existing generation', err))
    }

    const resolvedBrand = brandIdParam ? brands.find(b => b.id === brandIdParam) : undefined
    const resolvedPlatform = platformParam || ''
    const resolvedFormat = formatParam && resolvedPlatform ? matchFormat(formatParam, resolvedPlatform) : ''

    if (topicParam) {
      setTopicRef({ title: topicParam, pillar: pillarParam || '', format: formatParam || '' })
    }

    setForm(f => ({
      ...f,
      ...(resolvedBrand ? { brandId: resolvedBrand.id } : {}),
      ...(productIdParam ? { productId: productIdParam } : {}),
      ...(resolvedPlatform ? { platform: resolvedPlatform } : {}),
      ...(resolvedFormat ? { outputFormat: resolvedFormat } : {}),
      ...(objectiveParam ? { objective: objectiveParam } : {}),
      ...(pillarParam ? { contentPillar: pillarParam } : {}),
      additionalContext: topicParam
        ? `Topic reference: "${topicParam}"${pillarParam ? ` — Pillar: ${pillarParam}` : ''}. Generate content specifically for this topic.`
        : f.additionalContext
    }))
    urlParamsApplied.current = true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brands, products])

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

  async function handleGenerate(contextOverride?: string) {
    if (!canGenerate || !selectedBrand) return
    setLoading(true)
    setOutput(null)
    setEditableTitle('')
    setEditableSlides([])
    setEditableScenes([])
    setEditCopyOnVisual('')
    setEditCaption('')
    setEditCtaOptions([])
    setEditHashtags('')
    setEditVisualDirection('')
    setEditRationale('')
    setRegenOpen(false)
    setRegenContext('')
    setLibrarySaved(false)
    setSketchUrl('')
    setSlideSketches({})
    setSceneSketches({})
    setSketchLoading({})

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
        audience: typeof brain?.audience_persona === 'object' && brain?.audience_persona !== null
          ? JSON.stringify(brain.audience_persona)
          : (brain?.audience_persona || ''),
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
      const pBrain = selectedProduct?.product_brain_versions?.[0]
      const promptProductPayload = isGeneralMode
        ? null
        : {
            name: selectedProduct!.name,
            usp: pBrain?.usp || '',
            rtb: pBrain?.rtb || '',
            keyClaims: Array.isArray(pBrain?.key_claims) ? pBrain.key_claims : (pBrain?.key_claims ? [pBrain.key_claims] : []),
            mandatoryDisclaimers: pBrain?.mandatory_disclaimers || '',
            targetAudience: pBrain?.target_audience || '',
            emotionalBenefits: Array.isArray(pBrain?.emotional_benefits) ? pBrain.emotional_benefits.join('; ') : (pBrain?.emotional_benefits || ''),
            functionalBenefits: Array.isArray(pBrain?.functional_benefits) ? pBrain.functional_benefits.join('; ') : (pBrain?.functional_benefits || ''),
          }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: promptBrandPayload,
          product: promptProductPayload,
          platform: form.platform,
          outputFormat: form.outputFormat,
          contentPillar: form.contentPillar || undefined,
          objective: form.objective,
          framework: form.framework || 'PAS',
          hookType: form.hookType || 'Curiosity',
          tone: form.tone,
          visualStyle: form.visualStyle,
          outputLength: form.outputLength,
          additionalContext: contextOverride ?? form.additionalContext,
          referenceUrl: form.referenceUrl || undefined,
          referenceSummary: referenceSummary || undefined,
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
        setEditCopyOnVisual(data.output.copy_on_visual || '')
        setEditCaption(data.output.caption || '')
        setEditCtaOptions(data.output.cta_options || [])
        setEditHashtags((data.output.hashtag_pack || []).join(' '))
        setEditVisualDirection(data.output.visual_direction || '')
        setEditRationale(data.output.rationale || '')
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
      const hashtagPack = editHashtags.trim()
        ? editHashtags.trim().split(/\s+/).filter(Boolean)
        : (output.hashtag_pack || null)

      const payload = {
        workspace_id: workspaceId,
        brand_id: selectedBrand.id,
        product_id: isGeneralMode ? null : (selectedProduct?.id ?? null),
        platform: form.platform,
        output_format: form.outputFormat,
        objective: form.objective,
        tone_override: form.tone,
        visual_style: form.visualStyle,
        output_length: form.outputLength,
        additional_context: form.additionalContext,
        source_context_summary: `Brand: ${selectedBrand.name}, Product: ${isGeneralMode ? 'General' : (selectedProduct?.name ?? '')}, Format: ${form.outputFormat}, Framework: ${form.framework || 'PAS'}`,
        content_title: editableTitle || output.content_title || null,
        copy_on_visual: editCopyOnVisual || null,
        caption: editCaption || null,
        slides: isCarousel ? editableSlides : null,
        scenes: isVideo ? editableScenes : null,
        cta_options: editCtaOptions.length ? editCtaOptions : null,
        hashtag_pack: hashtagPack,
        visual_direction: editVisualDirection || null,
        rationale: editRationale || null,
        raw_response: { ...output, sketchUrl: sketchUrl || undefined },
        status: 'approved',
        publish_date: form.date ? new Date(form.date).toISOString() : null,
        calendar_id: new URLSearchParams(window.location.search).get('calendarId') || null
      }

      const res = await fetch('/api/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Failed to save generation')
      setLibrarySaved(true)
    } catch (e: any) {
      alert('Failed to save to library: ' + e.message)
    } finally {
      setSavingLibrary(false)
    }
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

  function handleRegenerateWithContext() {
    if (!regenContext.trim()) return
    const combined = regenContext.trim() + (form.additionalContext ? `\n\n[Prior context: ${form.additionalContext}]` : '')
    setRegenOpen(false)
    setRegenContext('')
    handleGenerate(combined)
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

  // Build a globally-consistent image generation prompt that anchors every slide/scene to the brand/product context.
  function buildSketchPrompt(slidePrompt: string) {
    const brandName = selectedBrand?.name || ''
    const productName = isGeneralMode ? '' : (selectedProduct?.name || '')
    const contentTitle = editableTitle || ''
    const platform = form.platform || ''

    // Build a concise context header
    const contextLines: string[] = []
    if (brandName) contextLines.push(`Brand: ${brandName}`)
    if (productName) contextLines.push(`Product: ${productName}`)
    if (contentTitle) contextLines.push(`Content: ${contentTitle}`)
    if (platform) contextLines.push(`Platform: ${platform}`)

    const contextHeader = contextLines.join(', ')
    return `[Context: ${contextHeader}] ${slidePrompt}`
  }

  async function handleGenerateSketch(type: 'single' | 'slide' | 'scene', idx?: number, promptText: string = '') {
    if (!promptText.trim()) return;
    
    const key = type === 'single' ? 'single' : `${type}-${idx}`;
    setSketchLoading(prev => ({ ...prev, [key]: true }));

    // Enrich prompt with brand/product/content context for consistent subject matter across all images
    const enrichedPrompt = buildSketchPrompt(promptText);

    try {
      const res = await fetch('/api/generate-sketch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: enrichedPrompt })
      });
      const data = await res.json();
      
      if (data.success && data.sketchUrl) {
        if (type === 'single') {
          setSketchUrl(data.sketchUrl);
        } else if (type === 'slide' && idx !== undefined) {
          setSlideSketches(s => ({ ...s, [idx]: data.sketchUrl }));
          updateSlide(idx, 'sketch_url', data.sketchUrl);
        } else if (type === 'scene' && idx !== undefined) {
          setSceneSketches(s => ({ ...s, [idx]: data.sketchUrl }));
          updateScene(idx, 'sketch_url', data.sketchUrl);
        }
      } else {
        alert(data.error || 'Failed to generate sketch');
      }
    } catch (err) {
      alert('Network error while generating sketch');
    } finally {
      setSketchLoading(prev => ({ ...prev, [key]: false }));
    }
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

      {/* ─── Topic Reference Banner ──────────────────────────────────────── */}
      {topicRef && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px', background: 'rgba(124,109,250,0.07)', border: '1px solid var(--border-accent)', borderRadius: 10, marginBottom: 4, fontSize: 13 }}>
          <Layers size={14} style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>From Topic Generator</span>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: 2, lineHeight: 1.4 }}>{topicRef.title}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
              {topicRef.pillar && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(124,109,250,0.12)', border: '1px solid rgba(124,109,250,0.3)', color: 'var(--accent)' }}>{topicRef.pillar}</span>}
              {topicRef.format && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{topicRef.format}</span>}
            </div>
          </div>
          <button onClick={() => setTopicRef(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 2, lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: output ? '380px 1fr' : '480px 1fr', gap: 16, alignItems: 'start' }}>
        {/* ─── Left Panel ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Context */}
          <div className="panel fade-up fade-up-2">
            <div className="panel-header"><span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Brain size={14} style={{ color: 'var(--text-secondary)' }} /> Context</span></div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Select label="Brand" options={brands.map(b => b.name)} value={selectedBrand?.name || ''}
                onChange={v => { set('brandId')(brands.find(b => b.name === v)?.id || ''); set('productId')(''); set('contentPillar')('') }} placeholder="Select a brand" />
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

              {/* Content Pillar picker — shown once brand is selected */}
              {selectedBrand && (() => {
                const ext = parseExt(selectedBrand.brand_brain_versions?.[0]?.messaging_rules)
                return ext.content_pillars.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>
                        Content Pillar
                      </label>
                      {form.contentPillar && (
                        <button onClick={() => set('contentPillar')('')} style={{ fontSize: 10.5, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)', textDecoration: 'underline' }}>
                          Clear
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {ext.content_pillars.map((p: string) => {
                        const color = pillarColor(p)
                        const selected = form.contentPillar === p
                        return (
                          <button key={p} onClick={() => set('contentPillar')(selected ? '' : p)} style={{
                            fontSize: 11, padding: '3px 9px', borderRadius: 20, cursor: 'pointer',
                            fontFamily: 'var(--font-body)', fontWeight: selected ? 600 : 400,
                            border: `1px solid ${selected ? color : 'var(--border)'}`,
                            background: selected ? `${color}20` : 'var(--surface-3)',
                            color: selected ? color : 'var(--text-tertiary)',
                            transition: 'all 0.15s',
                          }}>
                            {p}
                          </button>
                        )
                      })}
                    </div>
                    {form.contentPillar && (
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
                        Content will be generated specifically for the <strong style={{ color: pillarColor(form.contentPillar) }}>{form.contentPillar}</strong> pillar.
                      </p>
                    )}
                  </div>
                ) : null
              })()}
            </div>
          </div>

          {/* Reference & Context — always visible */}
          <div className="panel fade-up fade-up-3">
            <div className="panel-header"><span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><LinkIcon size={14} style={{ color: 'var(--text-secondary)' }} /> Reference & Context <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></span></div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Reference URL</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="url" value={form.referenceUrl}
                    onChange={e => { set('referenceUrl')(e.target.value); setScrapeResult(null); setScrapeError(''); setReferenceSummary('') }}
                    placeholder="https://…"
                    style={{ flex: 1, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none', transition: 'border-color 0.15s', minWidth: 0 }}
                    onFocus={e => e.target.style.borderColor = 'var(--border-accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    onKeyDown={e => e.key === 'Enter' && handleScrapeUrl()} />
                  <button onClick={handleScrapeUrl} disabled={scraping || !form.referenceUrl.trim()} style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8,
                    fontSize: 12, fontWeight: 500, cursor: scraping || !form.referenceUrl.trim() ? 'not-allowed' : 'pointer',
                    background: scrapeResult ? 'rgba(16,185,129,0.12)' : 'rgba(91,71,157,0.12)',
                    border: scrapeResult ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--border-accent)',
                    color: scrapeResult ? '#10b981' : 'var(--accent)',
                    fontFamily: 'var(--font-body)', opacity: scraping || !form.referenceUrl.trim() ? 0.55 : 1, transition: 'all 0.15s'
                  }}>
                    {scraping ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : scrapeResult ? <CheckCircle2 size={12} /> : <LinkIcon size={12} />}
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
                        {scrapeResult.content_angles.map((a, i) => (
                          <span key={i} style={{ display: 'block', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>· {a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Additional Context</label>
                <textarea value={form.additionalContext} onChange={e => set('additionalContext')(e.target.value)} rows={3} style={{
                  background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none', transition: 'border-color 0.15s', lineHeight: 1.5
                }} onFocus={e => e.target.style.borderColor = 'var(--border-accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'}
                placeholder="E.g. Focus on the launch campaign, mention the free trial offer…" />
              </div>
            </div>
          </div>

          {/* Target */}
          <div className="panel fade-up fade-up-4">
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Publish Date <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optional)</span></label>
                <input type="date" value={form.date} onChange={e => set('date')(e.target.value)}
                  style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: form.date ? 'var(--text-primary)' : 'var(--text-tertiary)', fontFamily: 'var(--font-body)', outline: 'none', transition: 'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor = 'var(--border-accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
            </div>
          </div>

          {/* Reference & Context */}
          <div className="panel fade-up fade-up-4">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <LinkIcon size={14} style={{ color: 'var(--text-secondary)' }} /> Reference & Context <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optional)</span>
              </span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Reference URL</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="url" value={form.referenceUrl} onChange={e => set('referenceUrl')(e.target.value)}
                    placeholder="https://…"
                    style={{ flex: 1, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none', transition: 'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor = 'var(--border-accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                  <button className="btn btn-secondary" style={{ padding: '0 12px' }} disabled={!form.referenceUrl}>
                    <Sparkles size={14} /> Analyze
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Additional Context</label>
                <textarea value={form.additionalContext} onChange={e => set('additionalContext')(e.target.value)} rows={3} placeholder="E.g. Focus on the launch campaign, mention the free trial offer..." style={{
                  background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none', transition: 'border-color 0.15s', lineHeight: 1.5
                }} onFocus={e => e.target.style.borderColor = 'var(--border-accent)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
            </div>
          </div>

          {/* Strategy */}
          {advancedMode && (
            <div className="panel fade-up fade-up-5">
              <div className="panel-header"><span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Package size={14} style={{ color: 'var(--text-secondary)' }} /> Strategy Controls</span></div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Select label="Framework" options={frameworks} value={form.framework} onChange={set('framework')} placeholder="PAS (recommended)" />
                <Select label="Hook Type" options={hookTypes} value={form.hookType} onChange={set('hookType')} placeholder="Curiosity (recommended)" />
                <Select label="Tone Variation" options={toneVariations} value={form.tone} onChange={set('tone')} />
                <Select label="Visual Style" options={visualStyles} value={form.visualStyle} onChange={set('visualStyle')} />
                <Select label="Output Length" options={outputLengths} value={form.outputLength} onChange={set('outputLength')} />
              </div>
            </div>
          )}

          <button className="btn btn-accent" onClick={() => handleGenerate()} disabled={!canGenerate || loading} style={{
            width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14
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
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                      {selectedBrand?.name} / {isGeneralMode ? 'General' : selectedProduct?.name}
                    </span>
                    <span style={{ marginLeft: 8, fontSize: 12, padding: '2px 8px', borderRadius: 20, background: 'rgba(124,109,250,0.1)', color: 'var(--accent)', fontWeight: 500, border: '1px solid var(--border-accent)' }}>
                      {selectedFormat?.icon} {form.outputFormat}
                    </span>
                    <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>{form.platform} · {form.objective}</span>
                  </div>
                  <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setRegenOpen(o => !o)}>
                    <RefreshCw size={12} /> Regenerate
                  </button>
                  <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={handleSaveToLibrary} disabled={savingLibrary || librarySaved}>
                    {librarySaved ? <><CheckCircle2 size={12} /> Approved</> : <><CheckCircle2 size={12} /> Approve</>}
                  </button>
                </div>
                {regenOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea
                      value={regenContext}
                      onChange={e => setRegenContext(e.target.value)}
                      placeholder="What should be revised? (e.g. make the hook more curiosity-driven, shorten the caption, change CTA to be softer…)"
                      rows={2}
                      autoFocus
                      style={{ fontSize: 13, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none', lineHeight: 1.5 }}
                      onFocus={e => e.target.style.borderColor = 'var(--border-accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-accent" style={{ fontSize: 12, padding: '6px 14px' }}
                        onClick={handleRegenerateWithContext} disabled={!regenContext.trim() || loading}>
                        {loading ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Regenerating…</> : <><Sparkles size={12} /> Regenerate with context</>}
                      </button>
                      <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                        onClick={() => { setRegenOpen(false); setRegenContext('') }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
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
                  <strong style={{ color: 'var(--text-secondary)' }}>Framework:</strong> {form.framework || 'PAS'} &nbsp;·&nbsp;
                  <strong style={{ color: 'var(--accent)' }}><Sparkles size={11} style={{ display: 'inline', marginBottom: -2 }} /> Marketing Skills:</strong> Active (Copywriting, Social Content)
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
                          {['#', 'Copy On Visual', 'Visual Direction', 'Sketch Reference', ''].map(h => (
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
                            <td style={{ padding: '10px 12px', width: 140, textAlign: 'center' }}>
                              {!slideSketches[idx] ? (
                                <button onClick={() => handleGenerateSketch('slide', idx, `${slide.visual_direction} - ${slide.copy_on_visual}`)} disabled={sketchLoading[`slide-${idx}`]}
                                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-3)', cursor: sketchLoading[`slide-${idx}`] ? 'not-allowed' : 'pointer', fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto', opacity: sketchLoading[`slide-${idx}`] ? 0.6 : 1 }}>
                                  {sketchLoading[`slide-${idx}`] ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <PenTool size={12} />} 
                                  {sketchLoading[`slide-${idx}`] ? 'Generating...' : 'Draw Image'}
                                </button>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', alignItems: 'center' }}>
                                  <img src={slideSketches[idx]} alt={`Slide ${slide.slide_number} sketch`} style={{ width: '100%', maxWidth: 120, borderRadius: 8, border: '1px solid var(--border)', cursor: 'zoom-in' }} onClick={() => setFullScreenImg(slideSketches[idx])} />
                                  <textarea
                                    placeholder="Revision notes (optional)…"
                                    value={sketchRevision[`slide-${idx}`] || ''}
                                    onChange={e => setSketchRevision(prev => ({ ...prev, [`slide-${idx}`]: e.target.value }))}
                                    style={{ width: '100%', fontSize: 10, padding: '4px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-secondary)', resize: 'none', outline: 'none', minHeight: 36, fontFamily: 'var(--font-body)' }}
                                  />
                                  <button
                                    onClick={() => handleGenerateSketch('slide', idx, `${slide.visual_direction} - ${slide.copy_on_visual}${sketchRevision[`slide-${idx}`] ? '. Revise: ' + sketchRevision[`slide-${idx}`] : ''}`)}
                                    disabled={sketchLoading[`slide-${idx}`]}
                                    style={{ background: 'none', border: 'none', cursor: sketchLoading[`slide-${idx}`] ? 'not-allowed' : 'pointer', fontSize: 10, color: 'var(--text-tertiary)', textDecoration: 'underline', opacity: sketchLoading[`slide-${idx}`] ? 0.6 : 1 }}>
                                    {sketchLoading[`slide-${idx}`] ? 'Generating...' : 'Redraw'}
                                  </button>
                                </div>
                              )}
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
                          {['Scene', 'Script / Dialogue', 'Visual Direction', 'Storyboard Sketch', ''].map(h => (
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
                            <td style={{ padding: '10px 12px', width: 140, textAlign: 'center' }}>
                              {!sceneSketches[idx] ? (
                                <button onClick={() => handleGenerateSketch('scene', idx, `${scene.visual_direction} - ${scene.script}`)} disabled={sketchLoading[`scene-${idx}`]}
                                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-3)', cursor: sketchLoading[`scene-${idx}`] ? 'not-allowed' : 'pointer', fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto', opacity: sketchLoading[`scene-${idx}`] ? 0.6 : 1 }}>
                                  {sketchLoading[`scene-${idx}`] ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <PenTool size={12} />} 
                                  {sketchLoading[`scene-${idx}`] ? 'Generating...' : 'Draw Image'}
                                </button>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                                  <textarea
                                    placeholder="Revision notes (optional)…"
                                    value={sketchRevision[`scene-${idx}`] || ''}
                                    onChange={e => setSketchRevision(prev => ({ ...prev, [`scene-${idx}`]: e.target.value }))}
                                    style={{ width: '100%', fontSize: 10, padding: '4px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-secondary)', resize: 'none', outline: 'none', minHeight: 38, fontFamily: 'var(--font-body)' }}
                                  />
                                  <img src={sceneSketches[idx]} alt={`Scene ${scene.scene_number} sketch`} style={{ width: '100%', maxWidth: 120, borderRadius: 8, border: '1px solid var(--border)', cursor: 'zoom-in' }} onClick={() => setFullScreenImg(sceneSketches[idx])} />
                                  <button
                                    onClick={() => handleGenerateSketch('scene', idx, `${scene.visual_direction} - ${scene.script}${sketchRevision[`scene-${idx}`] ? '. Revise: ' + sketchRevision[`scene-${idx}`] : ''}`)}
                                    disabled={sketchLoading[`scene-${idx}`]}
                                    style={{ background: 'none', border: 'none', cursor: sketchLoading[`scene-${idx}`] ? 'not-allowed' : 'pointer', fontSize: 10, color: 'var(--text-tertiary)', textDecoration: 'underline', opacity: sketchLoading[`scene-${idx}`] ? 0.6 : 1 }}>
                                    {sketchLoading[`scene-${idx}`] ? 'Generating...' : 'Redraw'}
                                  </button>
                                </div>
                              )}
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
                  extra={<CopyBtn text={editCopyOnVisual} />}>
                  <textarea value={editCopyOnVisual} onChange={e => setEditCopyOnVisual(e.target.value)} rows={3}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'vertical', fontSize: 14.5, color: 'var(--text-primary)', lineHeight: 1.65, fontWeight: 500, fontFamily: 'var(--font-body)', padding: 0 }} />
                </OutputSection>
              )}

              {/* Caption */}
              {output.caption && (
                <OutputSection icon={MessageSquare} label="Caption" color="var(--blue)" extra={<CopyBtn text={editCaption} />}>
                  <textarea value={editCaption} onChange={e => setEditCaption(e.target.value)} rows={5}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'vertical', fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.75, fontFamily: 'var(--font-body)', padding: 0 }} />
                </OutputSection>
              )}

              {/* CTA + Hashtags */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                <OutputSection icon={ArrowRight} label="CTA Options" color="var(--green)"
                  extra={<button onClick={() => setEditCtaOptions(p => [...p, ''])} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>+ Add</button>}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {editCtaOptions.map((cta, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input value={cta} onChange={e => setEditCtaOptions(p => p.map((c, j) => j === i ? e.target.value : c))}
                          style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 10px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-body)', outline: 'none' }}
                          onFocus={e => e.target.style.borderColor = 'var(--border-accent)'}
                          onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                        <CopyBtn text={cta} />
                        <button onClick={() => setEditCtaOptions(p => p.filter((_, j) => j !== i))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4, lineHeight: 1 }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </OutputSection>
                <OutputSection icon={Hash} label="Hashtag Pack" color="var(--amber)" extra={<CopyBtn text={editHashtags} />}>
                  <textarea value={editHashtags} onChange={e => setEditHashtags(e.target.value)} rows={4}
                    placeholder="#tag1 #tag2 #tag3…"
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'vertical', fontSize: 13, color: 'var(--amber)', lineHeight: 1.7, fontFamily: 'var(--font-body)', padding: 0 }} />
                </OutputSection>
              </div>

              {output.visual_direction && (
                <OutputSection icon={Image} label="Visual Direction" color="var(--text-secondary)" extra={<CopyBtn text={editVisualDirection} />}>
                  <textarea value={editVisualDirection} onChange={e => setEditVisualDirection(e.target.value)} rows={3}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'vertical', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, fontStyle: 'italic', fontFamily: 'var(--font-body)', padding: 0 }} />
                  
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reference Image</span>
                      <button onClick={() => handleGenerateSketch('single', undefined, `${editVisualDirection} - ${editCopyOnVisual}`)} disabled={sketchLoading['single']}
                        style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: sketchLoading['single'] ? 'not-allowed' : 'pointer', fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5, opacity: sketchLoading['single'] ? 0.6 : 1 }}>
                        {sketchLoading['single'] ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <PenTool size={12} />} 
                        {sketchLoading['single'] ? 'Generating...' : (sketchUrl ? 'Redraw Image' : 'Draw Image')}
                      </button>
                    </div>
                    {sketchUrl && (
                      <div style={{ width: '100%', maxWidth: 300, margin: '0 auto', background: 'var(--surface-2)', padding: 8, borderRadius: 10, border: '1px solid var(--border)' }}>
                        <img src={sketchUrl} alt="Visual Reference Sketch" style={{ width: '100%', borderRadius: 6, display: 'block', cursor: 'zoom-in' }} onClick={() => setFullScreenImg(sketchUrl)} />
                      </div>
                    )}
                  </div>
                </OutputSection>
              )}
              {output.rationale && (
                <OutputSection icon={Info} label="Rationale" color="var(--text-tertiary)" extra={undefined}>
                  <textarea value={editRationale} onChange={e => setEditRationale(e.target.value)} rows={3}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'vertical', fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.65, fontFamily: 'var(--font-body)', padding: 0 }} />
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

      {fullScreenImg && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }} onClick={() => setFullScreenImg(null)}>
          <button style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '10px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onClick={() => setFullScreenImg(null)}>
            <X size={24} />
          </button>
          <img src={fullScreenImg} alt="Fullscreen Sketch" style={{ maxHeight: '90vh', maxWidth: '90vw', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()} />
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

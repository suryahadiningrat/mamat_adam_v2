'use client'
import { useState, useEffect } from 'react'
import {
  Zap, ChevronDown, Sparkles, Copy, RefreshCw,
  CheckCircle2, Hash, Image, MessageSquare, ArrowRight,
  ToggleLeft, ToggleRight, Info, Brain, Package
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Mock brand/product data (replace with Supabase queries) ─────────────────
const mockBrands = [
  { id: '1', name: 'Lumière', category: 'Beauty', toneOfVoice: 'Bold, playful, youthful', personality: 'Confident and expressive', audience: 'Urban women 22-35', vocabularyBlacklist: ['murah', 'murahan', 'biasa'], vocabularyWhitelist: ['glow', 'luminous', 'ritual'], brandPromise: 'Every woman deserves to glow', messagingRules: 'Never compare to competitors. Always lead with confidence. Avoid medical claims.' },
  { id: '2', name: 'Velox', category: 'Sports', toneOfVoice: 'Energetic, direct, motivational', personality: 'Ambitious challenger', audience: 'Active men and women 18-35', vocabularyBlacklist: [], vocabularyWhitelist: ['push', 'faster', 'edge'], brandPromise: 'Built for those who refuse to slow down', messagingRules: 'Lead with performance. Use action verbs. Keep it punchy.' },
  { id: '3', name: 'Korridor', category: 'Furniture', toneOfVoice: 'Calm, considered, understated', personality: 'Intelligent minimalist', audience: 'Urban professionals 28-45', vocabularyBlacklist: ['murah', 'promo'], vocabularyWhitelist: ['craft', 'space', 'design'], brandPromise: 'Spaces that think as clearly as you do', messagingRules: 'Avoid hype. Celebrate craft and intention.' },
]

const mockProducts: Record<string, { id: string; name: string; type: string; usp: string; rtb: string; keyClaims: string[]; mandatoryDisclaimers: string; targetAudience: string; emotionalBenefits: string }[]> = {
  '1': [
    { id: 'p1', name: 'Hydra Serum', type: 'Skincare', usp: '72-hour hydration lock', rtb: 'Hyaluronic acid 5-layer technology', keyClaims: ['72h hydration', 'Non-comedogenic', 'Dermatologist tested'], mandatoryDisclaimers: 'Results may vary. Not for sensitive skin without patch test.', targetAudience: 'Dry skin sufferers 22-40', emotionalBenefits: 'Finally feel confident in your skin' },
    { id: 'p2', name: 'Night Repair', type: 'Skincare', usp: 'Overnight cell renewal', rtb: 'Retinol + Niacinamide complex', keyClaims: ['Reduces fine lines in 4 weeks', 'Safe for daily use'], mandatoryDisclaimers: 'Avoid sun exposure after use. Start with 2x/week.', targetAudience: 'Anti-aging focused women 28-45', emotionalBenefits: 'Wake up to visibly better skin' },
  ],
  '2': [
    { id: 'p3', name: 'Runner Pro', type: 'Footwear', usp: 'Carbon plate energy return', rtb: '35% more energy return than standard foam', keyClaims: ['Faster recovery', 'Race-day performance', 'Lightweight 210g'], mandatoryDisclaimers: '', targetAudience: 'Competitive runners', emotionalBenefits: 'Run your best race' },
  ],
  '3': [
    { id: 'p4', name: 'Office Chair X', type: 'Furniture', usp: '8-hour comfort engineering', rtb: 'Lumbar-adaptive mesh system', keyClaims: ['Adjustable in 12 directions', '3-year warranty'], mandatoryDisclaimers: '', targetAudience: 'Remote workers and office professionals', emotionalBenefits: 'Work without distraction from discomfort' },
  ],
}

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

// ─── Select component ─────────────────────────────────────────────────────────
function Select({ label, options, value, onChange, placeholder }: {
  label: string; options: string[]; value: string;
  onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', appearance: 'none', background: 'var(--surface-3)',
            border: '1px solid var(--border)', borderRadius: 8, padding: '8px 32px 8px 12px',
            fontSize: 13.5, color: value ? 'var(--text-primary)' : 'var(--text-tertiary)',
            fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none',
            transition: 'border-color 0.15s'
          }}
          onFocus={e => e.target.style.borderColor = 'var(--border-accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        >
          <option value="">{placeholder || `Select ${label}`}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={13} style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-tertiary)', pointerEvents: 'none'
        }} />
      </div>
    </div>
  )
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
        borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-3)',
        cursor: 'pointer', fontSize: 11.5, color: copied ? 'var(--green)' : 'var(--text-secondary)',
        transition: 'all 0.15s', fontFamily: 'var(--font-body)'
      }}
    >
      {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

// ─── Output section card ──────────────────────────────────────────────────────
function OutputSection({ icon: Icon, label, color, children, extra }: {
  icon: typeof Zap; label: string; color: string; children: React.ReactNode; extra?: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--surface-3)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface-2)'
      }}>
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

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function GeneratePage() {
  const [advancedMode, setAdvancedMode] = useState(false)
  const [loading, setLoading] = useState(false)
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

  useEffect(() => {
    async function loadWs() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: roles } = await supabase.from('user_workspace_roles').select('workspace_id').eq('user_id', user.id).limit(1)
        if (roles?.[0]) setWorkspaceId(roles[0].workspace_id)
      }
    }
    loadWs()
  }, [])

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const selectedBrand = mockBrands.find(b => b.id === form.brandId)
  const availableProducts = form.brandId ? (mockProducts[form.brandId] || []) : []
  const selectedProduct = availableProducts.find(p => p.id === form.productId)

  const canGenerate = form.brandId && form.productId && form.platform && form.objective

  async function handleGenerate() {
    if (!canGenerate || !selectedBrand || !selectedProduct) return
    setLoading(true)
    setOutput(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: selectedBrand,
          product: selectedProduct,
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

  return (
    <div>
      {/* Header */}
      <div className="page-header page-header-row fade-up fade-up-1">
        <div>
          <h1 className="page-title">Content Generator</h1>
          <p className="page-subtitle">Generate platform-native content from Brand Brain and Product Brain.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
            {advancedMode ? 'Advanced' : 'Basic'} mode
          </span>
          <button
            onClick={() => setAdvancedMode(m => !m)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center' }}
          >
            {advancedMode ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: output ? '380px 1fr' : '480px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Left: Config panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Brand + Product */}
          <div className="panel fade-up fade-up-2">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Brain size={14} style={{ color: 'var(--text-secondary)' }} /> Context
              </span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Select label="Brand" options={mockBrands.map(b => b.name)}
                value={selectedBrand?.name || ''}
                onChange={v => { set('brandId')(mockBrands.find(b => b.name === v)?.id || ''); set('productId')('') }}
                placeholder="Select a brand" />
              <Select label="Product" options={availableProducts.map(p => p.name)}
                value={selectedProduct?.name || ''}
                onChange={v => set('productId')(availableProducts.find(p => p.name === v)?.id || '')}
                placeholder={form.brandId ? 'Select a product' : 'Select brand first'} />

              {/* Brand context preview */}
              {selectedBrand && (
                <div style={{
                  background: 'var(--surface-4)', borderRadius: 8, padding: '10px 12px',
                  border: '1px solid var(--border)', fontSize: 12
                }}>
                  <div style={{ color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Brain Context</div>
                  <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <span style={{ color: 'var(--accent)' }}>Tone:</span> {selectedBrand.toneOfVoice}
                  </div>
                  {selectedProduct && (
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 2 }}>
                      <span style={{ color: 'var(--green)' }}>USP:</span> {selectedProduct.usp}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Platform + Objective */}
          <div className="panel fade-up fade-up-3">
            <div className="panel-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Zap size={14} style={{ color: 'var(--text-secondary)' }} /> Target
              </span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Platform pills */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Platform</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {platforms.map(p => (
                    <button key={p} onClick={() => set('platform')(p)} style={{
                      padding: '5px 11px', borderRadius: 20, fontSize: 12.5, fontWeight: 500,
                      cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-body)',
                      border: form.platform === p ? `1.5px solid ${platformColors[p]}` : '1px solid var(--border)',
                      background: form.platform === p ? `${platformColors[p]}18` : 'var(--surface-3)',
                      color: form.platform === p ? platformColors[p] : 'var(--text-secondary)',
                    }}>{p}</button>
                  ))}
                </div>
              </div>
              <Select label="Objective" options={objectives} value={form.objective} onChange={set('objective')} />
            </div>
          </div>

          {/* Advanced controls */}
          {advancedMode && (
            <div className="panel fade-up fade-up-4">
              <div className="panel-header">
                <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Package size={14} style={{ color: 'var(--text-secondary)' }} /> Strategy Controls
                </span>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Select label="Framework" options={frameworks} value={form.framework} onChange={set('framework')} placeholder="PAS (recommended)" />
                <Select label="Hook Type" options={hookTypes} value={form.hookType} onChange={set('hookType')} placeholder="Curiosity (recommended)" />
                <Select label="Tone Variation" options={toneVariations} value={form.tone} onChange={set('tone')} />
                <Select label="Visual Style" options={visualStyles} value={form.visualStyle} onChange={set('visualStyle')} />
                <Select label="Output Length" options={outputLengths} value={form.outputLength} onChange={set('outputLength')} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Additional Context</label>
                  <textarea
                    value={form.additionalContext}
                    onChange={e => set('additionalContext')(e.target.value)}
                    placeholder="Ramadan campaign, promo 30%, target ibu muda…"
                    rows={3}
                    style={{
                      background: 'var(--surface-3)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)',
                      fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none',
                      transition: 'border-color 0.15s', lineHeight: 1.5
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--border-accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Generate button */}
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={!canGenerate || loading}
            style={{
              width: '100%', justifyContent: 'center', padding: '11px',
              fontSize: 14, opacity: (!canGenerate || loading) ? 0.5 : 1,
              cursor: (!canGenerate || loading) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? (
              <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
            ) : (
              <><Sparkles size={14} /> Generate Content</>
            )}
          </button>

          {!canGenerate && (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: -4 }}>
              Select brand, product, platform and objective to continue
            </p>
          )}

          {/* Usage stats */}
          {usage && (
            <div style={{
              background: 'var(--surface-3)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '10px 12px', fontSize: 11.5
            }}>
              <div style={{ color: 'var(--text-tertiary)', marginBottom: 6, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Token Usage</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-secondary)' }}>In: <strong style={{ color: 'var(--text-primary)' }}>{usage.input_tokens}</strong></span>
                <span style={{ color: 'var(--text-secondary)' }}>Out: <strong style={{ color: 'var(--text-primary)' }}>{usage.output_tokens}</strong></span>
                {usage.cache_read_input_tokens > 0 && (
                  <span style={{ color: 'var(--green)' }}>✓ Cached: {usage.cache_read_input_tokens}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Output + Helper */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {output ? (
            <>
              {/* Actions bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 12
              }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                    {selectedBrand?.name} / {selectedProduct?.name} / {form.platform}
                  </span>
                  <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-tertiary)' }}>{form.objective}</span>
                </div>
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
                  onClick={handleGenerate}>
                  <RefreshCw size={12} /> Regenerate All
                </button>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }}>
                  <CheckCircle2 size={12} /> Approve
                </button>
              </div>

              {/* Source context summary */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
                background: 'rgba(124,109,250,0.06)', border: '1px solid var(--border-accent)',
                borderRadius: 10, fontSize: 12.5
              }}>
                <Info size={13} style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--accent)' }}>Brand tone:</strong> {selectedBrand?.toneOfVoice} &nbsp;·&nbsp;
                  <strong style={{ color: 'var(--green)' }}>USP:</strong> {selectedProduct?.usp} &nbsp;·&nbsp;
                  <strong style={{ color: 'var(--text-secondary)' }}>Framework:</strong> {form.framework || 'PAS'}
                </span>
              </div>

              {/* Output sections */}
              <OutputSection icon={Zap} label="Hook" color="var(--accent)"
                extra={<div style={{ display: 'flex', gap: 6 }}><CopyBtn text={output.hook} /><button className="btn btn-secondary" style={{ fontSize: 11.5, padding: '4px 9px' }} onClick={handleGenerate}><RefreshCw size={11} />Regen</button></div>}>
                <p style={{ fontSize: 14.5, color: 'var(--text-primary)', lineHeight: 1.65, fontWeight: 500 }}>{output.hook}</p>
              </OutputSection>

              <OutputSection icon={MessageSquare} label="Main Copy" color="var(--blue)"
                extra={<CopyBtn text={output.main_copy} />}>
                <p style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{output.main_copy}</p>
              </OutputSection>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <OutputSection icon={ArrowRight} label="CTA Options" color="var(--green)" extra={undefined}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {output.cta_options?.map((cta, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 8, padding: '7px 10px', background: 'var(--surface-2)',
                        borderRadius: 7, border: '1px solid var(--border)', fontSize: 13
                      }}>
                        <span style={{ color: 'var(--text-primary)' }}>{cta}</span>
                        <CopyBtn text={cta} />
                      </div>
                    ))}
                  </div>
                </OutputSection>

                <OutputSection icon={Hash} label="Hashtag Pack" color="var(--amber)" extra={<CopyBtn text={output.hashtag_pack?.join(' ')} />}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {output.hashtag_pack?.map((tag, i) => (
                      <span key={i} style={{
                        fontSize: 12.5, padding: '3px 9px', borderRadius: 20,
                        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                        color: 'var(--amber)', cursor: 'pointer'
                      }}>{tag}</span>
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

              {/* Bottom actions */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                  Save to Library
                </button>
                <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                  Use in Campaign
                </button>
                <button className="btn btn-secondary">
                  <Copy size={13} /> Export
                </button>
              </div>
            </>
          ) : (
            /* Empty state + helper panel */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '48px 32px', textAlign: 'center'
              }}>
                <Sparkles size={32} style={{ color: 'var(--accent)', margin: '0 auto 14px', display: 'block' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                  Ready to generate
                </h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
                  Configure the left panel and click Generate. FCE will build a complete content bundle from your Brand Brain and Product Brain.
                </p>
              </div>

              {/* Recommendation helper */}
              {selectedBrand && (
                <div className="panel">
                  <div className="panel-header">
                    <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Sparkles size={14} style={{ color: 'var(--accent)' }} /> Recommended Settings
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Based on {selectedBrand.name} history</span>
                  </div>
                  <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 7 }}>Top Frameworks</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['PAS', 'BAB'].map(f => <span key={f} className="rec-chip highlight">{f}</span>)}
                        {['AIDA'].map(f => <span key={f} className="rec-chip">{f}</span>)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 7 }}>Top Hooks</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['Curiosity', 'Pain Point'].map(h => <span key={h} className="rec-chip highlight">{h}</span>)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

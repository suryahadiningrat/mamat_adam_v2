'use client'
import { useState, useEffect, useCallback } from 'react'
import { Library, Search, CheckCircle2, Clock, XCircle, Copy, ChevronDown, Heart, MessageCircle, Send, Bookmark, Repeat2, BarChart2, Image, ThumbsUp, Share2, Play } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Status = 'approved' | 'draft' | 'rejected'
type Platform = 'Instagram' | 'TikTok' | 'YouTube' | 'Twitter/X' | 'LinkedIn' | 'Facebook'

const platformColors: Record<string, string> = {
  Instagram: '#e1306c', TikTok: '#ee1d52', YouTube: '#ff0000',
  'Twitter/X': '#1d9bf0', LinkedIn: '#0a66c2', Facebook: '#1877f2'
}

const statusConfig: Record<Status, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  approved: { label: 'Approved', cls: 'status-approved', Icon: CheckCircle2 },
  draft: { label: 'Draft', cls: 'status-draft', Icon: Clock },
  rejected: { label: 'Rejected', cls: 'status-rejected', Icon: XCircle },
}

type OutputRecord = {
  id: string
  copy_on_visual: string
  caption: string
  cta_options: string[]
  hashtag_pack: string[]
  slides?: any[]
  scenes?: any[]
  visual_direction?: string
  status: Status
  created_at: string
  request: {
    platform: Platform
    output_format?: string
    brand: { name: string }
    product: { name: string }
  }
}

export default function LibraryPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [items, setItems] = useState<OutputRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [workspaceId, setWorkspaceId] = useState('')
  const [mockupItem, setMockupItem] = useState<OutputRecord | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: roles } = await supabase.from('user_workspace_roles').select('workspace_id').eq('user_id', user.id).limit(1)
    if (!roles?.[0]) { setLoading(false); return }

    const wsId = roles[0].workspace_id
    setWorkspaceId(wsId)

    const { data, error } = await supabase
      .from('generation_outputs')
      .select(`
        id, copy_on_visual, caption, slides, scenes, cta_options, hashtag_pack, visual_direction, status, created_at,
        request:generation_requests (
          platform,
          output_format,
          brand:brands(name),
          product:products(name)
        )
      `)
      .eq('workspace_id', wsId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const parsed = data.map((d: any) => ({
        ...d,
        request: Array.isArray(d.request) ? d.request[0] : d.request
      }))
      setItems(parsed)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = items.filter(item => {
    const brandName = item.request?.brand?.name || ''
    const matchSearch = item.copy_on_visual?.toLowerCase().includes(search.toLowerCase()) ||
                        item.caption?.toLowerCase().includes(search.toLowerCase()) ||
                        brandName.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || item.status === statusFilter
    const matchPlatform = platformFilter === 'all' || item.request?.platform === platformFilter
    return matchSearch && matchStatus && matchPlatform
  })

  const timeAgo = (dateStr: string) => {
    const days = Math.round((Date.now() - new Date(dateStr).getTime()) / 86400000)
    if (days === 0) return 'Today'
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-days, 'day')
  }

  const updateStatus = async (id: string, newStatus: Status) => {
    setUpdatingStatus(true)
    await supabase.from('generation_outputs').update({ status: newStatus }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i))
    setMockupItem(prev => prev?.id === id ? { ...prev, status: newStatus } : prev)
    setUpdatingStatus(false)
  }

  // ─── Platform Mockups ─────────────────────────────────────────────────────

  // ─── Format-aware content panel (shown in all mockups below the platform visual) ───
  function ContentPanel({ item }: { item: OutputRecord }) {
    const hasSlides = item.slides && item.slides.length > 0
    const hasScenes = item.scenes && item.scenes.length > 0
    const tableHead = { padding: '8px 12px', textAlign: 'left' as const, fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, letterSpacing: '0.4px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }
    const tableCell = { padding: '10px 12px', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, verticalAlign: 'top' as const, borderBottom: '1px solid var(--border)' }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
        {hasSlides && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', background: 'rgba(124,109,250,0.08)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🎠 Carousel — {item.slides!.length} Slides
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr><th style={tableHead}>#</th><th style={tableHead}>Copy On Visual</th><th style={tableHead}>Visual Direction</th></tr>
              </thead>
              <tbody>
                {item.slides!.map((s: any, i: number) => (
                  <tr key={i}>
                    <td style={{ ...tableCell, width: 32, textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>{s.slide_number}</td>
                    <td style={tableCell}>{s.copy_on_visual}</td>
                    <td style={{ ...tableCell, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{s.visual_direction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hasScenes && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', background: 'rgba(248,113,113,0.08)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🎬 Video Script — {item.scenes!.length} Scenes
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr><th style={tableHead}>Scene</th><th style={tableHead}>Script / Dialogue</th><th style={tableHead}>Visual Direction</th></tr>
              </thead>
              <tbody>
                {item.scenes!.map((s: any, i: number) => (
                  <tr key={i}>
                    <td style={{ ...tableCell, width: 50, textAlign: 'center', fontWeight: 700, color: 'var(--red)' }}>{s.scene_number}</td>
                    <td style={tableCell}>{s.script}</td>
                    <td style={{ ...tableCell, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{s.visual_direction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!hasSlides && !hasScenes && item.copy_on_visual && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Copy On Visual</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>{item.copy_on_visual}</p>
          </div>
        )}
        {item.caption && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Caption</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>{item.caption}</p>
          </div>
        )}
        {item.cta_options?.[0] && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>CTA:</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{item.cta_options[0]}</span>
          </div>
        )}
        {item.hashtag_pack && item.hashtag_pack.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {item.hashtag_pack.map((tag: string, i: number) => (
              <span key={i} style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--amber)' }}>{tag}</span>
            ))}
          </div>
        )}
        {item.visual_direction && (
          <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6, border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Visual Direction: </span>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{item.visual_direction}</span>
          </div>
        )}
      </div>
    )
  }

  function InstagramMockup({ item }: { item: OutputRecord }) {
    const handle = item.request?.brand?.name?.toLowerCase().replace(/\s/g, '') || 'brand'
    const initial = item.request?.brand?.name?.charAt(0) || 'F'
    return (
      <div style={{ width: '100%' }}>
        <div style={{ background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', marginBottom: 12 }}>
          <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #efefef' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e1306c', fontSize: 12, fontWeight: 700 }}>{initial}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#262626' }}>{handle}</div>
              <div style={{ fontSize: 11, color: '#8e8e8e' }}>Sponsored</div>
            </div>
          </div>
          <div style={{ width: '100%', aspectRatio: '1/1', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image size={32} color="#c0c0c0" />
          </div>
          <div style={{ padding: '10px 14px 4px', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 14 }}><Heart size={22} color="#262626" /><MessageCircle size={22} color="#262626" /><Send size={22} color="#262626" /></div>
            <Bookmark size={22} color="#262626" />
          </div>
          <div style={{ padding: '4px 14px 14px', fontSize: 13, color: '#262626' }}>
            <span style={{ fontWeight: 600 }}>1,432 likes</span>
          </div>
        </div>
        <ContentPanel item={item} />
      </div>
    )
  }

  function TwitterMockup({ item }: { item: OutputRecord }) {
    const handle = item.request?.brand?.name?.toLowerCase().replace(/\s/g, '') || 'brand'
    const initial = item.request?.brand?.name?.charAt(0) || 'B'
    return (
      <div style={{ width: '100%' }}>
        <div style={{ background: '#000', borderRadius: 12, border: '1px solid #2f3336', overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ padding: '12px 16px', display: 'flex', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: 16 }}>{initial}</div>
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#e7e9ea' }}>{item.request?.brand?.name || 'Brand'}</span>
                <CheckCircle2 size={14} color="#1d9bf0" fill="#1d9bf0" stroke="black" />
                <span style={{ color: '#71767b', fontSize: 13 }}>@{handle}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71767b', marginTop: 14, paddingRight: 20 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}><MessageCircle size={15} /> 42</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}><Repeat2 size={15} /> 14</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}><Heart size={15} /> 402</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}><BarChart2 size={15} /> 12k</span>
              </div>
            </div>
          </div>
        </div>
        <ContentPanel item={item} />
      </div>
    )
  }

  function TikTokMockup({ item }: { item: OutputRecord }) {
    const handle = item.request?.brand?.name?.toLowerCase().replace(/\s/g, '') || 'brand'
    return (
      <div style={{ width: '100%' }}>
        <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden', position: 'relative', marginBottom: 12 }}>
          <div style={{ width: '100%', aspectRatio: '9/16', maxHeight: 280, background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', padding: 16 }}>
            <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)' }}>
              <Play size={40} color="rgba(255,255,255,0.3)" fill="rgba(255,255,255,0.3)" />
            </div>
            <div style={{ position: 'absolute', right: 12, bottom: 60, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
              {[{ Icon: Heart, label: '12.4K' }, { Icon: MessageCircle, label: '842' }, { Icon: Share2, label: 'Share' }].map(({ Icon, label }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Icon size={22} color="white" />
                  <span style={{ fontSize: 9, color: 'white', fontWeight: 600 }}>{label}</span>
                </div>
              ))}
            </div>
            <div style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '20px 0 0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'white', marginBottom: 4 }}>@{handle}</div>
              <div style={{ fontSize: 11, color: '#ee1d52' }}>{item.hashtag_pack?.slice(0, 3).join(' ')}</div>
            </div>
          </div>
        </div>
        <ContentPanel item={item} />
      </div>
    )
  }

  function YouTubeMockup({ item }: { item: OutputRecord }) {
    const handle = item.request?.brand?.name || 'Brand'
    const initial = item.request?.brand?.name?.charAt(0) || 'B'
    return (
      <div style={{ width: '100%' }}>
        <div style={{ background: '#0f0f0f', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ width: '100%', aspectRatio: '16/9', background: 'linear-gradient(135deg,#1a1a2e,#16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play size={20} color="white" fill="white" />
            </div>
            <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.8)', color: 'white', fontSize: 11, fontWeight: 600, padding: '2px 5px', borderRadius: 4 }}>1:32</div>
          </div>
          <div style={{ padding: '10px 12px', display: 'flex', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#ff0000', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>{initial}</div>
            <div>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{handle} · 12K views · 3 days ago</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 0, borderTop: '1px solid #272727', padding: '0 12px' }}>
            {[{ Icon: ThumbsUp, label: '4.2K' }, { Icon: Share2, label: 'Share' }, { Icon: Bookmark, label: 'Save' }].map(({ Icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', fontSize: 12, color: '#aaa', cursor: 'pointer' }}>
                <Icon size={14} /> {label}
              </div>
            ))}
          </div>
        </div>
        <ContentPanel item={item} />
      </div>
    )
  }

  function LinkedInMockup({ item }: { item: OutputRecord }) {
    const brandName = item.request?.brand?.name || 'Brand'
    const initial = brandName.charAt(0)
    return (
      <div style={{ width: '100%' }}>
        <div style={{ background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', marginBottom: 12 }}>
          <div style={{ padding: '12px 16px', display: 'flex', gap: 10, borderBottom: '1px solid #e0e0e0' }}>
            <div style={{ width: 48, height: 48, borderRadius: 4, background: '#0a66c2', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 20 }}>{initial}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#000' }}>{brandName}</div>
              <div style={{ fontSize: 12, color: '#666' }}>Company Page · Promoted</div>
            </div>
          </div>
          <div style={{ padding: '8px 16px', borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
            <span>👍 ❤️ 💡 <span style={{ color: '#444' }}>247</span></span>
            <span>32 comments</span>
          </div>
          <div style={{ display: 'flex', borderTop: '1px solid #e0e0e0' }}>
            {['Like', 'Comment', 'Repost', 'Send'].map(a => (
              <div key={a} style={{ flex: 1, padding: '8px 0', textAlign: 'center', fontSize: 12, color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <ThumbsUp size={13} /> {a}
              </div>
            ))}
          </div>
        </div>
        <ContentPanel item={item} />
      </div>
    )
  }

  function GenericMockup({ item }: { item: OutputRecord }) {
    const platform = item.request?.platform
    const fmt = item.request?.output_format
    return (
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-block', padding: '4px 10px', background: `${platformColors[platform] || '#888'}18`, color: platformColors[platform] || '#888', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{platform}</div>
          {fmt && <div style={{ display: 'inline-block', padding: '4px 10px', background: 'rgba(124,109,250,0.1)', color: 'var(--accent)', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid var(--border-accent)' }}>{fmt}</div>}
        </div>
        <ContentPanel item={item} />
      </div>
    )
  }

  function renderMockup(item: OutputRecord) {
    const p = item.request?.platform
    if (p === 'Instagram') return <InstagramMockup item={item} />
    if (p === 'Twitter/X') return <TwitterMockup item={item} />
    if (p === 'TikTok') return <TikTokMockup item={item} />
    if (p === 'YouTube') return <YouTubeMockup item={item} />
    if (p === 'LinkedIn') return <LinkedInMockup item={item} />
    return <GenericMockup item={item} />
  }

  return (
    <div>
      <div className="page-header page-header-row fade-up fade-up-1">
        <div>
          <h1 className="page-title">Content Library</h1>
          <p className="page-subtitle">Your database of generated social media content.</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }} className="fade-up fade-up-2">
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search content, hooks, brands…"
            style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px 8px 34px', fontSize: 13.5, color: 'var(--text-primary)', outline: 'none' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} style={{ appearance: 'none', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 32px 8px 12px', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }}>
            <option value="all">All Platforms</option>
            {Object.keys(platformColors).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ appearance: 'none', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 32px 8px 12px', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }}>
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="draft">Draft</option>
            <option value="rejected">Rejected</option>
          </select>
          <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
        </div>
        <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)', alignSelf: 'center', marginLeft: 4 }}>{filtered.length} items</span>
      </div>

      {/* Table */}
      <div className="panel fade-up fade-up-3">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-1)' }}>
                {['Copy On Visual', 'Brand', 'Platform', 'Status', 'Generated', ''].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  No content saved yet. <a href="/generate" style={{ color: 'var(--accent)' }}>Generate your first →</a>
                </td></tr>
              ) : filtered.map(item => {
                const { cls, Icon } = statusConfig[item.status] || statusConfig['draft']
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    onClick={() => setMockupItem(item)}>
                    <td style={{ padding: '12px 16px', maxWidth: 350 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.copy_on_visual || (item.slides ? '[Carousel Format]' : item.scenes ? '[Video Format]' : '')}</div>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{item.request?.brand?.name || 'Unknown'}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{item.request?.product?.name}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 20, color: platformColors[item.request?.platform] || '#888', background: `${platformColors[item.request?.platform] || '#888'}18`, border: `1px solid ${platformColors[item.request?.platform] || '#888'}40`, whiteSpace: 'nowrap' }}>
                        {item.request?.platform || 'Unknown'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`status-pill ${cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                        <Icon size={10} />{statusConfig[item.status]?.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{timeAgo(item.created_at)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={e => { e.stopPropagation(); setMockupItem(item) }}>View</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mockup Modal */}
      {mockupItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
        }} onClick={() => setMockupItem(null)}>

          <div style={{
            background: 'var(--surface-1)', width: '100%', maxWidth: 580,
            borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)', border: '1px solid var(--border)',
            maxHeight: '90vh'
          }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {mockupItem.request?.platform}{mockupItem.request?.output_format ? ` · ${mockupItem.request.output_format}` : ''} Preview
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => navigator.clipboard.writeText([mockupItem?.copy_on_visual, mockupItem?.caption, mockupItem?.cta_options?.[0], mockupItem?.hashtag_pack?.join(' ')].filter(Boolean).join('\n\n'))}
                  className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }}>
                  <Copy size={11} /> Copy All
                </button>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }} onClick={() => setMockupItem(null)}>
                  <XCircle size={18} />
                </button>
              </div>
            </div>

            {/* Mockup Canvas */}
            <div style={{ padding: 20, background: 'var(--surface-3)', overflowY: 'auto', flex: 1 }}>
              {renderMockup(mockupItem)}
            </div>

            {/* Status actions */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginRight: 4 }}>Status:</span>
              {(['approved', 'draft', 'rejected'] as Status[]).map(s => {
                const { Icon, label } = statusConfig[s]
                const isActive = mockupItem.status === s
                return (
                  <button key={s} onClick={() => updateStatus(mockupItem.id, s)} disabled={updatingStatus || isActive}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: isActive ? 'default' : 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-body)',
                      background: isActive ? (s === 'approved' ? 'rgba(34,211,160,0.15)' : s === 'rejected' ? 'rgba(248,113,113,0.15)' : 'rgba(245,158,11,0.15)') : 'var(--surface-3)',
                      color: isActive ? (s === 'approved' ? 'var(--green)' : s === 'rejected' ? 'var(--red)' : 'var(--amber)') : 'var(--text-tertiary)',
                      border: isActive ? `1px solid ${s === 'approved' ? 'rgba(34,211,160,0.4)' : s === 'rejected' ? 'rgba(248,113,113,0.4)' : 'rgba(245,158,11,0.4)'}` : '1px solid var(--border)',
                    }}>
                    <Icon size={11} />{label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

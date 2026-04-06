'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { Brain, Plus, Trash2, X, Save, AlertCircle, Package, ImageIcon, UploadCloud } from 'lucide-react'

type Brand = {
  id: string
  name: string
}

type Product = {
  id: string
  name: string
  slug: string
  image_url?: string
  product_type: string
  summary: string
  brand_id: string
  brand?: Brand
  brain?: ProductBrain
}

type ProductBrain = {
  id: string
  usp: string
  rtb: string
  functional_benefits: any
  emotional_benefits: any
  target_audience: string
  price_tier: string
}

export default function ProductsPage() {
  const { workspaceId } = useWorkspace()
  const [products, setProducts] = useState<Product[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    image_url: '',
    product_type: '',
    summary: '',
    brand_id: '',
    usp: '',
    rtb: '',
    functional_benefits: '',
    emotional_benefits: '',
    target_audience: '',
    price_tier: ''
  })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadingImage(true)
    setErrorMsg('')
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const filePath = `${workspaceId}/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('product_images')
        .upload(filePath, file)
        
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage
        .from('product_images')
        .getPublicUrl(filePath)
        
      setFormData(prev => ({ ...prev, image_url: publicUrl }))
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading image')
    } finally {
      setUploadingImage(false)
    }
  }

  useEffect(() => {
    if (workspaceId) loadData()
  }, [workspaceId])

  async function loadData() {
    setLoading(true)
    const wsId = workspaceId
    if (!wsId) { setLoading(false); return }

    const [{ data: brandsData }, { data: productsData }] = await Promise.all([
      supabase.from('brands').select('id, name').eq('workspace_id', wsId).order('name'),
      supabase.from('products').select(`
        id, name, slug, image_url, product_type, summary, brand_id,
        brands ( id, name ),
        product_brain_versions (
          id, usp, rtb, functional_benefits, emotional_benefits, target_audience, price_tier
        )
      `).eq('workspace_id', wsId).order('created_at', { ascending: false })
    ])

    if (brandsData) setBrands(brandsData)

    if (productsData) {
      const parsed = productsData.map((p: any) => ({
        ...p,
        brand: Array.isArray(p.brands) ? p.brands[0] : p.brands,
        brain: p.product_brain_versions?.[0] ? {
          ...p.product_brain_versions[0],
          functional_benefits: typeof p.product_brain_versions[0].functional_benefits === 'string'
            ? p.product_brain_versions[0].functional_benefits
            : JSON.stringify(p.product_brain_versions[0].functional_benefits || []),
          emotional_benefits: typeof p.product_brain_versions[0].emotional_benefits === 'string'
            ? p.product_brain_versions[0].emotional_benefits
            : JSON.stringify(p.product_brain_versions[0].emotional_benefits || []),
        } : undefined
      }))
      setProducts(parsed)
    }

    setLoading(false)
  }

  const handleOpenModal = (product?: Product) => {
    setErrorMsg('')
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name || '',
        image_url: product.image_url || '',
        product_type: product.product_type || '',
        summary: product.summary || '',
        brand_id: product.brand_id || '',
        usp: product.brain?.usp || '',
        rtb: product.brain?.rtb || '',
        functional_benefits: product.brain?.functional_benefits || '',
        emotional_benefits: product.brain?.emotional_benefits || '',
        target_audience: product.brain?.target_audience || '',
        price_tier: product.brain?.price_tier || ''
      })
    } else {
      setEditingProduct(null)
      setFormData({
        name: '', image_url: '', product_type: '', summary: '', brand_id: brands[0]?.id || '',
        usp: '', rtb: '', functional_benefits: '', emotional_benefits: '',
        target_audience: '', price_tier: ''
      })
    }
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name) { setErrorMsg('Product name is required.'); return }
    if (!formData.brand_id) { setErrorMsg('Please select a brand.'); return }
    setSaving(true)
    setErrorMsg('')

    let parsedFunctional = formData.functional_benefits
    let parsedEmotional = formData.emotional_benefits
    try { if (formData.functional_benefits) parsedFunctional = JSON.parse(formData.functional_benefits) } catch(e) {}
    try { if (formData.emotional_benefits) parsedEmotional = JSON.parse(formData.emotional_benefits) } catch(e) {}

    try {
      let currentProductId = editingProduct?.id

      if (editingProduct) {
        await supabase.from('products').update({
          name: formData.name,
          image_url: formData.image_url,
          product_type: formData.product_type,
          summary: formData.summary,
          brand_id: formData.brand_id,
          updated_at: new Date().toISOString()
        }).eq('id', editingProduct.id)

        if (editingProduct.brain) {
          await supabase.from('product_brain_versions').update({
            usp: formData.usp,
            rtb: formData.rtb,
            functional_benefits: parsedFunctional,
            emotional_benefits: parsedEmotional,
            target_audience: formData.target_audience,
            price_tier: formData.price_tier
          }).eq('id', editingProduct.brain.id)
        } else {
          await supabase.from('product_brain_versions').insert({
            product_id: editingProduct.id,
            brand_id: formData.brand_id,
            workspace_id: workspaceId,
            version_no: 1,
            usp: formData.usp,
            rtb: formData.rtb,
            functional_benefits: parsedFunctional,
            emotional_benefits: parsedEmotional,
            target_audience: formData.target_audience,
            price_tier: formData.price_tier,
            status: 'approved'
          })
        }
      } else {
        const slug = formData.name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(Math.random() * 1000)
        const { data: productData, error: productErr } = await supabase.from('products').insert({
          workspace_id: workspaceId,
          brand_id: formData.brand_id,
          name: formData.name,
          slug,
          image_url: formData.image_url,
          product_type: formData.product_type,
          summary: formData.summary,
          status: 'active'
        }).select().single()

        if (productErr) throw productErr
        currentProductId = productData.id

        await supabase.from('product_brain_versions').insert({
          product_id: currentProductId,
          brand_id: formData.brand_id,
          workspace_id: workspaceId,
          version_no: 1,
          usp: formData.usp,
          rtb: formData.rtb,
          functional_benefits: parsedFunctional,
          emotional_benefits: parsedEmotional,
          target_audience: formData.target_audience,
          price_tier: formData.price_tier,
          status: 'approved'
        })
      }

      await loadData()
      setIsModalOpen(false)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving product')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this product? This will also remove all associated content requests.')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(products.filter(p => p.id !== id))
  }

  return (
    <div>
      <div className="page-header page-header-row fade-up fade-up-1">
        <div>
          <h1 className="page-title">Product Brain</h1>
          <p className="page-subtitle">Manage your products and their AI-powered content context.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={15} /> Add Product
        </button>
      </div>

      <div className="fade-up fade-up-2" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {loading ? (
          <div style={{ padding: 20, color: 'var(--text-tertiary)' }}>Loading products...</div>
        ) : products.length === 0 ? (
          <div style={{
            padding: 40, textAlign: 'center', background: 'var(--surface-2)',
            borderRadius: 12, border: '1px dashed var(--border)'
          }}>
            <Package size={32} style={{ color: 'var(--text-tertiary)', marginBottom: 16, margin: '0 auto' }} />
            <h3 style={{ fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>No Products Yet</h3>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 20 }}>
              Add your first product to start generating product-specific content.
            </p>
            <button className="btn btn-primary" style={{ margin: '0 auto' }} onClick={() => handleOpenModal()}>
              Add Product
            </button>
          </div>
        ) : (
          brands.filter(b => products.some(p => p.brand_id === b.id)).map(brand => {
            const brandProducts = products.filter(p => p.brand_id === brand.id)
            return (
              <div key={brand.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                    {brand.name.charAt(0)}
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{brand.name}</h2>
                  <span style={{ background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 12, fontSize: 12, color: 'var(--text-tertiary)' }}>{brandProducts.length}</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                  {brandProducts.map(product => (
                    <div key={product.id} className="panel" style={{ cursor: 'pointer', transition: 'all 0.2s', position: 'relative', padding: 24, display: 'flex', flexDirection: 'column' }}
                         onClick={() => handleOpenModal(product)}>

                      <button onClick={(e) => handleDelete(product.id, e)} style={{
                        position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 6,
                        color: 'white', cursor: 'pointer', padding: 6, zIndex: 10, backdropFilter: 'blur(4px)'
                      }} title="Delete Product">
                        <Trash2 size={14} />
                      </button>

                      {product.image_url ? (
                        <div style={{ position: 'relative', width: 'calc(100% + 48px)', margin: '-24px -24px 20px -24px', height: 160, borderRadius: '12px 12px 0 0', overflow: 'hidden', background: 'var(--surface-2)' }}>
                          <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div style={{ position: 'relative', width: 'calc(100% + 48px)', margin: '-24px -24px 20px -24px', height: 80, borderRadius: '12px 12px 0 0', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <ImageIcon size={24} style={{ color: 'rgba(59, 130, 246, 0.4)' }} />
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        {!product.image_url && (
                          <div style={{
                            width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 18, flexShrink: 0
                          }}>
                            {product.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{product.name}</h3>
                          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                            {product.product_type ? product.product_type : 'Product'}
                          </div>
                        </div>
                      </div>

                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'auto', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 40 }}>
                        {product.summary || 'No summary provided.'}
                      </p>

                      <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12, border: '1px solid var(--border)', marginTop: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <Brain size={12} style={{ color: '#3b82f6' }} />
                          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>Product Brain</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 2 }}>USP</div>
                            <div style={{ fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {product.brain?.usp || '-'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 2 }}>Price Tier</div>
                            <div style={{ fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {product.brain?.price_tier || '-'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Editor Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          padding: 20
        }}>
          <div className="panel fade-up" style={{
            width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto',
            padding: 0, display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface-1)', zIndex: 10 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {editingProduct ? 'Edit Product' : 'New Product'}
                </h2>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>Define the product's identity and AI content context.</div>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
              {errorMsg && (
                <div style={{ padding: 12, background: 'var(--red-alpha)', border: '1px solid var(--red)', borderRadius: 8, color: 'var(--red)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <AlertCircle size={14} /> {errorMsg}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Digital Marketing Retainer" />
                </div>
                <div className="form-group">
                  <label className="form-label">Brand *</label>
                  <select className="form-input" value={formData.brand_id} onChange={e => setFormData({...formData, brand_id: e.target.value})}>
                    <option value="">Select a brand...</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Product Image</label>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {formData.image_url ? (
                    <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <img src={formData.image_url} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => setFormData({...formData, image_url: ''})} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: 8, background: 'var(--surface-2)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                      <ImageIcon size={24} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <UploadCloud size={16} />
                      {uploadingImage ? 'Uploading...' : 'Upload Image'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} disabled={uploadingImage} />
                    </label>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
                      Recommended size: 800x600px. JPG or PNG.
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">Product Type</label>
                  <input className="form-input" value={formData.product_type} onChange={e => setFormData({...formData, product_type: e.target.value})} placeholder="e.g. Service, SaaS, Physical" />
                </div>
                <div className="form-group">
                  <label className="form-label">Price Tier</label>
                  <input className="form-input" value={formData.price_tier} onChange={e => setFormData({...formData, price_tier: e.target.value})} placeholder="e.g. Premium, Mid-range, Budget" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Product Summary</label>
                <textarea className="form-input" rows={2} value={formData.summary} onChange={e => setFormData({...formData, summary: e.target.value})} placeholder="Brief description of what this product offers..." />
              </div>

              <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Brain size={16} style={{ color: '#3b82f6' }}/> Product Brain
              </h3>

              <div className="form-group">
                <label className="form-label">Unique Selling Proposition (USP)</label>
                <textarea className="form-input" rows={2} value={formData.usp} onChange={e => setFormData({...formData, usp: e.target.value})} placeholder="What makes this product uniquely valuable? Why choose it over alternatives?" />
              </div>

              <div className="form-group">
                <label className="form-label">Reason to Believe (RTB)</label>
                <textarea className="form-input" rows={2} value={formData.rtb} onChange={e => setFormData({...formData, rtb: e.target.value})} placeholder="Evidence or proof points that back up the USP..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">Functional Benefits</label>
                  <textarea className="form-input" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }} rows={4} value={formData.functional_benefits} onChange={e => setFormData({...formData, functional_benefits: e.target.value})} placeholder='["Saves 10 hours/week", "Reduces cost by 30%"]' />
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>Accepts plain text or JSON array.</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Emotional Benefits</label>
                  <textarea className="form-input" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }} rows={4} value={formData.emotional_benefits} onChange={e => setFormData({...formData, emotional_benefits: e.target.value})} placeholder='["Feel confident", "Peace of mind"]' />
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>Accepts plain text or JSON array.</div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Target Audience</label>
                <input className="form-input" value={formData.target_audience} onChange={e => setFormData({...formData, target_audience: e.target.value})} placeholder="e.g. SME owners looking to scale digital presence" />
              </div>
            </div>

            <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'var(--surface-2)', position: 'sticky', bottom: 0 }}>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : <><Save size={15}/> Save Product</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

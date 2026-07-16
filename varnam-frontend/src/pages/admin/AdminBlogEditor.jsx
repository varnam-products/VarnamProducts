// src/pages/admin/AdminBlogEditor.jsx
// Create / edit a blog post. Full-page form (not a modal) since blog content
// runs long. Shares the visual language of the other admin CRUD screens.
//
// APIs:
//   GET    /api/blog/admin/:id     → load full post (drafts included) for editing
//   POST   /api/upload/blog        → upload cover image
//   DELETE /api/upload             → purge a replaced/removed cover image
//   POST   /api/blog               → create
//   PUT    /api/blog/:id           → update

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import toast from 'react-hot-toast'
import { blogAPI, uploadAPI } from '../../services/api'
import { decodeHtmlEntities } from '../../utils/decodeHtmlEntities'

/* ─── Icons ──────────────────────────────────────────────────────────────── */
const Ico = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
)
const IconArrowLeft = () => <Ico d={<><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>} />
const IconUpload  = () => <Ico size={20} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>} />
const IconX        = ({ size = 16 }) => <Ico size={size} d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />
const IconCheck    = () => <Ico d={<polyline points="20 6 9 17 4 12"/>} />
const IconSave     = () => <Ico d={<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>} />
const IconGlobe    = () => <Ico size={13} d={<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>} />
const IconTag      = ({ size = 13 }) => <Ico size={size} d={<><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>} />
const IconInfo     = () => <Ico size={13} d={<><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>} />
const IconClock    = () => <Ico size={12} d={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />

function Spinner({ color = '#fff', size = 14 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${color}40`, borderTopColor: color,
      display: 'inline-block', animation: 'spin 0.7s linear infinite', flexShrink: 0,
    }} />
  )
}

/* ─── Shared field styles ────────────────────────────────────────────────── */
const cardStyle = { background: '#fff', borderRadius: 18, border: '1px solid #F0EBE1', boxShadow: '0 2px 16px rgba(45,106,79,0.06)', padding: 22 }
const labelStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 600, color: '#3D3830', marginBottom: 7 }
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid #E8E0D0', background: '#FAFAF7',
  fontFamily: 'var(--font-body)', fontSize: 13.5, color: '#26221C',
  outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
}
const focus = (e) => { e.target.style.borderColor = '#2D6A4F'; e.target.style.boxShadow = '0 0 0 3px rgba(45,106,79,0.1)' }
const blur  = (e) => { e.target.style.borderColor = '#E8E0D0'; e.target.style.boxShadow = 'none' }
const counterStyle = (over) => ({ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: over ? '#DC2626' : '#C4B9A8' })

const btnStyle = (variant) => ({
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
  transition: 'all 0.18s', whiteSpace: 'nowrap',
  ...(variant === 'primary' && { background: 'linear-gradient(135deg,#2D6A4F,#1B4332)', color: '#fff', boxShadow: '0 4px 14px rgba(45,106,79,0.28)' }),
  ...(variant === 'ghost'   && { background: '#fff', color: '#5C5548', border: '1.5px solid #E8E0D0' }),
  ...(variant === 'outline' && { background: 'rgba(45,106,79,0.06)', color: '#2D6A4F', border: '1.5px solid rgba(45,106,79,0.25)' }),
})

// Auto-estimate reading time client-side — purely a preview; the server
// recomputes this from the saved content on every save, same formula.
function estimateReadTime(content) {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

function slugPreview(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

const emptyForm = {
  title: '', excerpt: '', content: '', coverImage: '', coverImagePublicId: '',
  author: 'Varnam Foods', tags: [], metaTitle: '', metaDescription: '', published: false,
}

/* ─── Tag chip input ─────────────────────────────────────────────────────── */
function TagInput({ tags, onChange }) {
  const [draft, setDraft] = useState('')

  const addTag = () => {
    const v = draft.trim()
    if (!v) return
    if (!tags.some(t => t.toLowerCase() === v.toLowerCase())) onChange([...tags, v])
    setDraft('')
  }

  const removeTag = (t) => onChange(tags.filter(x => x !== t))

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, ...inputStyle, padding: '4px 4px 4px 12px' }}>
          <span style={{ color: '#A89F8C', flexShrink: 0 }}><IconTag /></span>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
            placeholder="Add a tag and press Enter…"
            style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-body)', fontSize: 13, color: '#26221C', width: '100%', padding: '7px 0' }}
          />
        </div>
        <button type="button" onClick={addTag} style={{ ...btnStyle('outline'), padding: '0 16px' }}>Add</button>
      </div>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {tags.map(t => (
            <span key={t} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 6px 4px 10px', borderRadius: 99,
              background: 'rgba(45,106,79,0.08)', color: '#2D6A4F',
              fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
            }}>
              {t}
              <button type="button" onClick={() => removeTag(t)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', border: 'none', background: 'rgba(45,106,79,0.15)', color: '#2D6A4F', cursor: 'pointer', padding: 0 }}>
                <IconX size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Toggle switch ──────────────────────────────────────────────────────── */
function Toggle({ value, onChange, label, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: '#26221C', margin: 0 }}>{label}</p>
        {hint && <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: '#A89F8C', margin: '2px 0 0' }}>{hint}</p>}
      </div>
      <div onClick={() => onChange(!value)} style={{
        width: 42, height: 24, borderRadius: 99, position: 'relative', cursor: 'pointer', flexShrink: 0,
        background: value ? '#2D6A4F' : '#E5E7EB',
        transition: 'background 0.2s',
        boxShadow: value ? '0 0 0 3px rgba(45,106,79,0.15)' : 'none',
      }}>
        <span style={{
          position: 'absolute', top: 3, left: value ? 21 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s',
        }} />
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function AdminBlogEditor() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()

  const [form, setForm]         = useState(emptyForm)
  const [loading, setLoading]   = useState(isEdit)
  const [saving, setSaving]     = useState(null) // null | 'draft' | 'publish'
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)
  const pageRef = useRef(null)

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    blogAPI.getAdminById(id)
      .then(({ data }) => {
        if (cancelled || !data.success) return
        const p = data.data
        setForm({
          title: decodeHtmlEntities(p.title) || '',
          excerpt: decodeHtmlEntities(p.excerpt) || '',
          content: decodeHtmlEntities(p.content) || '',
          coverImage: p.coverImage || '',
          coverImagePublicId: p.coverImagePublicId || '',
          author: decodeHtmlEntities(p.author) || 'Varnam Foods',
          tags: (p.tags || []).map(t => decodeHtmlEntities(t)),
          metaTitle: decodeHtmlEntities(p.metaTitle) || '',
          metaDescription: decodeHtmlEntities(p.metaDescription) || '',
          published: !!p.published,
        })
      })
      .catch(() => toast.error('Failed to load post'))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, isEdit])

  useGSAP(() => {
    if (pageRef.current)
      gsap.fromTo(pageRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' })
  }, [loading])

  /* Cover image upload */
  const handleImageFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) { toast.error('Select an image file'); return }
    setUploading(true)
    const prevPublicId = form.coverImagePublicId
    try {
      const { data } = await uploadAPI.uploadBlogImage(file)
      const url = data.url || data.data?.url || ''
      const pid = data.publicId || data.data?.publicId || ''
      setForm(prev => ({ ...prev, coverImage: url, coverImagePublicId: pid }))
      toast.success('Cover image uploaded')
      if (prevPublicId) {
        try { await uploadAPI.deleteAsset(prevPublicId, 'image') } catch { /* non-fatal */ }
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleImageFile(file)
  }

  const removeCoverImage = async () => {
    const pid = form.coverImagePublicId
    setForm(prev => ({ ...prev, coverImage: '', coverImagePublicId: '' }))
    if (pid) {
      try { await uploadAPI.deleteAsset(pid, 'image') } catch { /* non-fatal */ }
    }
  }

  /* Validation */
  const errors = {
    title: form.title.trim().length > 0 && form.title.trim().length < 3 ? 'Too short' : null,
    excerpt: form.excerpt.length > 200 ? 'Too long' : null,
    metaTitle: form.metaTitle.length > 70 ? 'Too long' : null,
    metaDescription: form.metaDescription.length > 160 ? 'Too long' : null,
  }

  const canSubmit = form.title.trim().length >= 3 && form.excerpt.trim().length > 0 &&
    form.content.trim().length > 0 && form.coverImage && !errors.excerpt && !errors.metaTitle && !errors.metaDescription

  const buildPayload = (publishOverride) => ({
    title: form.title.trim(),
    excerpt: form.excerpt.trim(),
    content: form.content.trim(),
    coverImage: form.coverImage,
    coverImagePublicId: form.coverImagePublicId || null,
    author: form.author.trim() || 'Varnam Foods',
    tags: form.tags,
    metaTitle: form.metaTitle.trim(),
    metaDescription: form.metaDescription.trim(),
    published: publishOverride,
  })

  const handleSave = async (publishOverride) => {
    if (!canSubmit) {
      toast.error('Please fill in title, excerpt, content, and a cover image')
      return
    }
    setSaving(publishOverride ? 'publish' : 'draft')
    try {
      const payload = buildPayload(publishOverride)
      if (isEdit) {
        const { data } = await blogAPI.update(id, payload)
        if (data.success) {
          toast.success(publishOverride ? 'Post published' : 'Draft saved')
          navigate('/admin/blog')
        }
      } else {
        const { data } = await blogAPI.create(payload)
        if (data.success) {
          toast.success(publishOverride ? 'Post published' : 'Draft created')
          navigate('/admin/blog')
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save post')
    } finally {
      setSaving(null)
    }
  }

  const wordCount = form.content.trim() ? form.content.trim().split(/\s+/).filter(Boolean).length : 0
  const readTime = estimateReadTime(form.content)

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="skeleton" style={{ height: 32, width: '30%', borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 220, borderRadius: 18 }} />
        <div className="skeleton" style={{ height: 220, borderRadius: 18 }} />
        <style>{`
          @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          .skeleton { background: linear-gradient(90deg, #F5F0E8 25%, #EDE8DF 50%, #F5F0E8 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
        `}</style>
      </div>
    )
  }

  return (
    <div ref={pageRef}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/admin/blog" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, border: '1.5px solid #E8E0D0', background: '#fff', color: '#5C5548', textDecoration: 'none', flexShrink: 0 }}>
            <IconArrowLeft />
          </Link>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.2rem,2vw,1.6rem)', color: '#26221C', margin: 0 }}>
              {isEdit ? 'Edit Post' : 'New Post'}
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: '#A89F8C', margin: '2px 0 0' }}>
              {form.published ? 'Live on the blog' : 'Draft — not visible on the site yet'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => handleSave(false)} disabled={!!saving} style={btnStyle('ghost')}>
            {saving === 'draft' ? <Spinner color="#5C5548" /> : <IconSave />}
            Save as Draft
          </button>
          <button onClick={() => handleSave(true)} disabled={!!saving} style={btnStyle('primary')}>
            {saving === 'publish' ? <Spinner /> : <IconCheck />}
            {form.published ? 'Save & Keep Live' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="blog-editor-grid">

        {/* Main column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          <div style={cardStyle}>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>
                <span>Title <span style={{ color: '#DC2626' }}>*</span></span>
                <span style={counterStyle(form.title.length > 140)}>{form.title.length}/140</span>
              </label>
              <input value={form.title} onChange={set('title')} placeholder="e.g. 5 Benefits of Cold-Pressed Coconut Oil"
                maxLength={140} style={{ ...inputStyle, fontSize: 16, fontWeight: 600 }} onFocus={focus} onBlur={blur} />
              {form.title.trim() && (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: '#A89F8C', margin: '6px 0 0' }}>
                  URL: varnamfoods.com/blog/<strong style={{ color: '#7A7265' }}>{slugPreview(form.title)}</strong>
                </p>
              )}
              {errors.title && <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: '#DC2626', margin: '4px 0 0' }}>{errors.title}</p>}
            </div>

            <div>
              <label style={labelStyle}>
                <span>Excerpt <span style={{ color: '#DC2626' }}>*</span> <span style={{ fontWeight: 400, color: '#A89F8C' }}>— shown in listings & search results</span></span>
                <span style={counterStyle(form.excerpt.length > 200)}>{form.excerpt.length}/200</span>
              </label>
              <textarea value={form.excerpt} onChange={set('excerpt')} placeholder="A short, compelling summary of the article…"
                maxLength={220} rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-body)' }} onFocus={focus} onBlur={blur} />
            </div>
          </div>

          <div style={cardStyle}>
            <label style={labelStyle}>
              <span>Content <span style={{ color: '#DC2626' }}>*</span> <span style={{ fontWeight: 400, color: '#A89F8C' }}>— plain text, separate paragraphs with a blank line</span></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#C4B9A8' }}>{wordCount} words</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-body)', fontSize: 11, color: '#C4B9A8' }}><IconClock /> ~{readTime} min read</span>
              </span>
            </label>
            <textarea value={form.content} onChange={set('content')} placeholder="Write your article here…

Leave a blank line between paragraphs — that's how the site tells them apart."
              rows={18} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-body)', lineHeight: 1.7, minHeight: 360 }} onFocus={focus} onBlur={blur} />
          </div>

          {/* SEO */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ color: '#2D6A4F' }}><IconGlobe /></span>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15, color: '#26221C', margin: 0 }}>Search & Social (SEO)</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>
                  <span>Meta Title <span style={{ fontWeight: 400, color: '#A89F8C' }}>— defaults to the title if left blank</span></span>
                  <span style={counterStyle(form.metaTitle.length > 70)}>{form.metaTitle.length}/70</span>
                </label>
                <input value={form.metaTitle} onChange={set('metaTitle')} maxLength={80} placeholder={form.title || 'Meta title'}
                  style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label style={labelStyle}>
                  <span>Meta Description <span style={{ fontWeight: 400, color: '#A89F8C' }}>— shown under the title in Google</span></span>
                  <span style={counterStyle(form.metaDescription.length > 160)}>{form.metaDescription.length}/160</span>
                </label>
                <textarea value={form.metaDescription} onChange={set('metaDescription')} maxLength={180} rows={2} placeholder={form.excerpt || 'Meta description'}
                  style={{ ...inputStyle, resize: 'vertical' }} onFocus={focus} onBlur={blur} />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Cover image */}
          <div style={cardStyle}>
            <label style={labelStyle}>
              <span>Cover Image <span style={{ color: '#DC2626' }}>*</span></span>
            </label>
            <div
              onClick={() => !uploading && fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragOver ? '#2D6A4F' : form.coverImage ? '#52B788' : '#E8E0D0'}`,
                borderRadius: 12, cursor: uploading ? 'wait' : 'pointer',
                background: dragOver ? 'rgba(45,106,79,0.04)' : '#FAFAF7',
                overflow: 'hidden', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: form.coverImage ? 'auto' : 140,
              }}
            >
              {form.coverImage ? (
                <div style={{ position: 'relative', width: '100%' }}>
                  <img src={form.coverImage} alt="Cover preview" style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }} />
                  <button
                    onClick={e => { e.stopPropagation(); removeCoverImage() }}
                    style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(38,34,28,0.7)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <IconX />
                  </button>
                </div>
              ) : uploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 0' }}>
                  <Spinner color="#2D6A4F" size={22} />
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#A89F8C', margin: 0 }}>Uploading…</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 0', color: '#A89F8C' }}>
                  <IconUpload />
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, margin: 0 }}>Click or drag to upload</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, margin: 0, color: '#C8BDB0' }}>Recommended: 1200×630px</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => handleImageFile(e.target.files[0])} />
          </div>

          {/* Publish status */}
          <div style={cardStyle}>
            <Toggle
              value={form.published}
              onChange={v => setForm(prev => ({ ...prev, published: v }))}
              label={form.published ? 'Published' : 'Draft'}
              hint={form.published ? 'Visible to everyone on /blog' : 'Only visible here in the admin panel'}
            />
          </div>

          {/* Author */}
          <div style={cardStyle}>
            <label style={labelStyle}><span>Author</span></label>
            <input value={form.author} onChange={set('author')} placeholder="Varnam Foods" style={inputStyle} onFocus={focus} onBlur={blur} />
          </div>

          {/* Tags */}
          <div style={cardStyle}>
            <label style={labelStyle}><span>Tags <span style={{ fontWeight: 400, color: '#A89F8C' }}>— used for filtering on the blog</span></span></label>
            <TagInput tags={form.tags} onChange={tags => setForm(prev => ({ ...prev, tags }))} />
          </div>

          {/* Tip */}
          <div style={{ display: 'flex', gap: 8, background: 'rgba(45,106,79,0.06)', border: '1px solid rgba(45,106,79,0.15)', borderRadius: 12, padding: '12px 14px' }}>
            <span style={{ color: '#2D6A4F', flexShrink: 0, marginTop: 1 }}><IconInfo /></span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: '#2D6A4F', margin: 0, lineHeight: 1.55 }}>
              Read time and the URL slug are calculated automatically from the title and content when you save.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .blog-editor-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .blog-editor-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

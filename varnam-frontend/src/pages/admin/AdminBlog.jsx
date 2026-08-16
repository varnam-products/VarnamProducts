// src/pages/admin/AdminBlog.jsx
// Admin blog list — search, status filter, pagination, publish toggle, delete.
// APIs:
//   GET    /api/blog/admin/all?page&limit&q&status   → paginated list (all posts, incl. drafts)
//   PATCH  /api/blog/publish/:id                      → toggle publish state
//   DELETE /api/blog/:id                               → delete post

import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import toast from 'react-hot-toast'
import { blogAPI, uploadAPI } from '../../services/api'

/* ─── Icons ──────────────────────────────────────────────────────────────── */
const Ico = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
)
const IconEdit3   = ({ size = 18 }) => <Ico size={size} d={<><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></>} />
const IconPlus    = () => <Ico d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} />
const IconEdit    = () => <Ico d={<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>} />
const IconTrash   = () => <Ico d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></>} />
const IconSearch  = () => <Ico d={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>} />
const IconClose   = () => <Ico size={14} d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />
const IconRefresh = () => <Ico d={<><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>} />
const IconEye     = () => <Ico size={15} d={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>} />
const IconEyeOff  = () => <Ico size={15} d={<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>} />
const IconExternal = () => <Ico size={14} d={<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>} />
const IconEyeGlass = ({ size = 48 }) => <Ico size={size} d={<><path d="M2 3l20 18"/><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 5.5-5.5"/></>} />
const IconClock   = () => <Ico size={11} d={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />
const IconTag      = ({ size = 10 }) => <Ico size={size} d={<><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>} />

/* ─── Shared styles ──────────────────────────────────────────────────────── */
const btnStyle = (variant) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
  transition: 'all 0.18s', whiteSpace: 'nowrap',
  ...(variant === 'primary' && { background: 'linear-gradient(135deg,#2D6A4F,#1B4332)', color: '#fff', boxShadow: '0 4px 14px rgba(45,106,79,0.28)' }),
  ...(variant === 'ghost'   && { background: '#fff', color: '#5C5548', border: '1.5px solid #E8E0D0' }),
  ...(variant === 'danger'  && { background: 'rgba(220,38,38,0.08)', color: '#DC2626', border: '1.5px solid rgba(220,38,38,0.2)' }),
  ...(variant === 'icon'    && { background: '#fff', color: '#7A7265', border: '1.5px solid #E8E0D0', padding: '7px 9px' }),
})

function Spinner({ color = '#fff', size = 14 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${color}40`, borderTopColor: color,
      display: 'inline-block', animation: 'spin 0.7s linear infinite', flexShrink: 0,
    }} />
  )
}

/* ─── Modal wrapper (delete confirm) ────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  const overlayRef = useRef(null)
  const boxRef = useRef(null)

  useGSAP(() => {
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 })
    gsap.fromTo(boxRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.28, ease: 'power3.out' })
  }, [])

  const close = () => {
    gsap.to(boxRef.current, { y: 16, opacity: 0, duration: 0.18, ease: 'power2.in' })
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.2, onComplete: onClose })
  }

  return (
    <div ref={overlayRef} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(38,34,28,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => { if (e.target === overlayRef.current) close() }}>
      <div ref={boxRef} style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460,
        boxShadow: '0 24px 80px rgba(38,34,28,0.22)', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F0EBE1' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: '#26221C', margin: 0 }}>{title}</h2>
          <button onClick={close} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, border: '1px solid #E8E0D0', background: '#fff', cursor: 'pointer', color: '#7A7265' }}>
            <IconClose />
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  )
}

function DeleteModal({ post, onConfirm, onClose, loading }) {
  return (
    <Modal title="Delete Blog Post" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {post.coverImage && (
          <img src={post.coverImage} alt={post.title} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10, border: '1px solid #F0EBE1' }} />
        )}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#7A7265', margin: 0, lineHeight: 1.6 }}>
          Delete <strong style={{ color: '#26221C' }}>{post.title}</strong>? This can't be undone
          {post.published && ' — the live article will also stop being reachable'}.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={loading} style={btnStyle('ghost')}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={btnStyle('danger')}>
            {loading ? <Spinner color="#DC2626" /> : <><IconTrash /> Delete</>}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ─── Post card row ──────────────────────────────────────────────────────── */
function PostRow({ post, onEdit, onDelete, onToggle, toggling }) {
  return (
    <div className="blog-row" style={{
      background: '#fff', borderRadius: 16, border: '1px solid #F0EBE1',
      overflow: 'hidden', boxShadow: '0 2px 12px rgba(45,106,79,0.04)',
      opacity: post.published ? 1 : 0.85, transition: 'opacity 0.3s',
    }}>
      <div className="blog-row-inner">
        {/* Thumbnail */}
        <div className="blog-thumb">
          {post.coverImage
            ? <img src={post.coverImage} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minHeight: 92 }} onError={e => { e.target.style.display = 'none' }} />
            : <div style={{ width: '100%', minHeight: 92, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D0C8B5' }}><IconEdit3 size={26} /></div>
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: '#26221C', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {post.title}
            </p>
            <span style={{
              padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-body)', flexShrink: 0,
              background: post.published ? 'rgba(6,95,70,0.09)' : 'rgba(120,113,98,0.1)',
              color: post.published ? '#065F46' : '#7A7265',
            }}>
              {post.published ? 'Published' : 'Draft'}
            </span>
          </div>

          {post.excerpt && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: '#A89F8C', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {post.excerpt}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontFamily: 'var(--font-body)', fontSize: 11.5, color: '#A89F8C' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconClock /> {post.readTimeMinutes} min read</span>
            <span>{post.published ? formatDate(post.publishedAt) : `Updated ${formatDate(post.updatedAt)}`}</span>
            {post.published && <span>{post.views ?? 0} views</span>}
            {post.tags?.length > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconTag /> {post.tags.slice(0, 2).join(', ')}{post.tags.length > 2 && ` +${post.tags.length - 2}`}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="blog-actions">
          {post.published && (
            <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" title="View live"
              style={{ ...btnStyle('icon'), textDecoration: 'none', display: 'flex' }}>
              <IconExternal />
            </a>
          )}
          <button
            onClick={() => onToggle(post)}
            disabled={toggling === post._id}
            title={post.published ? 'Unpublish' : 'Publish'}
            style={{
              ...btnStyle('icon'),
              color: post.published ? '#065F46' : '#A89F8C',
              borderColor: post.published ? 'rgba(6,95,70,0.25)' : '#E8E0D0',
              background: post.published ? 'rgba(6,95,70,0.06)' : '#fff',
            }}
          >
            {toggling === post._id ? <Spinner color={post.published ? '#065F46' : '#A89F8C'} /> : post.published ? <IconEye /> : <IconEyeOff />}
          </button>
          <button onClick={() => onEdit(post)} style={btnStyle('icon')} title="Edit"><IconEdit /></button>
          <button onClick={() => onDelete(post)} style={{ ...btnStyle('icon'), color: '#DC2626', borderColor: 'rgba(220,38,38,0.2)' }} title="Delete"><IconTrash /></button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function AdminBlog() {
  const navigate = useNavigate()

  const [posts, setPosts]           = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 })
  const [loading, setLoading]       = useState(true)
  const [page, setPage]             = useState(1)
  const [search, setSearch]         = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus]         = useState('all') // 'all' | 'published' | 'draft'

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)
  const [toggling, setToggling]         = useState(null)

  const headerRef = useRef(null)
  const listRef   = useRef(null)

  // Debounce search input so we don't hammer the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  // Reset to page 1 whenever the search or status filter changes
  useEffect(() => { setPage(1) }, [debouncedSearch, status])

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 10 }
      if (debouncedSearch) params.q = debouncedSearch
      if (status !== 'all') params.status = status
      const { data } = await blogAPI.getAdminAll(params)
      if (data.success) {
        setPosts(data.data)
        setPagination(data.pagination)
      }
    } catch {
      toast.error('Failed to load blog posts')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, status])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  useGSAP(() => {
    if (headerRef.current)
      gsap.fromTo(headerRef.current, { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' })
  }, [])

  useGSAP(() => {
    if (loading || !listRef.current) return
    gsap.fromTo(listRef.current.querySelectorAll('.blog-row'),
      { x: -14, opacity: 0 },
      { x: 0, opacity: 1, stagger: 0.06, duration: 0.35, ease: 'power3.out' }
    )
  }, [loading])

  const handleToggle = async (post) => {
    setToggling(post._id)
    try {
      const { data } = await blogAPI.togglePublish(post._id)
      if (data.success) {
        setPosts(prev => prev.map(p => p._id === post._id ? { ...p, published: data.data.published, publishedAt: data.data.publishedAt } : p))
        toast.success(data.data.published ? 'Post published' : 'Post unpublished')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update post')
    } finally {
      setToggling(null)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      if (deleteTarget.coverImagePublicId) {
        try { await uploadAPI.deleteAsset(deleteTarget.coverImagePublicId, 'image') } catch { /* non-fatal */ }
      }
      await blogAPI.delete(deleteTarget._id)
      toast.success('Post deleted')
      setDeleteTarget(null)
      // Re-fetch — deleting the last item on a page should fall back a page
      if (posts.length === 1 && page > 1) setPage(p => p - 1)
      else fetchPosts()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete post')
    } finally {
      setDeleting(false)
    }
  }

  const publishedCount = status === 'all' && !debouncedSearch ? posts.filter(p => p.published).length : null
  const draftCount      = status === 'all' && !debouncedSearch ? posts.filter(p => !p.published).length : null

  return (
    <div>
      {/* Header */}
      <div ref={headerRef} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.3rem,2vw,1.7rem)', color: '#26221C', margin: '0 0 4px' }}>Blog</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#A89F8C', margin: 0 }}>
            {pagination.total} {pagination.total === 1 ? 'post' : 'posts'}
            {publishedCount !== null && ` · ${publishedCount} published · ${draftCount} draft`}
          </p>
        </div>
        <button onClick={() => navigate('/admin/blog/new')} style={btnStyle('primary')}>
          <IconPlus /> New Post
        </button>
      </div>

      {/* Card */}
      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #F0EBE1', boxShadow: '0 2px 16px rgba(45,106,79,0.06)', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #F5F0E8', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, border: '1.5px solid #E8E0D0', background: '#FAFAF7', flex: 1, minWidth: 200 }}>
            <span style={{ color: '#A89F8C', flexShrink: 0 }}><IconSearch /></span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search title, excerpt, content, tags…"
              style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-body)', fontSize: 13, color: '#26221C', width: '100%' }} />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A89F8C', display: 'flex', padding: 0 }}><IconClose /></button>
            )}
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', gap: 4, background: '#F5F0E8', borderRadius: 10, padding: 3 }}>
            {[['all', 'All'], ['published', 'Published'], ['draft', 'Drafts']].map(([val, lbl]) => (
              <button key={val} onClick={() => setStatus(val)}
                style={{
                  padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                  background: status === val ? '#fff' : 'transparent',
                  color: status === val ? '#26221C' : '#A89F8C',
                  boxShadow: status === val ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}>
                {lbl}
              </button>
            ))}
          </div>

          {/* Reload */}
          <button onClick={fetchPosts} title="Refresh"
            style={{ width: 36, height: 36, borderRadius: 9, border: '1.5px solid #E8E0D0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5C5548', transition: 'background 0.15s', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = '#F5F0E8'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
            <span style={{ display: 'flex', animation: loading ? 'spin 0.8s linear infinite' : 'none' }}><IconRefresh /></span>
          </button>
        </div>

        {/* List */}
        <div style={{ padding: 16 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 16, border: '1px solid #F0EBE1', display: 'flex', overflow: 'hidden' }}>
                  <div className="skeleton" style={{ width: 150, minHeight: 92, flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="skeleton" style={{ height: 14, width: '35%', borderRadius: 5 }} />
                    <div className="skeleton" style={{ height: 11, width: '55%', borderRadius: 5 }} />
                    <div className="skeleton" style={{ height: 10, width: '30%', borderRadius: 5 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px', textAlign: 'center' }}>
              <div style={{ marginBottom: 14, color: '#D0C8B5' }}><IconEyeGlass /></div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 19, color: '#26221C', margin: '0 0 8px' }}>
                {debouncedSearch ? `No posts matching "${debouncedSearch}"` : status !== 'all' ? `No ${status} posts` : 'No blog posts yet'}
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#A89F8C', margin: '0 0 20px' }}>
                {debouncedSearch || status !== 'all' ? 'Try a different search or filter.' : 'Write your first article to start building organic traffic.'}
              </p>
              {!debouncedSearch && status === 'all' && (
                <button onClick={() => navigate('/admin/blog/new')} style={btnStyle('primary')}><IconPlus /> New Post</button>
              )}
            </div>
          ) : (
            <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {posts.map(p => (
                <PostRow key={p._id} post={p}
                  onEdit={p => navigate(`/admin/blog/edit/${p._id}`)}
                  onDelete={setDeleteTarget}
                  onToggle={handleToggle}
                  toggling={toggling}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && posts.length > 0 && pagination.pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #F5F0E8', flexWrap: 'wrap', gap: 10 }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#A89F8C', margin: 0 }}>
              Page {pagination.page} of {pagination.pages} ({pagination.total} posts)
            </p>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid #E8E0D0', background: '#fff', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, color: '#5C5548' }}>
                ← Prev
              </button>
              {Array.from({ length: Math.min(pagination.pages, 7) }).map((_, i) => {
                const n = i + 1
                return (
                  <button key={n} onClick={() => setPage(n)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, background: page === n ? '#2D6A4F' : 'transparent', color: page === n ? '#fff' : '#5C5548', transition: 'all 0.15s' }}>
                    {n}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid #E8E0D0', background: '#fff', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: page === pagination.pages ? 'not-allowed' : 'pointer', opacity: page === pagination.pages ? 0.4 : 1, color: '#5C5548' }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <DeleteModal post={deleteTarget} loading={deleting} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
      )}

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .skeleton {
          background: linear-gradient(90deg, #F5F0E8 25%, #EDE8DF 50%, #F5F0E8 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }

        .blog-row-inner { display: flex; align-items: stretch; }
        .blog-thumb {
          width: 150px; flex-shrink: 0; background: #F5F0E8; position: relative; overflow: hidden;
        }
        .blog-actions {
          display: flex; align-items: center; gap: 6px; padding: 0 14px; flex-shrink: 0;
        }
        @media (max-width: 560px) {
          .blog-row-inner { flex-direction: column; }
          .blog-thumb     { width: 100%; height: 130px; }
          .blog-thumb img { height: 130px !important; min-height: unset !important; }
          .blog-actions   { padding: 10px 14px 14px; justify-content: flex-end; border-top: 1px solid #F5F0E8; flex-wrap: wrap; }
        }
      `}</style>
    </div>
  )
}

// src/pages/BlogDetail.jsx
import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'

import { blogAPI } from '../services/api'
import BlogCard from '../components/ui/BlogCard'
import { decodeHtmlEntities } from '../utils/decodeHtmlEntities'
import Seo, { SITE_URL } from '../components/common/Seo'

// ─── Icons ──────────────────────────────────────────────────────────────────
const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)
const ChevronRight = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)
const IconWhatsApp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.6.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.5.1-.2 0-.4 0-.5C10 9 9.5 7.7 9.3 7.2c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3 4.8 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z" /></svg>
)
const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.6 8.6L23.3 22H16.9l-5-6.5-5.8 6.5H2.9l8.1-9.2L1.9 2h6.6l4.5 6 5.9-6zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20z" /></svg>
)
const IconFacebook = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z" /></svg>
)
const IconLink = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Renders plain-text content (with blank-line paragraph breaks) as prose.
// Content is entity-decoded but never injected as raw HTML, matching the
// rest of the app's convention (see decodeHtmlEntities.js) — keeps this
// safe even before an admin rich-text editor exists.
function ArticleBody({ content }) {
  const decoded = decodeHtmlEntities(content) || ''
  const paragraphs = decoded.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)

  return (
    <div className="font-body text-[15.5px] sm:text-[16.5px] leading-[1.85] text-neutral-700 space-y-5">
      {paragraphs.map((para, i) => (
        <p key={i}>
          {para.split('\n').map((line, j, arr) => (
            <span key={j}>
              {line}
              {j < arr.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  )
}

export default function BlogDetail() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    window.scrollTo({ top: 0, behavior: 'instant' })

    blogAPI.getBySlug(slug)
      .then(({ data }) => {
        if (cancelled) return
        setPost(data.data)
      })
      .catch(() => { if (!cancelled) setNotFound(true) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [slug])

  // Related articles — same first tag, excluding the current post
  useEffect(() => {
    if (!post?.tags?.[0]) { setRelated([]); return }
    let cancelled = false
    blogAPI.getAll({ tag: post.tags[0], limit: 4 })
      .then(({ data }) => {
        if (cancelled) return
        setRelated((data.data || []).filter((p) => p._id !== post._id).slice(0, 3))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [post])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => toast.success('Link copied to clipboard'))
      .catch(() => toast.error('Could not copy link'))
  }

  if (loading) {
    return (
      <div className="container-main py-16 animate-pulse">
        <div className="h-4 w-40 bg-neutral-100 rounded mb-8" />
        <div className="h-10 w-3/4 bg-neutral-100 rounded mb-4" />
        <div className="h-4 w-52 bg-neutral-100 rounded mb-10" />
        <div className="aspect-[16/9] w-full bg-neutral-100 rounded-2xl mb-10" />
        <div className="max-w-2xl mx-auto space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-3.5 w-full bg-neutral-100 rounded" />)}
        </div>
      </div>
    )
  }

  if (notFound || !post) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
        <Seo title="Article Not Found" description="This article doesn't exist or may have been removed." path={`/blog/${slug}`} noindex />
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-5 text-neutral-300 text-2xl">
          🌿
        </div>
        <h1 className="font-heading text-2xl text-neutral-800 mb-2">Article Not Found</h1>
        <p className="font-body text-neutral-400 text-sm mb-7">This article doesn't exist or may have been removed.</p>
        <Link to="/blog" className="btn-primary text-sm px-6 py-3">Browse All Articles</Link>
      </div>
    )
  }

  const { title: rawTitle, excerpt: rawExcerpt, coverImage, tags, publishedAt, readTimeMinutes, author } = post
  const title = decodeHtmlEntities(rawTitle)
  const excerpt = decodeHtmlEntities(post.metaDescription || rawExcerpt)
  // SEO title tag can be overridden independently of the visible H1 above
  const seoTitle = decodeHtmlEntities(post.metaTitle) || title
  const shareUrl = `${SITE_URL}/blog/${slug}`
  const shareText = encodeURIComponent(title)

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: excerpt,
    image: coverImage ? [coverImage] : undefined,
    datePublished: publishedAt || undefined,
    dateModified: post.updatedAt || publishedAt || undefined,
    author: { '@type': 'Organization', name: author || 'Varnam Foods' },
    publisher: { '@type': 'Organization', name: 'Varnam Foods', logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': shareUrl },
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: title, item: shareUrl },
    ],
  }

  return (
    <div className="bg-white">
      <Seo
        title={seoTitle}
        description={excerpt}
        image={coverImage}
        type="article"
        path={`/blog/${slug}`}
        jsonLd={[articleJsonLd, breadcrumbJsonLd]}
      />

      {/* Breadcrumb */}
      <div className="container-main pt-6 pb-0">
        <nav className="flex items-center gap-1.5 text-xs font-body text-neutral-400">
          <Link to="/" className="hover:text-brand-green transition-colors">Home</Link>
          <ChevronRight />
          <Link to="/blog" className="hover:text-brand-green transition-colors">Blog</Link>
          <ChevronRight />
          <span className="text-neutral-500 truncate max-w-[180px] sm:max-w-xs">{title}</span>
        </nav>
      </div>

      {/* Header */}
      <header className="container-main max-w-3xl pt-8 pb-8 text-center">
        {tags?.[0] && (
          <Link
            to={`/blog?tag=${encodeURIComponent(tags[0])}`}
            className="inline-block text-[11px] font-body font-bold tracking-[0.12em] uppercase text-brand-green bg-brand-green/8 px-3 py-1.5 rounded-full mb-5 hover:bg-brand-green/14 transition-colors"
          >
            {tags[0]}
          </Link>
        )}
        <h1 className="font-heading text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-neutral-800 leading-tight mb-5">
          {title}
        </h1>
        {excerpt && (
          <p className="font-body text-neutral-500 text-base sm:text-lg leading-relaxed mb-6">{excerpt}</p>
        )}
        <div className="flex items-center justify-center gap-2.5 text-[13px] font-body text-neutral-400">
          <span className="font-semibold text-neutral-600">{author || 'Varnam Foods'}</span>
          <span className="w-1 h-1 rounded-full bg-neutral-300" />
          <span>{formatDate(publishedAt)}</span>
          <span className="w-1 h-1 rounded-full bg-neutral-300" />
          <span className="flex items-center gap-1"><ClockIcon /> {readTimeMinutes} min read</span>
        </div>
      </header>

      {/* Cover image */}
      {coverImage && (
        <div className="container-main max-w-4xl mb-10">
          <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-neutral-100 shadow-card">
            <img src={coverImage} alt={title} className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Body + share rail */}
      <div className="container-main max-w-4xl pb-16">
        <div className="flex flex-col sm:flex-row gap-10">
          {/* Share rail (desktop, sticky) */}
          <aside className="hidden sm:flex flex-col items-center gap-3 sticky top-28 h-fit">
            <span className="text-[10px] font-body font-bold tracking-[0.15em] uppercase text-neutral-400 mb-1">Share</span>
            <a href={`https://wa.me/?text=${shareText}%20${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-[#25D366] hover:border-[#25D366] transition-colors" aria-label="Share on WhatsApp">
              <IconWhatsApp />
            </a>
            <a href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-neutral-900 hover:border-neutral-900 transition-colors" aria-label="Share on X">
              <IconX />
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-[#1877F2] hover:border-[#1877F2] transition-colors" aria-label="Share on Facebook">
              <IconFacebook />
            </a>
            <button onClick={handleCopyLink} aria-label="Copy link"
              className="w-9 h-9 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-brand-green hover:border-brand-green transition-colors">
              <IconLink />
            </button>
          </aside>

          {/* Article content */}
          <article className="flex-1 min-w-0">
            <ArticleBody content={post.content} />

            {tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t border-neutral-100">
                {tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/blog?tag=${encodeURIComponent(tag)}`}
                    className="text-xs font-body font-medium text-neutral-500 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-full hover:border-brand-green/40 hover:text-brand-green transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Mobile share row */}
            <div className="flex sm:hidden items-center gap-3 mt-8 pt-6 border-t border-neutral-100">
              <span className="text-[11px] font-body font-bold tracking-[0.12em] uppercase text-neutral-400">Share</span>
              <a href={`https://wa.me/?text=${shareText}%20${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500" aria-label="Share on WhatsApp"><IconWhatsApp /></a>
              <a href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500" aria-label="Share on X"><IconX /></a>
              <button onClick={handleCopyLink} aria-label="Copy link" className="w-9 h-9 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500"><IconLink /></button>
            </div>
          </article>
        </div>
      </div>

      {/* Related articles */}
      {related.length > 0 && (
        <div className="bg-brand-cream/40 border-t border-neutral-100 py-16">
          <div className="container-main">
            <h2 className="font-heading text-2xl font-bold text-neutral-800 mb-8 text-center">More from the journal</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {related.map((p) => <BlogCard key={p._id} post={p} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
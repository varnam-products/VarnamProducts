// src/pages/Blog.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

import { blogAPI } from '../services/api'
import BlogCard from '../components/ui/BlogCard'
import EmptyState from '../components/ui/EmptyState'
import Seo, { SITE_URL } from '../components/common/Seo'

const PAGE_SIZE = 9

// ─── Icons ──────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const LeafIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

// ─── Skeleton card ──────────────────────────────────────────────────────────
function BlogSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white border border-neutral-100 shadow-soft animate-pulse">
      <div className="aspect-[16/10] bg-neutral-100" />
      <div className="p-5 space-y-3">
        <div className="h-3 w-1/3 rounded bg-neutral-100" />
        <div className="h-5 w-3/4 rounded bg-neutral-100" />
        <div className="h-3 w-full rounded bg-neutral-100" />
        <div className="h-3 w-5/6 rounded bg-neutral-100" />
      </div>
    </div>
  )
}

export default function Blog() {
  const [searchParams, setSearchParams] = useSearchParams()

  const activePage = Number(searchParams.get('page')) || 1
  const activeTag  = searchParams.get('tag') || ''
  const initialQ   = searchParams.get('q') || ''

  const [inputValue, setInputValue] = useState(initialQ)
  const [posts, setPosts]           = useState([])
  const [tags, setTags]             = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 })
  const [loading, setLoading]       = useState(true)

  const debounceRef = useRef(null)
  const gridRef      = useRef(null)

  // ── Fetch tags once ───────────────────────────────────────────────────
  useEffect(() => {
    blogAPI.getTags().then(({ data }) => setTags(data.data || [])).catch(() => {})
  }, [])

  // ── Fetch posts whenever page / tag / q changes ──────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    blogAPI
      .getAll({ page: activePage, limit: PAGE_SIZE, tag: activeTag || undefined, q: initialQ || undefined })
      .then(({ data }) => {
        if (cancelled) return
        setPosts(data.data || [])
        setPagination(data.pagination || { total: 0, page: 1, pages: 1 })
      })
      .catch(() => {
        if (!cancelled) { setPosts([]); setPagination({ total: 0, page: 1, pages: 1 }) }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, activeTag, initialQ])

  const updateParams = useCallback((patch) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(patch).forEach(([k, v]) => {
      if (v === '' || v === undefined || v === null) next.delete(k)
      else next.set(k, String(v))
    })
    // Any change other than page resets pagination back to page 1
    if (!('page' in patch)) next.delete('page')
    setSearchParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [searchParams, setSearchParams])

  const handleSearchInput = (e) => {
    const val = e.target.value
    setInputValue(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => updateParams({ q: val.trim() }), 400)
  }
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    clearTimeout(debounceRef.current)
    updateParams({ q: inputValue.trim() })
  }
  const clearSearch = () => { setInputValue(''); updateParams({ q: '' }) }
  useEffect(() => () => clearTimeout(debounceRef.current), [])

  // ── Stagger entrance on new results ──────────────────────────────────
  useGSAP(() => {
    if (loading || !gridRef.current) return
    const cards = gridRef.current.querySelectorAll('.blog-card-anim')
    if (!cards.length) return
    gsap.fromTo(cards, { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.45, ease: 'power3.out', clearProps: 'all' })
  }, { dependencies: [loading, posts], scope: gridRef })

  // ── SEO ──────────────────────────────────────────────────────────────
  const seoTitle = activeTag ? `${activeTag} Articles` : initialQ ? `Search: "${initialQ}"` : 'Blog'
  const seoDescription = 'Guides, recipes and stories on cold-pressed oils, natural wellness and organic living from Varnam Foods.'
  const seoJsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'Varnam Foods Blog',
      url: `${SITE_URL}/blog`,
      description: seoDescription,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      ],
    },
  ]

  const hasActiveFilters = !!(activeTag || initialQ)
  const featuredEligible = activePage === 1 && !hasActiveFilters

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-cream/40 to-white">
      <Seo title={seoTitle} description={seoDescription} path="/blog" jsonLd={seoJsonLd} />

      {/* ── Hero ── */}
      <div className="relative px-5 py-14 sm:py-16 text-center overflow-hidden">
        <div className="absolute -top-16 -right-20 w-80 h-80 rounded-full bg-gradient-radial from-brand-green/10 to-transparent pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-gradient-radial from-brand-amber/10 to-transparent pointer-events-none" />

        <div className="inline-flex items-center gap-2 bg-brand-green/8 border border-brand-green/15 rounded-full px-4 py-1.5 text-xs font-body font-bold text-brand-green tracking-wide uppercase mb-5">
          <LeafIcon /> The Varnam Journal
        </div>

        <h1 className="font-heading text-4xl md:text-5xl font-bold text-neutral-800 tracking-tight leading-tight mb-4">
          Stories from the press room
        </h1>
        <p className="font-body text-neutral-500 max-w-xl mx-auto leading-relaxed mb-8">
          Guides on cold-pressed oils, natural wellness and organic living — straight from the people who make it.
        </p>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative max-w-lg mx-auto">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            <SearchIcon />
          </div>
          <input
            value={inputValue}
            onChange={handleSearchInput}
            placeholder="Search articles…"
            autoComplete="off"
            className="w-full pl-11 pr-11 py-3.5 rounded-2xl border border-neutral-200 bg-white text-sm font-body text-neutral-800 placeholder:text-neutral-400 shadow-soft focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/15 transition-all"
          />
          {inputValue && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 flex items-center justify-center transition-colors"
            >
              <CloseIcon />
            </button>
          )}
        </form>
      </div>

      {/* ── Tag filters ── */}
      {tags.length > 0 && (
        <div className="container-main mb-8">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => updateParams({ tag: '' })}
              className={`text-xs font-body font-semibold tracking-wide px-4 py-2 rounded-full border transition-all ${
                !activeTag
                  ? 'bg-brand-green text-white border-brand-green shadow-sm'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-brand-green/40 hover:text-brand-green'
              }`}
            >
              All
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => updateParams({ tag: activeTag === tag ? '' : tag })}
                className={`text-xs font-body font-semibold tracking-wide px-4 py-2 rounded-full border transition-all ${
                  activeTag === tag
                    ? 'bg-brand-green text-white border-brand-green shadow-sm'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-brand-green/40 hover:text-brand-green'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      <div className="container-main pb-20">
        {!loading && (
          <p className="text-sm font-body text-neutral-400 mb-6 text-center sm:text-left">
            {hasActiveFilters
              ? `${pagination.total} article${pagination.total !== 1 ? 's' : ''} found${activeTag ? ` in "${activeTag}"` : ''}${initialQ ? ` for "${initialQ}"` : ''}`
              : `${pagination.total} article${pagination.total !== 1 ? 's' : ''}`}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <BlogSkeleton key={i} />)}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            title="No Articles Found"
            message={hasActiveFilters ? 'Nothing matches these filters. Try a different search or clear the filters.' : 'Check back soon — new stories are on the way.'}
            actionText={hasActiveFilters ? 'Clear Filters' : undefined}
            onAction={hasActiveFilters ? () => { setInputValue(''); setSearchParams({}) } : undefined}
          />
        ) : (
          <>
            <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, i) => (
                <div key={post._id} className={`blog-card-anim ${featuredEligible && i === 0 ? 'sm:col-span-2' : ''}`}>
                  <BlogCard post={post} featured={featuredEligible && i === 0} />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <nav className="mt-12 flex items-center justify-center gap-2 pt-6 border-t border-neutral-100">
                <button
                  onClick={() => updateParams({ page: activePage - 1 })}
                  disabled={activePage === 1}
                  className="px-4 py-2 rounded-xl border border-neutral-200 bg-white text-sm font-body font-medium text-neutral-600 hover:bg-neutral-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >← Prev</button>

                <div className="flex gap-1.5">
                  {Array.from({ length: Math.min(pagination.pages, 5) }).map((_, i) => {
                    let pageNum
                    if (pagination.pages <= 5) pageNum = i + 1
                    else if (activePage <= 3) pageNum = i + 1
                    else if (activePage >= pagination.pages - 2) pageNum = pagination.pages - 4 + i
                    else pageNum = activePage - 2 + i

                    if (pageNum < 1 || pageNum > pagination.pages) return null

                    return (
                      <button
                        key={pageNum}
                        onClick={() => updateParams({ page: pageNum })}
                        className={`w-10 h-10 rounded-xl text-sm font-body font-bold transition-all ${
                          activePage === pageNum
                            ? 'bg-brand-green text-white shadow-md shadow-brand-green/20'
                            : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => updateParams({ page: activePage + 1 })}
                  disabled={activePage === pagination.pages}
                  className="px-4 py-2 rounded-xl border border-neutral-200 bg-white text-sm font-body font-medium text-neutral-600 hover:bg-neutral-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >Next →</button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  )
}
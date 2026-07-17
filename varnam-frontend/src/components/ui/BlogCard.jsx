// src/components/ui/BlogCard.jsx
import { Link } from 'react-router-dom'
import { decodeHtmlEntities } from '../../utils/decodeHtmlEntities'

const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)
const ArrowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
  </svg>
)

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function BlogCard({ post, featured = false }) {
  if (!post) return null
  const { slug, title: rawTitle, excerpt: rawExcerpt, coverImage, tags, publishedAt, readTimeMinutes } = post
  const title = decodeHtmlEntities(rawTitle)
  const excerpt = decodeHtmlEntities(rawExcerpt)

  return (
    <Link
      to={`/blog/${slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl bg-white border border-neutral-100 shadow-soft
        transition-all duration-300 hover:shadow-hover hover:-translate-y-1
        ${featured ? 'sm:flex-row' : ''}`}
    >
      {/* Cover image */}
      <div className={`relative overflow-hidden bg-neutral-100 ${featured ? 'sm:w-1/2 aspect-[16/10] sm:aspect-auto' : 'aspect-[16/10]'}`}>
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-cream to-brand-cream-dark text-brand-green/30 font-heading text-3xl">
            V
          </div>
        )}
        {tags?.[0] && (
          <span className="absolute top-3 left-3 text-[10px] font-body font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-full bg-neutral-900/70 backdrop-blur-sm text-brand-cream">
            {tags[0]}
          </span>
        )}
      </div>

      {/* Content */}
      <div className={`flex flex-col flex-1 p-5 ${featured ? 'sm:p-7 sm:justify-center' : ''}`}>
        <div className="flex items-center gap-2 mb-2.5 text-[12px] font-body text-neutral-400">
          <span>{formatDate(publishedAt)}</span>
          <span className="w-1 h-1 rounded-full bg-neutral-300" />
          <span className="flex items-center gap-1"><ClockIcon /> {readTimeMinutes} min read</span>
        </div>

        <h3 className={`font-heading text-neutral-800 leading-snug mb-2 group-hover:text-brand-green transition-colors ${featured ? 'text-xl sm:text-2xl' : 'text-lg'}`}>
          {title}
        </h3>

        {excerpt && (
          <p className={`font-body text-neutral-500 leading-relaxed line-clamp-2 ${featured ? 'text-[14px] sm:line-clamp-3' : 'text-[13.5px]'}`}>
            {excerpt}
          </p>
        )}

        <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-body font-semibold text-brand-green">
          Read Article
          <span className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
            <ArrowIcon />
          </span>
        </span>
      </div>
    </Link>
  )
}
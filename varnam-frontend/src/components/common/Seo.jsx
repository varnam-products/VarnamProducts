import { useEffect } from 'react'

const SITE_URL  = 'https://www.varnamfoods.com'
const SITE_NAME = 'Varnam Naturals'
const DEFAULT_IMAGE = `${SITE_URL}/logo.png`

/**
 * Sets/updates a <meta> tag by name or property attribute.
 * Creates the tag if it doesn't exist, updates content if it does.
 */
function setMeta(attr, key, content) {
  if (!content) return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function setJsonLd(id, data) {
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = id
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

function removeJsonLd(id) {
  const el = document.getElementById(id)
  if (el) el.remove()
}

/**
 * Per-page SEO. Drop this at the top of any page component.
 *
 *   <Seo
 *     title="Shop All Products"
 *     description="Browse organic oils, soaps and supplements."
 *     path="/shop"
 *     jsonLd={{ ... }}          // optional, single object or array of objects
 *   />
 *
 * jsonLd accepts one schema object or an array of schema objects — each is
 * injected as its own <script type="application/ld+json"> tag and removed
 * on unmount so schemas never leak between routes.
 */
export default function Seo({
  title,
  description,
  path = '/',
  image = DEFAULT_IMAGE,
  type = 'website',
  jsonLd = null,
  noindex = false,
}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Pure. Organic. Natural.`
    const url = `${SITE_URL}${path}`

    document.title = fullTitle

    setMeta('name', 'description', description)
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')

    setCanonical(url)

    // Open Graph
    setMeta('property', 'og:site_name', SITE_NAME)
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', type)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:image', image)
    setMeta('property', 'og:locale', 'en_IN')

    // Twitter Card
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', image)

    // JSON-LD structured data
    const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []
    const ids = schemas.map((_, i) => `seo-jsonld-${i}`)
    schemas.forEach((schema, i) => setJsonLd(ids[i], schema))

    return () => {
      ids.forEach(removeJsonLd)
    }
  }, [title, description, path, image, type, jsonLd, noindex])

  return null
}

export { SITE_URL, SITE_NAME, DEFAULT_IMAGE }
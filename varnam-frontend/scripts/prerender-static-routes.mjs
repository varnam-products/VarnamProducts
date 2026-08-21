/**
 * prerender-static-routes.mjs
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 * This app is a client-side-rendered React SPA (Vite, no SSR). By default,
 * every route serves the exact same dist/index.html, and the real
 * per-page <title>, <meta>, and JSON-LD are only injected client-side by
 * src/components/common/Seo.jsx (via useEffect, after JS executes).
 *
 * That's invisible to:
 *   - Search crawlers on their FIRST (non-JS) crawl pass — Google does a
 *     second "rendering" pass that runs JS, but it can lag by days/weeks
 *     on a new/low-authority domain, delaying correct indexing.
 *   - Social share bots (WhatsApp, Facebook, Twitter/X, Slack) — these
 *     do NOT execute JavaScript at all, so shared links to /shop,
 *     /contact, /b2b-wholesale previously showed the HOMEPAGE's title/
 *     description/image.
 *
 * WHAT THIS SCRIPT DOES
 * Runs after `vite build`. Takes the built dist/index.html as a template,
 * and for each known static route, injects the correct title/meta/
 * canonical/OG/Twitter tags and JSON-LD directly into a route-specific
 * copy: dist/shop/index.html, dist/b2b-wholesale/index.html,
 * dist/contact/index.html (dist/index.html is updated in place for "/").
 *
 * Vercel is then configured (see vercel.json) to serve these specific
 * files for their exact paths, while everything else still falls through
 * to the SPA's dist/index.html for client-side routing.
 *
 * IMPORTANT: The 4 marketing routes (home, shop listing, b2b-wholesale,
 * contact) are truly static (title/description hand-written in this file).
 * Blog posts, products, and categories are different — their content
 * changes whenever an admin publishes/edits one — so each is fetched from
 * the API at BUILD TIME (same VITE_API_URL your client already uses):
 *   - every published post   → dist/blog/<slug>/index.html      (BlogPosting JSON-LD)
 *   - every active product   → dist/shop/<slug>/index.html      (Product + BreadcrumbList JSON-LD)
 *   - every active category  → dist/category/<slug>/index.html  (CollectionPage + BreadcrumbList JSON-LD)
 * The product/category JSON-LD mirrors exactly what src/pages/ProductDetail.jsx
 * builds client-side, so a crawler's first (non-JS) pass and a hydrated
 * visitor see the same schema. sitemap.xml is regenerated here to include
 * every published post, active product, and active category URL — these
 * previously had NO sitemap entry and NO prerendered HTML at all, which is
 * why Google was showing almost no impressions for non-brand/product-intent
 * searches even though the site ranked fine for the brand name itself.
 *
 * CAVEAT: because this only runs at build time, a post/product/category
 * added after the last deploy won't have a prerendered file or sitemap
 * entry yet. It still works perfectly fine for real users (client-side
 * routing handles it), but a crawler or social bot hitting that exact URL
 * before the next deploy will see the generic homepage/shop-listing meta
 * instead of its own — same class of gap this script exists to close
 * elsewhere. Trigger a rebuild/redeploy after adding new posts, products,
 * or categories to get them prerendered and included in the sitemap too.
 *
 * The client app still hydrates and works exactly as before — this only
 * changes what's present in the RAW HTML before JS runs.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
const SITE_URL = 'https://www.varnamfoods.com'
const SITE_NAME = 'Varnam Foods'
const DEFAULT_IMAGE = `${SITE_URL}/logo.png`

// Product/category name & description text coming from the API can contain HTML
// entities (e.g. "&amp;", "&#39;") — the client decodes these with a DOM textarea
// trick (src/utils/decodeHtmlEntities.js), which isn't available in this Node
// build script. This covers the same common entities without needing a DOM.
const HTML_ENTITY_MAP = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ',
}
function decodeEntities(str) {
  if (!str || typeof str !== 'string') return str
  return str
    .replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&apos;|&nbsp;/g, (m) => HTML_ENTITY_MAP[m])
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

// ── Static JSON-LD building blocks (mirrors src/pages/*.jsx at build time) ──
// NOTE: Organization/contact schemas below use fallback values only, since
// live /settings data isn't available at build time. The client-side Seo
// component will still refresh these with live data after hydration for
// any interactive/logged-in use — this baked version is the crawler-visible
// baseline, which is what was missing before.

const ORG_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: DEFAULT_IMAGE,
  description:
    'Varnam Foods makes pure, organic, chemical-free cold-pressed oils, handmade soaps and natural supplements.',
}

const WEBSITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/search?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
}

const B2B_FAQS = [
  { q: 'What is the minimum order quantity (MOQ)?', a: 'MOQ depends on the product and pack size — typically starting around 1 carton or 25–50 units. Mention your requirement in the form and we\u2019ll confirm exact MOQs for your order.' },
  { q: 'Do you offer credit terms?', a: 'New partners typically start with advance payment. Credit terms can be discussed once a repeat-order relationship is established.' },
  { q: 'Do you ship outside Tamil Nadu?', a: 'Yes — we ship across India through reliable logistics partners. Delivery timelines vary by location.' },
  { q: 'What is the shelf life of your products?', a: 'Most products carry a 6–12 month shelf life when stored in a cool, dry place away from direct sunlight.' },
  { q: 'Can we visit your facility?', a: 'Yes, facility visits can be arranged for serious business partners — just mention this in your message below.' },
]

const breadcrumb = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, item], i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name,
    item,
  })),
})

// ── Route configs ───────────────────────────────────────────────────────
const ROUTES = [
  {
    outPath: '', // → dist/index.html
    path: '/',
    title: `${SITE_NAME} — Pure. Organic. Natural.`,
    description:
      'Shop pure organic cold-pressed oils, handmade soaps and natural supplements from Varnam Foods. FSSAI certified, chemical-free, made in India.',
    jsonLd: [ORG_JSON_LD, WEBSITE_JSON_LD],
  },
  {
    outPath: 'shop',
    path: '/shop',
    title: `Shop All Products | ${SITE_NAME}`,
    description:
      'Browse the full Varnam Foods catalog — organic cold-pressed oils, handmade soaps and natural supplements, FSSAI certified.',
    jsonLd: [
      breadcrumb([
        ['Home', SITE_URL],
        ['Shop', `${SITE_URL}/shop`],
      ]),
    ],
  },
  {
    outPath: 'b2b-wholesale',
    path: '/b2b-wholesale',
    title: `B2B & Wholesale | ${SITE_NAME}`,
    description:
      'Partner with Varnam Foods for bulk and wholesale orders of organic cold-pressed oils, soaps and supplements. Attractive margins for retailers, restaurants and distributors.',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: B2B_FAQS.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
      breadcrumb([
        ['Home', SITE_URL],
        ['B2B / Wholesale', `${SITE_URL}/b2b-wholesale`],
      ]),
    ],
  },
  {
    outPath: 'contact',
    path: '/contact',
    title: `Contact Us | ${SITE_NAME}`,
    description:
      "Get in touch with Varnam Foods — questions about orders, products or wholesale, we're here to help.",
    jsonLd: [
      ORG_JSON_LD,
      breadcrumb([
        ['Home', SITE_URL],
        ['Contact', `${SITE_URL}/contact`],
      ]),
    ],
  },
  {
    outPath: 'blog',
    path: '/blog',
    title: `Blog | ${SITE_NAME}`,
    description:
      'Guides, recipes and stories on cold-pressed oils, natural wellness and organic living from Varnam Foods.',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: `${SITE_NAME} Blog`,
        url: `${SITE_URL}/blog`,
      },
      breadcrumb([
        ['Home', SITE_URL],
        ['Blog', `${SITE_URL}/blog`],
      ]),
    ],
  },
]

// ── Blog posts — fetched at build time (dynamic content, unlike the ──────
// static marketing routes above) ─────────────────────────────────────────
// Uses the same env var Vite injects into the client bundle via
// import.meta.env.VITE_API_URL, so no separate config is needed — whatever
// is set in your Vercel project's build environment is reused here.
const API_URL = process.env.VITE_API_URL || 'http://localhost:5000/api'

async function fetchPublishedPosts() {
  try {
    const res = await fetch(`${API_URL}/blog?limit=1000`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json?.data || []
  } catch (err) {
    console.warn(`[prerender] could not fetch blog posts from ${API_URL}/blog — skipping post prerendering (${err.message})`)
    return []
  }
}

function postToRoute(post) {
  const title = post.metaTitle || post.title
  const description = post.metaDescription || post.excerpt
  const image = post.coverImage || DEFAULT_IMAGE
  const url = `${SITE_URL}/blog/${post.slug}`

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description,
    image: post.coverImage ? [post.coverImage] : undefined,
    datePublished: post.publishedAt || undefined,
    dateModified: post.updatedAt || post.publishedAt || undefined,
    author: { '@type': 'Organization', name: post.author || SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  }

  return {
    outPath: `blog/${post.slug}`,
    path: `/blog/${post.slug}`,
    title: `${title} | ${SITE_NAME}`,
    description,
    image,
    jsonLd: [
      articleJsonLd,
      breadcrumb([
        ['Home', SITE_URL],
        ['Blog', `${SITE_URL}/blog`],
        [post.title, url],
      ]),
    ],
  }
}

// ── Products (dynamic, fetched at build time) — mirrors the JSON-LD built ────
// client-side in src/pages/ProductDetail.jsx, so a crawler's first (non-JS)
// pass sees the same Product + BreadcrumbList schema a hydrated visitor gets.
// Uses the same aggregation-backed /api/products list endpoint the storefront
// uses, which already computes `effectivePrice` (min of discountPrice||price
// across variants) and populates `category` as { name, slug } — so this stays
// in lockstep with actual selling price shown to users, not a separate calc.
async function fetchActiveProducts() {
  try {
    const res = await fetch(`${API_URL}/products?limit=10000`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json?.data || []
  } catch (err) {
    console.warn(`[prerender] could not fetch products from ${API_URL}/products — skipping product prerendering (${err.message})`)
    return []
  }
}

function productToRoute(product) {
  const name = decodeEntities(product.name)
  const shortDescription = decodeEntities(product.shortDescription)
  const description = decodeEntities(product.description)
  const seoDescription = shortDescription || (description ? description.slice(0, 160) : `Buy ${name} online — pure, organic and FSSAI certified, from Varnam Foods.`)
  const image = product.images?.[0] || DEFAULT_IMAGE
  const url = `${SITE_URL}/shop/${product.slug}`
  const outOfStock = product.stock === 0

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: seoDescription,
    image: product.images && product.images.length ? product.images : undefined,
    sku: product._id,
    brand: { '@type': 'Brand', name: 'Varnam Foods' },
    category: product.category?.name || undefined,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'INR',
      price: product.effectivePrice,
      availability: outOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  }

  const breadcrumbJsonLd = breadcrumb([
    ['Home', SITE_URL],
    ['Shop', `${SITE_URL}/shop`],
    ...(product.category?.name ? [[product.category.name, `${SITE_URL}/category/${product.category.slug}`]] : []),
    [name, url],
  ])

  return {
    outPath: `shop/${product.slug}`,
    path: `/shop/${product.slug}`,
    title: `${name} | ${SITE_NAME}`,
    description: seoDescription,
    image,
    jsonLd: [productJsonLd, breadcrumbJsonLd],
  }
}

// ── Categories (dynamic, fetched at build time) ──────────────────────────
async function fetchActiveCategories() {
  try {
    const res = await fetch(`${API_URL}/categories`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json?.data || []
  } catch (err) {
    console.warn(`[prerender] could not fetch categories from ${API_URL}/categories — skipping category prerendering (${err.message})`)
    return []
  }
}

function categoryToRoute(category) {
  const name = decodeEntities(category.name)
  const customDescription = decodeEntities(category.description)?.trim()
  // Real per-category copy when the admin has written one; otherwise fall
  // back to the old templated sentence so categories without content still
  // get a reasonable meta description.
  const description = customDescription
    ? customDescription
    : `Shop ${name} — organic, chemical-free, FSSAI certified products from Varnam Foods.`
  const url = `${SITE_URL}/category/${category.slug}`

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${name} | ${SITE_NAME}`,
    description,
    url,
  }

  const breadcrumbJsonLd = breadcrumb([
    ['Home', SITE_URL],
    ['Shop', `${SITE_URL}/shop`],
    [name, url],
  ])

  return {
    outPath: `category/${category.slug}`,
    path: `/category/${category.slug}`,
    title: `${name} | ${SITE_NAME}`,
    description,
    image: category.image || DEFAULT_IMAGE,
    jsonLd: [collectionJsonLd, breadcrumbJsonLd],
  }
}

// ── Sitemap — regenerated at build time so published posts, products and ────
// categories are all included ─────────────────────────────────────────────
function buildSitemapXml(staticPaths, posts, products, categories) {
  const urlEntry = (loc, { changefreq = 'monthly', priority = '0.6', lastmod } = {}) => `  <url>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`

  const staticEntries = staticPaths.map(({ loc, changefreq, priority }) => urlEntry(loc, { changefreq, priority }))

  const postEntries = posts.map((post) =>
    urlEntry(`${SITE_URL}/blog/${post.slug}`, {
      changefreq: 'monthly',
      priority: '0.6',
      lastmod: post.updatedAt || post.publishedAt ? new Date(post.updatedAt || post.publishedAt).toISOString().slice(0, 10) : undefined,
    })
  )

  // Product pages are what non-brand/product-intent search traffic actually needs
  // to land on — highest priority after the homepage/shop listing.
  const productEntries = products.map((product) =>
    urlEntry(`${SITE_URL}/shop/${product.slug}`, {
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: product.updatedAt ? new Date(product.updatedAt).toISOString().slice(0, 10) : undefined,
    })
  )

  const categoryEntries = categories.map((category) =>
    urlEntry(`${SITE_URL}/category/${category.slug}`, {
      changefreq: 'weekly',
      priority: '0.7',
      lastmod: category.updatedAt ? new Date(category.updatedAt).toISOString().slice(0, 10) : undefined,
    })
  )

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticEntries, ...productEntries, ...categoryEntries, ...postEntries].join('\n')}\n</urlset>\n`
}

const SITEMAP_STATIC_PATHS = [
  { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
  { loc: `${SITE_URL}/shop`, changefreq: 'daily', priority: '0.9' },
  { loc: `${SITE_URL}/b2b-wholesale`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${SITE_URL}/contact`, changefreq: 'monthly', priority: '0.6' },
  { loc: `${SITE_URL}/blog`, changefreq: 'weekly', priority: '0.8' },
]

// ── HTML injection helpers ──────────────────────────────────────────────
function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;')
}

function buildHead({ path: routePath, title, description, jsonLd, image = DEFAULT_IMAGE }) {
  const url = `${SITE_URL}${routePath}`
  const jsonLdTags = jsonLd
    .map((schema) => `<script type="application/ld+json">${JSON.stringify(schema)}</script>`)
    .join('\n  ')

  return { url, title, description, image, jsonLdTags }
}

function injectIntoHtml(html, meta) {
  const { url, title, description, image, jsonLdTags } = meta

  let out = html

  // <title>
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)

  // meta description
  out = out.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${escapeAttr(description)}" />`
  )

  // canonical
  out = out.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${escapeAttr(url)}" />`
  )

  // Open Graph
  out = out.replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeAttr(title)}" />`)
  out = out.replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeAttr(description)}" />`)
  out = out.replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${escapeAttr(url)}" />`)
  out = out.replace(/<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${escapeAttr(image)}" />`)

  // Twitter Card
  out = out.replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeAttr(title)}" />`)
  out = out.replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeAttr(description)}" />`)
  out = out.replace(/<meta name="twitter:image" content="[^"]*" \/>/, `<meta name="twitter:image" content="${escapeAttr(image)}" />`)

  // JSON-LD — insert right before </head>
  out = out.replace('</head>', `  ${jsonLdTags}\n</head>`)

  return out
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const templatePath = path.join(DIST, 'index.html')
  if (!existsSync(templatePath)) {
    console.error('[prerender] dist/index.html not found — run `vite build` first.')
    process.exit(1)
  }
  const template = readFileSync(templatePath, 'utf-8')

  for (const route of ROUTES) {
    const meta = buildHead(route)
    const html = injectIntoHtml(template, meta)

    const outDir = route.outPath ? path.join(DIST, route.outPath) : DIST
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

    const outFile = path.join(outDir, 'index.html')
    writeFileSync(outFile, html, 'utf-8')
    console.log(`[prerender] wrote ${path.relative(ROOT, outFile)}  (${route.path})`)
  }

  console.log(`[prerender] done — ${ROUTES.length} static routes prerendered with correct meta + JSON-LD.`)

  // ── Blog posts (dynamic, fetched at build time) ──────────────────────
  const posts = await fetchPublishedPosts()

  for (const post of posts) {
    if (!post.slug) continue
    const route = postToRoute(post)
    const meta = buildHead(route)
    const html = injectIntoHtml(template, meta)

    const outDir = path.join(DIST, route.outPath)
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

    const outFile = path.join(outDir, 'index.html')
    writeFileSync(outFile, html, 'utf-8')
    console.log(`[prerender] wrote ${path.relative(ROOT, outFile)}  (${route.path})`)
  }

  if (posts.length) {
    console.log(`[prerender] done — ${posts.length} blog post(s) prerendered.`)
  } else {
    console.log('[prerender] no published blog posts found (or API unreachable) — /blog/:slug will fall back to client-side rendering until the next build after posts exist.')
  }

  // ── Products (dynamic, fetched at build time) ─────────────────────────
  // This closes the gap noted above: previously only the 4 static marketing
  // routes were prerendered, so every /shop/:slug product page was invisible
  // to a crawler's first (non-JS) pass and absent from the sitemap — exactly
  // the pages non-brand/product-intent search traffic needs to land on.
  const products = await fetchActiveProducts()

  for (const product of products) {
    if (!product.slug) continue
    const route = productToRoute(product)
    const meta = buildHead(route)
    const html = injectIntoHtml(template, meta)

    const outDir = path.join(DIST, route.outPath)
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

    const outFile = path.join(outDir, 'index.html')
    writeFileSync(outFile, html, 'utf-8')
    console.log(`[prerender] wrote ${path.relative(ROOT, outFile)}  (${route.path})`)
  }

  if (products.length) {
    console.log(`[prerender] done — ${products.length} product page(s) prerendered.`)
  } else {
    console.log('[prerender] no active products found (or API unreachable) — /shop/:slug will fall back to client-side rendering until the next build after products exist.')
  }

  // ── Categories (dynamic, fetched at build time) ───────────────────────
  const categories = await fetchActiveCategories()

  for (const category of categories) {
    if (!category.slug) continue
    const route = categoryToRoute(category)
    const meta = buildHead(route)
    const html = injectIntoHtml(template, meta)

    const outDir = path.join(DIST, route.outPath)
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

    const outFile = path.join(outDir, 'index.html')
    writeFileSync(outFile, html, 'utf-8')
    console.log(`[prerender] wrote ${path.relative(ROOT, outFile)}  (${route.path})`)
  }

  if (categories.length) {
    console.log(`[prerender] done — ${categories.length} category page(s) prerendered.`)
  } else {
    console.log('[prerender] no active categories found (or API unreachable) — /category/:slug will fall back to client-side rendering until the next build after categories exist.')
  }

  // ── Sitemap — regenerated with the live list of published posts, ─────
  // products and categories ─────────────────────────────────────────────
  const sitemapPath = path.join(DIST, 'sitemap.xml')
  writeFileSync(sitemapPath, buildSitemapXml(SITEMAP_STATIC_PATHS, posts, products, categories), 'utf-8')
  console.log(`[prerender] wrote ${path.relative(ROOT, sitemapPath)}  (${posts.length} blog post, ${products.length} product, ${categories.length} category URL(s) included)`)
}

main()

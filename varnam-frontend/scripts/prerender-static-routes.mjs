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
 * IMPORTANT: This covers the 4 STATIC marketing routes only (home, shop
 * listing, b2b-wholesale, contact) — the ones in your sitemap.xml. It does
 * NOT prerender individual product pages (/shop/:slug), since those need
 * live data from your API at request time. The Product JSON-LD on those
 * pages is correctly written already; if you want them prerendered too
 * later, that needs a build-time API fetch per product (happy to add
 * that as a follow-up once your catalog is stable).
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
function main() {
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

  console.log('[prerender] done — 4 static routes prerendered with correct meta + JSON-LD.')
}

main()

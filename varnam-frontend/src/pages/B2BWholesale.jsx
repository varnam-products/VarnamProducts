import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import toast from 'react-hot-toast'
import { productAPI, b2bAPI, settingsAPI } from '../services/api'
import Seo, { SITE_URL } from '../components/common/Seo'

gsap.registerPlugin(ScrollTrigger)

const STORE_EMAIL = 'hello@varnamnaturals.com'
const STORE_PHONE_FALLBACK = '919999999999'

/* ── Icons ────────────────────────────────────────────────────────────── */
const IconStorefront = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#52B788" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l1.5-5h15L21 9" /><path d="M3 9v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9" />
    <path d="M3 9h18" /><path d="M9 20v-6h6v6" />
  </svg>
)
const IconRestaurant = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#52B788" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2v7c0 1.1.9 2 2 2s2-.9 2-2V2" /><line x1="5" y1="11" x2="5" y2="22" />
    <path d="M19 2c-2 0-3.5 2-3.5 5s1.5 5 3.5 5v10" />
  </svg>
)
const IconCatering = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#52B788" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 21h16" /><path d="M6 21c0-6 2-9 6-9s6 3 6 9" /><path d="M12 12V7" /><path d="M9 5a3 3 0 0 1 6 0" />
  </svg>
)
const IconDistributor = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#52B788" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 3v5h-7V8z" />
    <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
)
const IconInstitution = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#52B788" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" /><path d="M4 21V9l8-6 8 6v12" /><line x1="9" y1="21" x2="9" y2="13" /><line x1="15" y1="21" x2="15" y2="13" />
  </svg>
)
const IconReseller = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#52B788" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" />
    <path d="M2 3h2l2.6 12.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 8H6" />
  </svg>
)

const IconLeaf = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E9B87A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)
const IconFlask = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E9B87A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6v7l3.5 7A2 2 0 0 1 16.7 20H7.3a2 2 0 0 1-1.8-3L9 10V3z" /><line x1="9" y1="3" x2="15" y2="3" />
  </svg>
)
const IconCertificate = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E9B87A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l7 3v6c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V5l7-3z" /><path d="M9 12.2l2 2 4-4.2" />
  </svg>
)
const IconBox = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E9B87A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16.5 9.4l-9-5.19" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
  </svg>
)
const IconTruck = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E9B87A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 3v5h-7V8z" />
    <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
)
const IconHeadset = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E9B87A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z" />
    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" />
  </svg>
)

const WHO_WE_SUPPLY = [
  { Icon: IconStorefront,  title: 'Retailers & Organic Stores',   body: 'High repeat-purchase products for shelf and counter.' },
  { Icon: IconRestaurant,  title: 'Hotels & Restaurants',          body: 'Consistent taste and quality for daily kitchen use.' },
  { Icon: IconCatering,    title: 'Caterers & Cloud Kitchens',     body: 'Bulk supply with predictable, reliable quality.' },
  { Icon: IconDistributor, title: 'Distributors & Stockists',      body: 'Margin-friendly pricing and steady stock movement.' },
  { Icon: IconInstitution, title: 'Corporate & Institutions',      body: 'Large-volume supply with full billing documentation.' },
  { Icon: IconReseller,    title: 'Resellers & Online Sellers',    body: 'Branded packs with dropship support on request.' },
]

const WHY_PARTNER = [
  { Icon: IconLeaf,        title: 'Farm-Direct Sourcing',        body: 'Sourced directly from certified organic farmers across Tamil Nadu — no middlemen.' },
  { Icon: IconFlask,       title: 'Cold-Pressed & Chemical-Free', body: 'No parabens, no sulphates, no shortcuts — every batch tested for purity.' },
  { Icon: IconCertificate, title: 'FSSAI & MSME Certified',       body: 'Fully licensed and registered, with documentation ready for institutional buyers.' },
  { Icon: IconBox,         title: 'Flexible Packaging',          body: 'Retail packs, bulk containers, and private-label options available.' },
  { Icon: IconTruck,       title: 'Fast, Reliable Dispatch',      body: 'Typical dispatch within 24–72 hours based on stock availability.' },
  { Icon: IconHeadset,     title: 'Dedicated B2B Support',        body: 'One point of contact for ordering, tracking, and reordering.' },
]

const ORDER_STEPS = [
  { n: '1', title: 'Share Your Requirement',  body: 'Tell us the products, quantities, pack sizes, and delivery city.' },
  { n: '2', title: 'Get Pricing',             body: 'We send a price list and margin sheet, usually within 24 hours.' },
  { n: '3', title: 'Confirm & Pay',           body: 'Confirm your order and payment — invoice shared right away.' },
  { n: '4', title: 'Dispatch & Track',        body: 'Your order is packed, dispatched, and tracked to your door.' },
]

const FAQS = [
  { q: 'What is the minimum order quantity (MOQ)?',           a: 'MOQ depends on the product and pack size — typically starting around 1 carton or 25–50 units. Mention your requirement in the form and we\u2019ll confirm exact MOQs for your order.' },
  { q: 'Do you offer credit terms?',                          a: 'New partners typically start with advance payment. Credit terms can be discussed once a repeat-order relationship is established.' },
  { q: 'Do you ship outside Tamil Nadu?',                     a: 'Yes — we ship across India through reliable logistics partners. Delivery timelines vary by location.' },
  { q: 'What is the shelf life of your products?',            a: 'Most products carry a 6–12 month shelf life when stored in a cool, dry place away from direct sunlight.' },
  { q: 'Can we visit your facility?',                         a: 'Yes, facility visits can be arranged for serious business partners — just mention this in your message below.' },
]

/* ── Section reveal hook ─────────────────────────────────────────────── */
function useReveal(selector) {
  const ref = useRef(null)
  useGSAP(() => {
    const items = ref.current?.querySelectorAll(selector)
    if (!items?.length) return
    gsap.fromTo(items,
      { y: 28, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.08, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 85%' } })
  }, { scope: ref })
  return ref
}

/* ── Hero ─────────────────────────────────────────────────────────────── */
function B2BHero({ whatsappHref }) {
  const ref = useRef(null)
  useGSAP(() => {
    gsap.fromTo('.b2b-hero-reveal',
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1, duration: 0.7, ease: 'power3.out', delay: 0.1 })
  }, { scope: ref })

  return (
    <section ref={ref} style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'linear-gradient(160deg, #0D2B1E 0%, #1B4332 40%, #2D6A4F 75%, #1A3D2B 100%)',
      }} />
      <div style={{
        position: 'absolute', zIndex: 0, top: '-20%', right: '-10%', width: '55%', height: '120%',
        background: 'radial-gradient(ellipse at center, rgba(200,137,58,0.14) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div className="container-main" style={{ position: 'relative', zIndex: 10, padding: '96px 0 76px', textAlign: 'center' }}>
        <div className="b2b-hero-reveal" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ display: 'block', width: 32, height: 1, background: 'rgba(233,184,122,0.5)' }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#E9B87A', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
            B2B / Wholesale
          </span>
          <span style={{ display: 'block', width: 32, height: 1, background: 'rgba(233,184,122,0.5)' }} />
        </div>
        <h1 className="b2b-hero-reveal" style={{
          fontFamily: 'var(--font-heading)', color: '#FDF6EC',
          fontSize: 'clamp(1.9rem,5vw,3.2rem)', lineHeight: 1.15, maxWidth: 780, margin: '0 auto 20px',
        }}>
          Wholesale & Institutional Supply of Varnam Naturals Products
        </h1>
        <p className="b2b-hero-reveal" style={{
          fontFamily: 'var(--font-body)', color: 'rgba(253,246,236,0.6)', fontSize: 15, lineHeight: 1.7,
          maxWidth: 560, margin: '0 auto 36px',
        }}>
          Stock a product your customers trust — clean, cold-pressed, and crafted for taste, health, and repeat purchase.
        </p>
        <div className="b2b-hero-reveal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 14 }}>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #C8893A, #E9B87A)', color: '#1B2F24',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
            padding: '14px 32px', borderRadius: 14, textDecoration: 'none',
            boxShadow: '0 8px 28px rgba(200,137,58,0.35)', letterSpacing: '0.02em',
          }}>
            Request Price List
          </a>
          <a href="#b2b-form" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.07)', color: '#FDF6EC', fontFamily: 'var(--font-body)', fontSize: 14,
            padding: '14px 28px', borderRadius: 14, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.14)',
          }}>
            Fill Wholesale Enquiry
          </a>
        </div>
      </div>
    </section>
  )
}

/* ── Who We Supply ────────────────────────────────────────────────────── */
function WhoWeSupply() {
  const ref = useReveal('.wws-card')
  return (
    <section ref={ref} className="home-section" style={{ background: '#FDF6EC' }}>
      <div className="container-main">
        <SectionHeading eyebrow="Who We Supply" title="Built for Every Business That Needs Quality, Consistently" dark={false} />
        <div className="b2b-grid-3">
          {WHO_WE_SUPPLY.map(({ Icon, title, body }) => (
            <div key={title} className="wws-card" style={{
              background: '#fff', border: '1px solid rgba(45,106,79,0.09)', borderRadius: 20,
              padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(82,183,136,0.1)',
              }}>
                <Icon />
              </div>
              <p style={{ fontFamily: 'var(--font-heading)', color: '#26221C', fontSize: 16, margin: 0 }}>{title}</p>
              <p style={{ fontFamily: 'var(--font-body)', color: '#8A8272', fontSize: 13, lineHeight: 1.65, margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Why Partner ──────────────────────────────────────────────────────── */
function WhyPartner() {
  const ref = useReveal('.wp-card')
  return (
    <section ref={ref} style={{ position: 'relative', overflow: 'hidden', padding: '72px 0' }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'linear-gradient(160deg, #0D2B1E 0%, #1B4332 40%, #2D6A4F 75%, #1A3D2B 100%)',
      }} />
      <div className="container-main" style={{ position: 'relative', zIndex: 10 }}>
        <SectionHeading eyebrow="Why Partner With Us" title="Why Varnam Naturals" dark />
        <div className="b2b-grid-3">
          {WHY_PARTNER.map(({ Icon, title, body }) => (
            <div key={title} className="wp-card" style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20,
              padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(82,183,136,0.2) 0%, rgba(45,106,79,0.25) 100%)',
                border: '1px solid rgba(82,183,136,0.25)',
              }}>
                <Icon />
              </div>
              <p style={{ fontFamily: 'var(--font-heading)', color: '#FDF6EC', fontSize: 16, margin: 0 }}>{title}</p>
              <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(253,246,236,0.55)', fontSize: 13, lineHeight: 1.65, margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Pack Sizes & Private Label ───────────────────────────────────────── */
function PacksAndLabel({ whatsappHref }) {
  const ref = useReveal('.pl-block')
  return (
    <section ref={ref} className="home-section" style={{ background: '#FDF6EC' }}>
      <div className="container-main">
        <div className="pl-block" style={{ marginBottom: 48 }}>
          <SectionHeading eyebrow="Pack Sizes & Formats" title="Choose the Format That Fits Your Business" dark={false} />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid rgba(45,106,79,0.12)' }}>
                  <th style={{ padding: '12px 16px', color: '#2D6A4F' }}>Pack Type</th>
                  <th style={{ padding: '12px 16px', color: '#2D6A4F' }}>Options</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Retail Packs', '250 ml · 500 ml · 1 L bottles / jars'],
                  ['Bulk / Institutional Packs', '5 L · 10 L · 15 L tins / canisters (on request)'],
                  ['Custom Packing', 'Available for bulk and private-label orders'],
                ].map(([type, opts]) => (
                  <tr key={type} style={{ borderBottom: '1px solid rgba(45,106,79,0.08)' }}>
                    <td style={{ padding: '14px 16px', color: '#26221C', fontWeight: 600 }}>{type}</td>
                    <td style={{ padding: '14px 16px', color: '#8A8272' }}>{opts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pl-block" style={{
          background: '#fff', border: '1px solid rgba(45,106,79,0.09)', borderRadius: 22, padding: '36px 32px',
          display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ maxWidth: 480 }}>
            <p style={{ fontFamily: 'var(--font-heading)', color: '#26221C', fontSize: 20, margin: '0 0 10px' }}>
              Private Label / White Label
            </p>
            <p style={{ fontFamily: 'var(--font-body)', color: '#8A8272', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              Want your own brand on our products? We offer private-label manufacturing — custom labelling, packaging
              guidance, batch details, and optional branded shipping cartons — for businesses that want to sell under
              their own name.
            </p>
          </div>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #C8893A, #E9B87A)', color: '#1B2F24',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
            padding: '13px 26px', borderRadius: 14, textDecoration: 'none',
            boxShadow: '0 8px 24px rgba(200,137,58,0.3)',
          }}>
            Start Private Label Inquiry
          </a>
        </div>
      </div>
    </section>
  )
}

/* ── How Ordering Works ───────────────────────────────────────────────── */
function HowOrderingWorks() {
  const ref = useReveal('.step-card')
  return (
    <section ref={ref} style={{ position: 'relative', overflow: 'hidden', padding: '72px 0' }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'linear-gradient(160deg, #0D2B1E 0%, #1B4332 40%, #2D6A4F 75%, #1A3D2B 100%)',
      }} />
      <div className="container-main" style={{ position: 'relative', zIndex: 10 }}>
        <SectionHeading eyebrow="How Ordering Works" title="Four Simple Steps" dark />
        <div className="why-grid">
          {ORDER_STEPS.map(({ n, title, body }) => (
            <div key={n} className="step-card" style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20,
              padding: '28px 22px',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12, marginBottom: 16,
                background: 'linear-gradient(135deg, #C8893A, #E9B87A)', color: '#1B2F24',
                fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {n}
              </div>
              <p style={{ fontFamily: 'var(--font-heading)', color: '#FDF6EC', fontSize: 16, margin: '0 0 8px' }}>{title}</p>
              <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(253,246,236,0.55)', fontSize: 13, lineHeight: 1.65, margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Section heading helper ──────────────────────────────────────────── */
function SectionHeading({ eyebrow, title, dark }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 44 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span style={{ display: 'block', width: 28, height: 1, background: dark ? 'rgba(233,184,122,0.5)' : 'rgba(200,137,58,0.4)' }} />
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.26em', textTransform: 'uppercase',
          color: dark ? '#E9B87A' : '#C8893A',
        }}>
          {eyebrow}
        </span>
        <span style={{ display: 'block', width: 28, height: 1, background: dark ? 'rgba(233,184,122,0.5)' : 'rgba(200,137,58,0.4)' }} />
      </div>
      <h2 style={{
        fontFamily: 'var(--font-heading)', color: dark ? '#FDF6EC' : '#26221C',
        fontSize: 'clamp(1.5rem,3.6vw,2.2rem)', lineHeight: 1.2, maxWidth: 560, margin: '0 auto',
      }}>
        {title}
      </h2>
    </div>
  )
}

/* ── Inquiry Form ─────────────────────────────────────────────────────── */
const BUSINESS_TYPES = [
  'Retailer / Organic Store', 'Hotel / Restaurant', 'Caterer / Cloud Kitchen',
  'Distributor / Stockist', 'Corporate / Institution', 'Reseller / Online Seller', 'Other',
]

const EMPTY_FORM = {
  businessName: '', contactName: '', email: '', phone: '',
  businessType: BUSINESS_TYPES[0], city: '', monthlyQuantity: '', message: '',
}

function InquiryForm() {
  const ref = useReveal('.form-reveal')
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [selected, setSelected] = useState({})
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    productAPI.getAll({ limit: 100 })
      .then(({ data }) => setProducts(data?.data || data?.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false))
  }, [])

  const toggleProduct = (id, name) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = { name, qty: '' }
      return next
    })
  }

  const setQty = (id, qty) => {
    setSelected((prev) => ({ ...prev, [id]: { ...prev[id], qty } }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const buildPayload = () => ({
    ...form,
    products: Object.entries(selected).map(([productId, v]) => ({
      productId, name: v.name, quantity: v.qty,
    })),
  })

  const mailtoFallback = (payload) => {
    const lines = [
      `Business Name: ${payload.businessName}`,
      `Contact Person: ${payload.contactName}`,
      `Email: ${payload.email}`,
      `Phone: ${payload.phone}`,
      `Business Type: ${payload.businessType}`,
      `City: ${payload.city}`,
      `Estimated Monthly Quantity: ${payload.monthlyQuantity}`,
      '',
      'Products Interested In:',
      ...(payload.products.length
        ? payload.products.map((p) => `- ${p.name}${p.quantity ? ` (Qty: ${p.quantity})` : ''}`)
        : ['- Not specified']),
      '',
      `Message: ${payload.message}`,
    ].join('\n')
    const subject = encodeURIComponent(`B2B Wholesale Inquiry — ${payload.businessName || 'New Business'}`)
    window.location.href = `mailto:${STORE_EMAIL}?subject=${subject}&body=${encodeURIComponent(lines)}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.businessName.trim() || !form.contactName.trim() || !form.phone.trim()) {
      toast.error('Please fill in business name, contact person, and phone number.')
      return
    }
    const payload = buildPayload()
    setSubmitting(true)
    try {
      await b2bAPI.submitInquiry(payload)
      toast.success('Inquiry sent! Our team will reach out within 24 hours.')
      setForm(EMPTY_FORM)
      setSelected({})
    } catch (err) {
      mailtoFallback(payload)
      toast.success('Opening your email app to send the inquiry directly.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="b2b-form" ref={ref} className="home-section" style={{ background: '#FDF6EC' }}>
      <div className="container-main" style={{ maxWidth: 880 }}>
        <div className="form-reveal">
          <SectionHeading eyebrow="Get Started" title="Tell Us What Your Business Needs" dark={false} />
        </div>

        <form onSubmit={handleSubmit} className="form-reveal" style={{
          background: '#fff', border: '1px solid rgba(45,106,79,0.1)', borderRadius: 24, padding: 'clamp(24px, 4vw, 44px)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="b2b-form-grid">
            <Field label="Business Name *">
              <input name="businessName" value={form.businessName} onChange={handleChange} required
                placeholder="e.g. Green Basket Retail" style={inputStyle} />
            </Field>
            <Field label="Contact Person *">
              <input name="contactName" value={form.contactName} onChange={handleChange} required
                placeholder="Your full name" style={inputStyle} />
            </Field>
            <Field label="Email">
              <input type="email" name="email" value={form.email} onChange={handleChange}
                placeholder="you@business.com" style={inputStyle} />
            </Field>
            <Field label="Phone Number *">
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} required
                placeholder="+91 98765 43210" style={inputStyle} />
            </Field>
            <Field label="Business Type">
              <select name="businessType" value={form.businessType} onChange={handleChange} style={inputStyle}>
                {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="City / Delivery Location">
              <input name="city" value={form.city} onChange={handleChange}
                placeholder="e.g. Coimbatore" style={inputStyle} />
            </Field>
          </div>

          <Field label="Estimated Monthly Quantity" style={{ marginTop: 18 }}>
            <input name="monthlyQuantity" value={form.monthlyQuantity} onChange={handleChange}
              placeholder="e.g. 50 units / month, 100 L / month" style={inputStyle} />
          </Field>

          <div style={{ marginTop: 26 }}>
            <p style={labelStyle}>Products You're Interested In</p>
            {loadingProducts ? (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#8A8272' }}>Loading products…</p>
            ) : products.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#8A8272' }}>
                No products available right now — let us know what you're looking for in the message below.
              </p>
            ) : (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10,
                maxHeight: 280, overflowY: 'auto', padding: 4,
              }}>
                {products.map((p) => {
                  const isChecked = !!selected[p._id]
                  return (
                    <label key={p._id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12,
                      border: `1px solid ${isChecked ? 'rgba(82,183,136,0.4)' : 'rgba(45,106,79,0.1)'}`,
                      background: isChecked ? 'rgba(82,183,136,0.07)' : '#FAFAF7', cursor: 'pointer',
                    }}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleProduct(p._id, p.name)}
                        style={{ width: 15, height: 15, flexShrink: 0, accentColor: '#2D6A4F' }} />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#26221C', flex: 1 }}>
                        {p.name}
                      </span>
                      {isChecked && (
                        <input
                          type="text"
                          value={selected[p._id]?.qty || ''}
                          onChange={(e) => setQty(p._id, e.target.value)}
                          placeholder="Qty"
                          onClick={(e) => e.preventDefault()}
                          style={{
                            width: 56, fontSize: 12, padding: '4px 6px', borderRadius: 8,
                            border: '1px solid rgba(45,106,79,0.2)', fontFamily: 'var(--font-body)',
                          }}
                        />
                      )}
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <Field label="Anything Else We Should Know?" style={{ marginTop: 22 }}>
            <textarea name="message" value={form.message} onChange={handleChange} rows={4}
              placeholder="Pack sizes, private label needs, delivery timeline, etc." style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>

          <button type="submit" disabled={submitting} style={{
            marginTop: 26, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: submitting ? '#A9C9B7' : 'linear-gradient(135deg, #2D6A4F, #1B4332)', color: '#FDF6EC',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, letterSpacing: '0.02em',
            padding: '15px 24px', borderRadius: 14, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
          }}>
            {submitting ? 'Sending…' : 'Submit Wholesale Inquiry'}
          </button>
        </form>
      </div>
    </section>
  )
}

const inputStyle = {
  width: '100%', fontFamily: 'var(--font-body)', fontSize: 13.5, color: '#26221C',
  padding: '11px 14px', borderRadius: 12, border: '1px solid rgba(45,106,79,0.16)',
  background: '#FAFAF7', outline: 'none',
}
const labelStyle = {
  fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 600, color: '#2D6A4F',
  letterSpacing: '0.04em', margin: '0 0 8px',
}

function Field({ label, children, style }) {
  return (
    <div style={style}>
      <p style={labelStyle}>{label}</p>
      {children}
    </div>
  )
}

/* ── FAQ ──────────────────────────────────────────────────────────────── */
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid rgba(45,106,79,0.1)', padding: '18px 0' }}>
      <button onClick={() => setOpen((v) => !v)} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0,
      }}>
        <span style={{ fontFamily: 'var(--font-heading)', color: '#26221C', fontSize: 15 }}>{q}</span>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 18, color: '#C8893A',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s',
        }}>+</span>
      </button>
      {open && (
        <p style={{ fontFamily: 'var(--font-body)', color: '#8A8272', fontSize: 13.5, lineHeight: 1.7, marginTop: 12 }}>
          {a}
        </p>
      )}
    </div>
  )
}

function FAQSection() {
  const ref = useReveal('.faq-reveal')
  return (
    <section ref={ref} className="home-section" style={{ background: '#FDF6EC' }}>
      <div className="container-main" style={{ maxWidth: 720 }}>
        <div className="faq-reveal">
          <SectionHeading eyebrow="Wholesale FAQ" title="Common Questions From Our Partners" dark={false} />
        </div>
        <div className="faq-reveal">
          {FAQS.map((f) => <FAQItem key={f.q} {...f} />)}
        </div>
      </div>
    </section>
  )
}

/* ── Final CTA ────────────────────────────────────────────────────────── */
function FinalCTA({ whatsappHref }) {
  const ref = useReveal('.final-cta-reveal')
  return (
    <section ref={ref} style={{ position: 'relative', overflow: 'hidden', padding: '64px 0' }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'linear-gradient(160deg, #0D2B1E 0%, #1B4332 40%, #2D6A4F 75%, #1A3D2B 100%)',
      }} />
      <div className="container-main final-cta-reveal" style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)', color: '#FDF6EC', fontSize: 'clamp(1.5rem,3.6vw,2.2rem)',
          maxWidth: 560, margin: '0 auto 16px',
        }}>
          Let's Grow Together
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(253,246,236,0.6)', fontSize: 14, maxWidth: 480, margin: '0 auto 28px' }}>
          Whether you're a retailer, restaurant, or distributor — we'll help you build a strong natural-products
          category with consistent quality and attractive margins.
        </p>
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'linear-gradient(135deg, #C8893A, #E9B87A)', color: '#1B2F24',
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
          padding: '14px 32px', borderRadius: 14, textDecoration: 'none',
          boxShadow: '0 8px 28px rgba(200,137,58,0.35)',
        }}>
          Talk to Us on WhatsApp
        </a>
      </div>
    </section>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function B2BWholesale() {
  const [phone, setPhone] = useState(STORE_PHONE_FALLBACK)

  useEffect(() => {
    settingsAPI.getPublic()
      .then(({ data }) => {
        const raw = data?.data?.storePhone
        if (!raw) return
        const digits = String(raw).replace(/\D/g, '')
        setPhone(digits.length === 10 ? `91${digits}` : digits)
      })
      .catch(() => {})
  }, [])

  const whatsappHref = `https://wa.me/${phone}?text=${encodeURIComponent('Hi Varnam! I\u2019d like to know more about bulk / wholesale ordering.')}`

  const b2bJsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'B2B / Wholesale', item: `${SITE_URL}/b2b-wholesale` },
      ],
    },
  ]

  return (
    <>
      <Seo
        title="B2B & Wholesale"
        description="Partner with Varnam Naturals for bulk and wholesale orders of organic cold-pressed oils, soaps and supplements. Attractive margins for retailers, restaurants and distributors."
        path="/b2b-wholesale"
        jsonLd={b2bJsonLd}
      />
      <B2BHero whatsappHref={whatsappHref} />
      <WhoWeSupply />
      <WhyPartner />
      <PacksAndLabel whatsappHref={whatsappHref} />
      <HowOrderingWorks />
      <InquiryForm />
      <FAQSection />
      <FinalCTA whatsappHref={whatsappHref} />
    </>
  )
}
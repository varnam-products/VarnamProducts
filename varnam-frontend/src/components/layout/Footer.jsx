import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import PolicyModal from '../ui/PolicyModal'
import { settingsAPI } from '../../services/api'

gsap.registerPlugin(ScrollTrigger)

// Navigates to the route AND scrolls to top — fixes footer links landing mid-page
function TopLink({ to, className, children }) {
  const navigate = useNavigate()
  const handleClick = (e) => {
    e.preventDefault()
    navigate(to)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  return <a href={to} onClick={handleClick} className={className}>{children}</a>
}

function LeafMark() {
  return (
    <img
      src="/logo.png"
      alt="Varnam Foods"
      className="w-11 h-11 sm:w-12 sm:h-12 object-contain flex-shrink-0"
      style={{ aspectRatio: '1 / 1' }}
    />
  )
}

const SHOP_LINKS = [
  { label: 'All Products', to: '/shop' },
  { label: 'New Arrivals', to: '/shop?sort=newest' },
  { label: 'Track Your Order', to: '/track-order' },
  { label: 'Search', to: '/search' },
  { label: 'B2B / Wholesale', to: '/b2b-wholesale' },
  { label: 'Blog', to: '/blog' },
  { label: 'Contact Us', to: '/contact' },
]

const ACCOUNT_LINKS = [
  { label: 'Login', to: '/login' },
  { label: 'Create Account', to: '/register' },
  { label: 'My Orders', to: '/orders' },
  { label: 'My Account', to: '/account' },
]

// Each entry needs a matching PDF placed at /public/policies/<file>.
// Clicking opens the PolicyModal (scrollable, centered popup) instead of downloading.
const POLICY_LINKS = [
  { label: 'Store Policies', file: '/policies/varnam-store-policies.pdf' },
]

/* ── Social icons (big, on-brand) ─────────────────────────────────────── */
function IconFacebook() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z"/>
    </svg>
  )
}
function IconInstagram() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  )
}
function IconWhatsApp() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor">
      <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.386.708 4.605 1.928 6.464L4.5 29l7.72-2.02A11.94 11.94 0 0 0 16.001 27C22.63 27 28 21.627 28 15S22.63 3 16.001 3zm0 21.818a9.78 9.78 0 0 1-4.99-1.367l-.358-.213-4.58 1.199 1.222-4.463-.233-.366A9.76 9.76 0 0 1 5.818 15c0-5.618 4.566-10.182 10.183-10.182 5.616 0 10.181 4.564 10.181 10.182 0 5.617-4.565 10.181-10.181 10.181h.001zm5.593-7.632c-.307-.153-1.812-.895-2.093-.997-.281-.102-.486-.153-.69.154-.204.306-.792.996-.972 1.2-.179.205-.358.23-.665.077-.307-.154-1.294-.477-2.464-1.52-.911-.812-1.526-1.815-1.705-2.122-.179-.307-.02-.473.134-.626.137-.137.306-.358.46-.537.153-.18.204-.307.306-.512.102-.204.05-.384-.026-.537-.076-.154-.69-1.662-.946-2.276-.249-.598-.502-.517-.69-.526a13.3 13.3 0 0 0-.588-.011c-.204 0-.537.077-.818.384-.281.306-1.073 1.048-1.073 2.557 0 1.508 1.098 2.966 1.251 3.17.153.205 2.16 3.297 5.234 4.624.731.316 1.301.505 1.745.646.733.233 1.4.2 1.927.121.588-.088 1.812-.74 2.068-1.456.256-.716.256-1.329.179-1.456-.076-.128-.281-.205-.588-.358z"/>
    </svg>
  )
}

function SocialIcons({ socialLinks, phone }) {
  const waLink = (() => {
    const raw = socialLinks?.whatsapp
    if (!raw) return phone ? `https://wa.me/${phone}` : ''
    if (/^https?:\/\//i.test(raw)) return raw
    const digits = raw.replace(/\D/g, '')
    return digits ? `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}` : ''
  })()

  const items = [
    { key: 'facebook', href: socialLinks?.facebook, Icon: IconFacebook, label: 'Facebook', hoverBg: '#1877F2' },
    { key: 'instagram', href: socialLinks?.instagram, Icon: IconInstagram, label: 'Instagram', hoverBg: '#E1306C' },
    { key: 'whatsapp', href: waLink, Icon: IconWhatsApp, label: 'WhatsApp', hoverBg: '#25D366' },
  ].filter(i => i.href)

  if (!items.length) return null

  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
      {items.map(({ key, href, Icon, label, hoverBg }) => (
        <a
          key={key} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.06)', color: '#D6D0C4',
            border: '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = hoverBg; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#D6D0C4'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          <Icon />
        </a>
      ))}
    </div>
  )
}

export default function Footer() {
  const footerRef = useRef(null)
  const [openPolicy, setOpenPolicy] = useState(null)
  const [contactInfo, setContactInfo] = useState({
    email: 'hello@varnamnaturals.com',
    phone: '919999999999',
    address: null,
    workingHours: '',
    socialLinks: null,
  })

  useEffect(() => {
    let cancelled = false
    settingsAPI.getPublic()
      .then(({ data }) => {
        if (cancelled) return
        const s = data?.data
        if (!s) return
        const digits = (s.storePhone || '').replace(/\D/g, '')
        setContactInfo({
          email: s.storeEmail || 'hello@varnamnaturals.com',
          phone: digits ? (digits.length === 10 ? `91${digits}` : digits) : '919999999999',
          address: s.address || null,
          workingHours: s.workingHours || '',
          socialLinks: s.socialLinks || null,
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const addressLine = contactInfo.address
    ? [contactInfo.address.line1, contactInfo.address.city, contactInfo.address.state].filter(Boolean).join(', ')
    : ''

  const hoursLines = (contactInfo.workingHours || 'Monday – Saturday\n10 AM – 6 PM IST').split('\n').filter(Boolean)

  useGSAP(() => {
    const items = footerRef.current?.querySelectorAll('.footer-reveal')
    if (!items?.length) return

    // Set visible by default — prevents elements staying hidden if trigger never fires
    gsap.set(items, { y: 0, opacity: 1 })

    const trigger = ScrollTrigger.create({
      trigger: footerRef.current,
      start: 'top 95%',
      once: true,
      onEnter: () => {
        gsap.fromTo(items,
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.07, duration: 0.7, ease: 'power3.out' }
        )
      },
    })

    return () => trigger.kill()
  }, { scope: footerRef })

  return (
    <footer ref={footerRef} className="bg-neutral-800 text-neutral-300 mt-auto overflow-hidden relative">
      {/* Subtle organic texture top border */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-brand-green/30 to-transparent" />

      {/* Decorative leaf — large background */}
      <div className="absolute top-0 right-0 w-72 h-72 opacity-[0.03] pointer-events-none translate-x-12 -translate-y-8">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 180 C20 80 100 10 190 5 C180 100 110 165 20 180Z" fill="#52B788" />
        </svg>
      </div>

      <div className="container-main py-16 relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">

          {/* Brand column */}
          <div className="lg:col-span-4 footer-reveal">
            <TopLink to="/" className="inline-flex items-center gap-2.5 mb-5 group">
              <LeafMark />
              <div className="flex flex-col leading-none">
                <span className="font-heading text-xl text-white tracking-tight">varnam</span>
                <span className="text-[9px] font-body tracking-[0.22em] text-brand-amber uppercase mt-0.5">naturals</span>
              </div>
            </TopLink>
            <p className="text-sm font-body leading-relaxed text-neutral-400 max-w-[260px] mb-6">
              Pure, cold-pressed, and chemical-free. Rooted in tradition, crafted for modern living.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2">
              {['100% Natural', 'Cold Pressed', 'No Chemicals'].map((tag) => (
                <span key={tag} className="text-[10px] font-body tracking-wide px-2.5 py-1 rounded-full border border-neutral-700 text-neutral-500">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div className="lg:col-span-3 lg:col-start-6 footer-reveal">
            <p className="font-body font-semibold text-white text-[11px] tracking-[0.15em] uppercase mb-5">
              Shop
            </p>
            <ul className="space-y-3">
              {SHOP_LINKS.map(({ label, to }) => (
                <li key={to}>
                  <TopLink to={to} className="text-[13px] font-body text-neutral-400 hover:text-brand-amber-light transition-colors duration-150 flex items-center gap-1.5 group">
                    <span className="w-0 group-hover:w-2 h-[1px] bg-brand-amber transition-all duration-200 rounded-full" />
                    {label}
                  </TopLink>
                </li>
              ))}
              {POLICY_LINKS.map(({ label, file }) => (
                <li key={file}>
                  <button
                    onClick={() => setOpenPolicy({ label, file })}
                    className="text-[13px] font-body text-neutral-400 hover:text-brand-amber-light transition-colors duration-150 flex items-center gap-1.5 group text-left"
                  >
                    <span className="w-0 group-hover:w-2 h-[1px] bg-brand-amber transition-all duration-200 rounded-full" />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div className="lg:col-span-2 footer-reveal">
            <p className="font-body font-semibold text-white text-[11px] tracking-[0.15em] uppercase mb-5">
              Account
            </p>
            <ul className="space-y-3">
              {ACCOUNT_LINKS.map(({ label, to }) => (
                <li key={to}>
                  <TopLink to={to} className="text-[13px] font-body text-neutral-400 hover:text-brand-amber-light transition-colors duration-150 flex items-center gap-1.5 group">
                    <span className="w-0 group-hover:w-2 h-[1px] bg-brand-amber transition-all duration-200 rounded-full" />
                    {label}
                  </TopLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-3 footer-reveal">
            <p className="font-body font-semibold text-white text-[11px] tracking-[0.15em] uppercase mb-5">
              Get In Touch
            </p>
            <ul className="space-y-3 text-[13px] font-body">
              <li>
                <a href={`mailto:${contactInfo.email}`}
                  className="text-neutral-400 hover:text-brand-amber-light transition-colors duration-150 break-all">
                  {contactInfo.email}
                </a>
              </li>
              <li>
                <a href={`tel:+${contactInfo.phone}`}
                  className="text-neutral-400 hover:text-brand-amber-light transition-colors duration-150">
                  +{contactInfo.phone.length === 12 ? `${contactInfo.phone.slice(0,2)} ${contactInfo.phone.slice(2)}` : contactInfo.phone}
                </a>
              </li>
              {addressLine && (
                <li className="text-neutral-500 text-[12.5px] leading-relaxed">
                  {addressLine}
                </li>
              )}
              <li className="text-neutral-600 text-[12px] pt-1 leading-relaxed">
                {hoursLines.map((l, i) => <span key={i}>{l}<br /></span>)}
              </li>
            </ul>

            <SocialIcons socialLinks={contactInfo.socialLinks} phone={contactInfo.phone} />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-reveal mt-14 pt-6 border-t border-neutral-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[11px] font-body text-neutral-600">
            © {new Date().getFullYear()} Varnam Foods. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-[11px] font-body text-neutral-700 tracking-widest uppercase">Pure · Natural · Cold Pressed</span>
            <span className="text-[11px] font-body text-neutral-600">
              Powered by{' '}
              <a
                href="https://livinstudio2026-debug.github.io/Portfolio-Livin-Studio/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 hover:text-brand-amber-light transition-colors duration-150"
              >
                Leo
              </a>
            </span>
          </div>
        </div>
      </div>

      <PolicyModal
        open={!!openPolicy}
        onClose={() => setOpenPolicy(null)}
        title={openPolicy?.label}
        file={openPolicy?.file}
      />
    </footer>
  )
}
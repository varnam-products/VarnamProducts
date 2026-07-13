import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import toast from 'react-hot-toast'
import { contactAPI, settingsAPI } from '../services/api'
import Seo, { SITE_URL } from '../components/common/Seo'

gsap.registerPlugin(ScrollTrigger)

const STORE_EMAIL_FALLBACK = 'hello@varnamnaturals.com'
const STORE_PHONE_FALLBACK = '919999999999'

/* ── Icons ────────────────────────────────────────────────────────────── */
const IconPhone = ({ color = '#E9B87A' }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l1.27-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
)
const IconMail = ({ color = '#E9B87A' }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
)
const IconMapPin = ({ color = '#E9B87A' }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
)
const IconClock = ({ color = '#E9B87A' }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)
const IconArrowUpRight = ({ color = '#E9B87A' }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
  </svg>
)

// Brand icons for the social row
const IconFacebook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z"/>
  </svg>
)
const IconInstagram = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
)
const IconWhatsApp = () => (
  <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor">
    <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.386.708 4.605 1.928 6.464L4.5 29l7.72-2.02A11.94 11.94 0 0 0 16.001 27C22.63 27 28 21.627 28 15S22.63 3 16.001 3zm0 21.818a9.78 9.78 0 0 1-4.99-1.367l-.358-.213-4.58 1.199 1.222-4.463-.233-.366A9.76 9.76 0 0 1 5.818 15c0-5.618 4.566-10.182 10.183-10.182 5.616 0 10.181 4.564 10.181 10.182 0 5.617-4.565 10.181-10.181 10.181h.001zm5.593-7.632c-.307-.153-1.812-.895-2.093-.997-.281-.102-.486-.153-.69.154-.204.306-.792.996-.972 1.2-.179.205-.358.23-.665.077-.307-.154-1.294-.477-2.464-1.52-.911-.812-1.526-1.815-1.705-2.122-.179-.307-.02-.473.134-.626.137-.137.306-.358.46-.537.153-.18.204-.307.306-.512.102-.204.05-.384-.026-.537-.076-.154-.69-1.662-.946-2.276-.249-.598-.502-.517-.69-.526a13.3 13.3 0 0 0-.588-.011c-.204 0-.537.077-.818.384-.281.306-1.073 1.048-1.073 2.557 0 1.508 1.098 2.966 1.251 3.17.153.205 2.16 3.297 5.234 4.624.731.316 1.301.505 1.745.646.733.233 1.4.2 1.927.121.588-.088 1.812-.74 2.068-1.456.256-.716.256-1.329.179-1.456-.076-.128-.281-.205-.588-.358z"/>
  </svg>
)

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
function ContactHero() {
  const ref = useRef(null)
  useGSAP(() => {
    gsap.fromTo('.contact-hero-reveal',
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
        <div className="contact-hero-reveal" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ display: 'block', width: 32, height: 1, background: 'rgba(233,184,122,0.5)' }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#E9B87A', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
            Contact Us
          </span>
          <span style={{ display: 'block', width: 32, height: 1, background: 'rgba(233,184,122,0.5)' }} />
        </div>
        <h1 className="contact-hero-reveal" style={{
          fontFamily: 'var(--font-heading)', color: '#FDF6EC',
          fontSize: 'clamp(1.9rem,5vw,3.2rem)', lineHeight: 1.15, maxWidth: 780, margin: '0 auto 20px',
        }}>
          We'd Love to Hear From You
        </h1>
        <p className="contact-hero-reveal" style={{
          fontFamily: 'var(--font-body)', color: 'rgba(253,246,236,0.6)', fontSize: 15, lineHeight: 1.7,
          maxWidth: 560, margin: '0 auto 0',
        }}>
          Questions about an order, our products, or a partnership? Reach out — our team typically replies within 24 hours.
        </p>
      </div>
    </section>
  )
}

/* ── Info row (stacked list item, not a card) ────────────────────────── */
function InfoRow({ Icon, label, children, last }) {
  return (
    <div className="split-reveal" style={{
      display: 'flex', gap: 16, padding: '18px 0',
      borderBottom: last ? 'none' : '1px solid rgba(253,246,236,0.1)',
    }}>
      <span style={{
        flexShrink: 0, width: 38, height: 38, borderRadius: '50%',
        border: '1px solid rgba(233,184,122,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon />
      </span>
      <div style={{ minWidth: 0 }}>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 700, color: '#E9B87A',
          letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 5px',
        }}>
          {label}
        </p>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'rgba(253,246,236,0.88)', lineHeight: 1.65 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ── Field (form) ─────────────────────────────────────────────────────── */
const inputStyle = {
  width: '100%', fontFamily: 'var(--font-body)', fontSize: 13.5, color: '#26221C',
  padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(45,106,79,0.16)',
  background: '#FAFAF7', outline: 'none', boxSizing: 'border-box',
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

const EMPTY_FORM = { name: '', email: '', phone: '', subject: 'General Inquiry', message: '' }
const SUBJECTS = ['General Inquiry', 'Order Support', 'Product Question', 'B2B / Wholesale', 'Feedback', 'Other']

/* ── Unified split section: info panel + social row + form, one cohesive
   layout instead of a stack of repeated boxed cards ─────────────────── */
function ContactSplit({ info }) {
  const ref = useReveal('.split-reveal')
  const { phone, email, address, workingHours, socialLinks } = info

  const addressLines = [
    address?.line1,
    address?.line2,
    [address?.city, address?.state].filter(Boolean).join(', '),
    address?.postalCode,
    address?.country,
  ].filter(Boolean)

  const hoursRows = Array.isArray(workingHours)
    ? workingHours.filter(row => row?.days || row?.hours)
    : (typeof workingHours === 'string' ? workingHours.split('\n').filter(Boolean).map(l => ({ days: l, hours: '' })) : [])

  const waLink = (() => {
    const raw = socialLinks?.whatsapp
    if (!raw) return phone ? `https://wa.me/${phone}` : ''
    if (/^https?:\/\//i.test(raw)) return raw
    const digits = raw.replace(/\D/g, '')
    return digits ? `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}` : ''
  })()

  const socialLinksList = [
    { key: 'facebook', label: 'Facebook', Icon: IconFacebook, href: socialLinks?.facebook },
    { key: 'instagram', label: 'Instagram', Icon: IconInstagram, href: socialLinks?.instagram },
    { key: 'whatsapp', label: 'WhatsApp', Icon: IconWhatsApp, href: waLink },
  ].filter(l => l.href)

  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const mailtoFallback = () => {
    const lines = [
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      `Phone: ${form.phone}`,
      `Subject: ${form.subject}`,
      '',
      form.message,
    ].join('\n')
    const subject = encodeURIComponent(`${form.subject} — ${form.name || 'Website Contact'}`)
    window.location.href = `mailto:${email}?subject=${subject}&body=${encodeURIComponent(lines)}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please fill in your name, email, and message.')
      return
    }
    setSubmitting(true)
    try {
      await contactAPI.submit(form)
      toast.success('Message sent! We\u2019ll get back to you within 24 hours.')
      setForm(EMPTY_FORM)
    } catch (err) {
      mailtoFallback()
      toast.success('Opening your email app to send the message directly.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section ref={ref} className="home-section" style={{ background: '#FDF6EC' }}>
      <div className="container-main">
        <div className="contact-split-panel" style={{
          display: 'grid', gridTemplateColumns: '1fr 1.15fr',
          borderRadius: 28, overflow: 'hidden', boxShadow: '0 30px 80px rgba(27,67,50,0.16)',
        }}>
          {/* LEFT — dark info panel */}
          <div style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(160deg, #0D2B1E 0%, #1B4332 45%, #2D6A4F 100%)',
            padding: 'clamp(34px,4vw,56px) clamp(28px,3.6vw,48px)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{
              position: 'absolute', zIndex: 0, bottom: '-25%', left: '-15%', width: '65%', height: '65%',
              background: 'radial-gradient(ellipse at center, rgba(200,137,58,0.14) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="split-reveal" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ display: 'block', width: 24, height: 1, background: 'rgba(233,184,122,0.5)' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#E9B87A', letterSpacing: '0.26em', textTransform: 'uppercase' }}>
                  Get In Touch
                </span>
              </div>
              <h2 className="split-reveal" style={{
                fontFamily: 'var(--font-heading)', color: '#FDF6EC',
                fontSize: 'clamp(1.5rem,2.6vw,2rem)', lineHeight: 1.22, margin: '0 0 14px', maxWidth: 380,
              }}>
                Every way to reach the Varnam team
              </h2>
              <p className="split-reveal" style={{
                fontFamily: 'var(--font-body)', color: 'rgba(253,246,236,0.6)', fontSize: 13.5, lineHeight: 1.7,
                margin: '0 0 8px', maxWidth: 380,
              }}>
                Call, message, or drop by — whatever's easiest for you.
              </p>

              <div style={{ marginTop: 12 }}>
                <InfoRow Icon={IconPhone} label="Call Us">
                  <a href={`tel:+${phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    +{phone?.length === 12 ? `${phone.slice(0, 2)} ${phone.slice(2)}` : phone}
                  </a>
                </InfoRow>
                <InfoRow Icon={IconMail} label="Email Us">
                  <a href={`mailto:${email}`} style={{ color: 'inherit', textDecoration: 'none', wordBreak: 'break-word' }}>
                    {email}
                  </a>
                </InfoRow>
                <InfoRow Icon={IconMapPin} label="Visit Us">
                  {addressLines.length
                    ? addressLines.map((l, i) => <div key={i}>{l}</div>)
                    : <div>Coimbatore, Tamil Nadu, India</div>}
                  {address?.mapLink && (
                    <a href={address.mapLink} target="_blank" rel="noopener noreferrer" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8,
                      color: '#E9B87A', textDecoration: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.03em',
                    }}>
                      Get Directions <IconArrowUpRight />
                    </a>
                  )}
                </InfoRow>
                <InfoRow Icon={IconClock} label="Working Hours" last={!socialLinksList.length}>
                  {hoursRows.length
                    ? hoursRows.map((row, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, maxWidth: 300 }}>
                        <span>{row.days}</span>
                        {row.hours && <span style={{ color: 'rgba(253,246,236,0.55)' }}>{row.hours}</span>}
                      </div>
                    ))
                    : <div>Monday – Saturday: 10 AM – 6 PM IST</div>}
                </InfoRow>
              </div>

              {socialLinksList.length > 0 && (
                <div className="split-reveal" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(253,246,236,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Follow
                  </span>
                  {socialLinksList.map(({ key, label, Icon, href }) => (
                    <a
                      key={key} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                      style={{
                        width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid rgba(253,246,236,0.22)', color: '#FDF6EC', transition: 'background 0.2s, border-color 0.2s, transform 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(233,184,122,0.16)'; e.currentTarget.style.borderColor = '#E9B87A'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(253,246,236,0.22)'; e.currentTarget.style.transform = 'translateY(0)' }}
                    >
                      <Icon />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — form panel */}
          <div style={{
            background: '#fff', padding: 'clamp(34px,4vw,56px) clamp(28px,3.6vw,48px)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div className="split-reveal" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ display: 'block', width: 24, height: 1, background: 'rgba(200,137,58,0.4)' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#C8893A', letterSpacing: '0.26em', textTransform: 'uppercase' }}>
                Send a Message
              </span>
            </div>
            <h3 className="split-reveal" style={{
              fontFamily: 'var(--font-heading)', color: '#26221C', fontSize: 'clamp(1.3rem,2.2vw,1.7rem)',
              lineHeight: 1.25, margin: '0 0 24px',
            }}>
              Drop us a line
            </h3>

            <form onSubmit={handleSubmit} className="split-reveal">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="contact-form-grid">
                <Field label="Your Name *">
                  <input name="name" value={form.name} onChange={handleChange} required
                    placeholder="Your full name" style={inputStyle} />
                </Field>
                <Field label="Email Address *">
                  <input type="email" name="email" value={form.email} onChange={handleChange} required
                    placeholder="you@example.com" style={inputStyle} />
                </Field>
                <Field label="Phone Number">
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                    placeholder="+91 98765 43210" style={inputStyle} />
                </Field>
                <Field label="Subject">
                  <select name="subject" value={form.subject} onChange={handleChange} style={inputStyle}>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Message *" style={{ marginTop: 16 }}>
                <textarea name="message" value={form.message} onChange={handleChange} rows={5} required
                  placeholder="How can we help you?" style={{ ...inputStyle, resize: 'vertical' }} />
              </Field>

              <button type="submit" disabled={submitting} style={{
                marginTop: 22, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: submitting ? '#A9C9B7' : 'linear-gradient(135deg, #2D6A4F, #1B4332)', color: '#FDF6EC',
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, letterSpacing: '0.02em',
                padding: '15px 24px', borderRadius: 14, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
              }}>
                <IconSend /> {submitting ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .contact-split-panel { grid-template-columns: 1fr !important; border-radius: 22px !important; }
        }
        @media (max-width: 640px) {
          .contact-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function Contact() {
  const [info, setInfo] = useState({
    phone: STORE_PHONE_FALLBACK,
    email: STORE_EMAIL_FALLBACK,
    address: null,
    workingHours: [],
    socialLinks: null,
  })

  useEffect(() => {
    settingsAPI.getPublic()
      .then(({ data }) => {
        const s = data?.data
        if (!s) return
        const rawPhone = s.storePhone || ''
        const digits = rawPhone.replace(/\D/g, '')
        setInfo({
          phone: digits ? (digits.length === 10 ? `91${digits}` : digits) : STORE_PHONE_FALLBACK,
          email: s.storeEmail || STORE_EMAIL_FALLBACK,
          address: s.address || null,
          workingHours: s.workingHours || [],
          socialLinks: s.socialLinks || null,
        })
      })
      .catch(() => {})
  }, [])

  const contactJsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Varnam Naturals',
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      email: info.email,
      telephone: info.phone ? `+${info.phone}` : undefined,
      ...(info.address ? {
        address: {
          '@type': 'PostalAddress',
          streetAddress: [info.address.line1, info.address.line2].filter(Boolean).join(', ') || undefined,
          addressLocality: info.address.city || undefined,
          addressRegion: info.address.state || undefined,
          postalCode: info.address.postalCode || undefined,
          addressCountry: info.address.country || undefined,
        },
      } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Contact', item: `${SITE_URL}/contact` },
      ],
    },
  ]

  return (
    <>
      <Seo
        title="Contact Us"
        description="Get in touch with Varnam Naturals — questions about orders, products or wholesale, we're here to help."
        path="/contact"
        jsonLd={contactJsonLd}
      />
      <ContactHero />
      <ContactSplit info={info} />
    </>
  )
}
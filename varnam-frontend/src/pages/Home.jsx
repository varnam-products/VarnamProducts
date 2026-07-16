import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useHomeStore } from '../store/homeStore'
import { useCartStore } from '../store/cartStore'
import ProductCard from '../components/ui/ProductCard'
import fssaiLogo from '../assets/fssai.png'
import msmeLogo from '../assets/msme.png'
import Seo, { SITE_URL } from '../components/common/Seo'
import { settingsAPI } from '../services/api'

gsap.registerPlugin(ScrollTrigger)

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   ICONS â€” all SVG, no emojis
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const ChevronRight = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)
const ChevronLeft = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

// Trust bar icons
// stroke is green (#2D6A4F) so icons are visible on the light trust bar background
const IconLeaf = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </svg>
)

const IconDroplet = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
  </svg>
)

const IconTruck = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="1"/>
    <path d="M16 8h4l3 3v5h-7V8z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
)

const IconShield = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
)

// Why Varnam icons
const IconSprout = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#52B788" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 20h10"/>
    <path d="M10 20c5.5-2.5.8-6.4 3-9"/>
    <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-2-3.1.3-1.3 1.6-2 2.7-2.1 1-.1 1.8.1 2.4.6C9.9 8 9.5 9 9.5 9.4z"/>
    <path d="M14.1 6c-.7 1.5-.5 3.3.1 4.7 1.7-.5 3-.7 4.2-.1 1.1.6 2 1.9 1.6 3.2-.4 1.2-1.8 1.8-2.9 1.8-1 0-1.8-.4-2.4-1-.7-.7-1.4-1.7-1.6-2.8"/>
  </svg>
)

const IconFlask = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#52B788" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6v7l3.5 7A2 2 0 0 1 16.7 20H7.3a2 2 0 0 1-1.8-3L9 10V3z"/>
    <line x1="9" y1="3" x2="15" y2="3"/>
    <path d="M6.5 15h11"/>
  </svg>
)

const IconSnowflake = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#52B788" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="22"/>
    <path d="M17 7l-5-5-5 5"/>
    <path d="M17 17l-5 5-5-5"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M7 7l-5 5 5 5"/>
    <path d="M17 7l5 5-5 5"/>
  </svg>
)

const IconPackage = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#52B788" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16.5 9.4l-9-5.19"/>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
)

const IconTruckFast = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#52B788" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="1"/>
    <path d="M16 8h4l3 3v5h-7V8z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
    <path d="M0 10h3"/>
    <path d="M0 13h5"/>
  </svg>
)

const IconPlane = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#52B788" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2 11 13"/>
    <path d="M22 2 15 22l-4-9-9-4 20-7z"/>
  </svg>
)

const IconWheel = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#52B788" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="3.5"/>
    <path d="M12 3v3"/>
    <path d="M12 18v3"/>
    <path d="M3 12h3"/>
    <path d="M18 12h3"/>
    <path d="M6.5 6.5l2 2"/>
    <path d="M15.5 15.5l2 2"/>
    <path d="M6.5 17.5l2-2"/>
    <path d="M15.5 8.5l2-2"/>
  </svg>
)

const IconMicroscope = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#52B788" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 21h16"/>
    <path d="M9 21c-1.5-2.5-1.5-5 0-7l3-3"/>
    <path d="M14 11a4 4 0 1 0-4-4"/>
    <path d="M13 4h4"/>
    <path d="M9 14h3"/>
    <circle cx="17" cy="18" r="2.4"/>
  </svg>
)

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   1. HERO BANNER
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   1. HERO BANNER
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function FloatingBubbles() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let bubbles = [];

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = canvas.parentElement.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // INCREASED AMOUNT: Bumped from 18 to 50 for a richer floating ecosystem
    const bubbleCount = 50;
    for (let i = 0; i < bubbleCount; i++) {
      bubbles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height + canvas.height,
        radius: Math.random() * 10 + 3, // Slightly tighter radii bounds for elegance at scale
        speed: Math.random() * 0.55 + 0.15, // Subtle variation so they don't rush the content
        opacity: Math.random() * 0.10 + 0.03, // Soft transparency thresholds to preserve readability
        wobble: Math.random() * 2,
        wobbleSpeed: Math.random() * 0.015 + 0.005
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        b.y -= b.speed;
        b.wobble += b.wobbleSpeed;
        
        // Horizontal floating variation
        const currentX = b.x + Math.sin(b.wobble) * 12;

        ctx.beginPath();
        ctx.arc(currentX, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(253, 246, 236, ${b.opacity})`;
        ctx.fill();

        // Recycle bubble to bottom when it exits frame cleanly
        if (b.y + b.radius < 0) {
          b.y = canvas.height + b.radius;
          b.x = Math.random() * canvas.width;
          b.radius = Math.random() * 10 + 3;
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ position: 'absolute', inset: 0, zIndex: 15, pointerEvents: 'none' }} 
    />
  );
}

function HeroBanner({ banners, loading }) {
  const safeList = Array.isArray(banners) ? banners : []
  const [idx, setIdx]       = useState(0)
  const lockedRef = useRef(false)
  const slidesRef = useRef([])
  const textsRef  = useRef([])
  const dotsRef   = useRef([])
  const videoRefs = useRef([])
  const touchStartX = useRef(null)

  const go = useCallback((next) => {
    if (lockedRef.current || safeList.length < 2) return
    lockedRef.current = true
    const prev = idx
    const to   = ((next % safeList.length) + safeList.length) % safeList.length
    gsap.to(textsRef.current[prev], { y: -20, opacity: 0, duration: 0.25, ease: 'power2.in' })
    gsap.set(slidesRef.current[to], { zIndex: 10, opacity: 0 })
    gsap.to(slidesRef.current[to], { opacity: 1, duration: 0.7, ease: 'sine.inOut' })
    gsap.to(slidesRef.current[prev], {
      opacity: 0, duration: 0.7, ease: 'sine.inOut',
      onComplete: () => { gsap.set(slidesRef.current[prev], { zIndex: 1 }); lockedRef.current = false }
    })
    setTimeout(() => {
      gsap.fromTo(textsRef.current[to], { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', delay: 0.15 })
    }, 0)
    dotsRef.current.forEach((d, i) => {
      if (!d) return
      gsap.to(d, { width: i === to ? 28 : 8, backgroundColor: i === to ? '#FDF6EC' : 'rgba(253,246,236,0.35)', duration: 0.3 })
    })
    // stop the outgoing video so it isn't still playing (and firing 'ended') off-screen
    const outgoingVideo = videoRefs.current[prev]
    if (outgoingVideo) {
      try { outgoingVideo.pause() } catch (_) { /* noop */ }
    }
    setIdx(to)
  }, [idx, safeList.length])

  // Auto-advance rules:
  //  - image slide  -> advance after a fixed delay (5s)
  //  - video slide  -> wait for the clip to finish playing, then advance
  // Manual navigation (arrows / dots / swipe) works at any time and simply
  // resets this effect via the idx change, so it never fights the user.
  useEffect(() => {
    if (!safeList.length) return
    const current = safeList[idx]
    if (!current) return

    if (current.mediaType === 'video') {
      const vid = videoRefs.current[idx]
      if (!vid) return
      if (safeList.length < 2) return // nothing to advance to, let it loop on its own

      const handleEnded = () => go(idx + 1)
      vid.addEventListener('ended', handleEnded)
      vid.currentTime = 0
      const playPromise = vid.play?.()
      if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {})
      return () => vid.removeEventListener('ended', handleEnded)
    }

    if (safeList.length < 2) return
    const timer = setTimeout(() => go(idx + 1), 5000)
    return () => clearTimeout(timer)
  }, [idx, safeList.length, go])

  const heroStyle = { position: 'relative', width: '100%', height: 'min(90vh,760px)', minHeight: 400, overflow: 'hidden' }

  if (loading) return <div className="skeleton w-full" style={heroStyle} />

  if (!safeList.length) return (
    <div style={{ ...heroStyle, display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg,#1B4332 0%,#2D6A4F 55%,#40916C 100%)' }}>
      <FloatingBubbles />
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: -160, right: -160, width: 600, height: 600, borderRadius: '50%', background: '#52B788', opacity: 0.07, filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 320, height: 320, borderRadius: '50%', background: '#C8893A', opacity: 0.06, filter: 'blur(60px)' }} />
      </div>
      <div className="container-main" style={{ position: 'relative', zIndex: 20, width: '100%' }}>
        <div style={{ maxWidth: 560 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20, background: 'rgba(255,255,255,0.08)', borderRadius: 99, padding: '6px 16px', border: '1px solid rgba(255,255,255,0.12)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E9B87A', display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#E9B87A', letterSpacing: '0.2em', textTransform: 'uppercase' }}>100% Certified Organic</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', color: '#fff', fontSize: 'clamp(2rem,7vw,4.5rem)', lineHeight: 1.08, marginBottom: 20 }}>
            Pure Nature.<br />
            <em style={{ fontStyle: 'normal', color: '#E9B87A' }}>Pure Life.</em>
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(0.95rem,2vw,1.1rem)', lineHeight: 1.7, maxWidth: 440, marginBottom: 32 }}>
            Farm-to-doorstep organic products. Cold-pressed, chemical-free, crafted with care for your family.
          </p>
          <div className="hero-buttons" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/shop" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#C8893A', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, padding: '13px 28px', borderRadius: 14, textDecoration: 'none', boxShadow: '0 8px 28px rgba(0,0,0,0.25)' }}>
              Shop Now <ChevronRight size={14} />
            </Link>
            <Link to="/track-order" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 14, padding: '13px 24px', borderRadius: 14, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
              Track Order
            </Link>
          </div>
        </div>
      </div>
    </div>
  )

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) {
      go(diff > 0 ? idx + 1 : idx - 1)
    }
    touchStartX.current = null
  }

  return (
    <div
      style={heroStyle}
      className="group select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <FloatingBubbles />
      {safeList.map((b, i) => (
        <div key={b._id} ref={el => slidesRef.current[i] = el}
          style={{ position: 'absolute', inset: 0, zIndex: i === 0 ? 10 : 1, opacity: i === 0 ? 1 : 0 }}>
          {b.mediaType === 'video' ? (
            <video
              ref={el => videoRefs.current[i] = el}
              src={b.image}
              poster={b.image.replace(/\.\w+(\?.*)?$/, '.jpg$1')}
              autoPlay muted loop={safeList.length < 2} playsInline preload="metadata"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <img src={b.image} alt={b.title || 'Banner'} draggable={false}
              fetchpriority={i === 0 ? 'high' : 'low'}
              loading={i === 0 ? 'eager' : 'lazy'}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'linear-gradient(90deg,rgba(0,0,0,0.72) 0%,rgba(0,0,0,0.32) 55%,transparent 100%)' }} />
          <div style={{ position: 'absolute', inset: 0, zIndex: 11, background: 'linear-gradient(to top,rgba(0,0,0,0.35) 0%,transparent 60%)' }} />
          <div ref={el => textsRef.current[i] = el}
            style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center' }}>
            <div className="container-main" style={{ width: '100%' }}>
              <div style={{ maxWidth: 560 }}>
                {b.subtitle && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                    <span style={{ width: 24, height: 1, background: '#E9B87A', display: 'block', opacity: 0.8 }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#E9B87A', letterSpacing: '0.22em', textTransform: 'uppercase' }}>{b.subtitle}</span>
                  </div>
                )}
                <h1 style={{ fontFamily: 'var(--font-heading)', color: '#fff', fontSize: 'clamp(1.8rem,5.5vw,3.8rem)', lineHeight: 1.1, marginBottom: 24, textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
                  {b.title}
                </h1>
                {b.buttonText && b.buttonLink && (
                  <div className="hero-buttons" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <Link to={b.buttonLink} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#C8893A', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, padding: '12px 24px', borderRadius: 13, textDecoration: 'none', boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}>
                      {b.buttonText} <ChevronRight size={13} />
                    </Link>
                    <Link to="/shop" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 14, padding: '12px 22px', borderRadius: 13, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}>
                      Browse All
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {safeList.length > 1 && (
        <>
          {[
            { label: 'prev', pos: { left: 16 },  icon: <ChevronLeft size={17} />,  fn: () => go(idx - 1) },
            { label: 'next', pos: { right: 16 }, icon: <ChevronRight size={17} />, fn: () => go(idx + 1) },
          ].map(({ label, pos, icon, fn }) => (
            <button key={label} onClick={fn} aria-label={`${label} slide`}
              className="hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ WebkitAppearance: 'none', appearance: 'none', position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 30, ...pos, width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', color: '#fff', cursor: 'pointer', outline: 'none', alignItems: 'center', justifyContent: 'center' }}>
              {icon}
            </button>
          ))}
        </>
      )}
      {safeList.length > 1 && (
        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 30, display: 'flex', gap: 8, alignItems: 'center' }}>
          {safeList.map((_, i) => (
            <button key={i}
              onClick={() => go(i)} aria-label={`Slide ${i + 1}`}
              style={{ WebkitAppearance: 'none', appearance: 'none', minWidth: 24, minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', outline: 'none', boxShadow: 'none', cursor: 'pointer', padding: 0, margin: 0, background: 'transparent', backgroundColor: 'transparent' }}>
              <span ref={el => dotsRef.current[i] = el} style={{ height: 7, width: i === 0 ? 28 : 8, borderRadius: 99, background: i === 0 ? '#FDF6EC' : 'rgba(253,246,236,0.35)', pointerEvents: 'none' }} />
            </button>
            
          ))}
        </div>
      )}
      {safeList.length > 1 && (
        <div style={{ position: 'absolute', bottom: 28, right: 20, zIndex: 30, fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>
          {String(idx + 1).padStart(2, '0')} / {String(safeList.length).padStart(2, '0')}
        </div>
      )}
    </div>
  )
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   2. TRUST BAR â€” SVG icons
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const TRUST_STATIC = [
  {
    Icon: IconLeaf,
    title: '100% Natural',
    sub: 'Zero synthetic additives',
    stat: 'Pure',
    glow: 'rgba(82,183,136,0.18)',
  },
  {
    Icon: IconDroplet,
    title: 'Cold Pressed',
    sub: 'Nutrients fully preserved',
    stat: 'Raw',
    glow: 'rgba(82,183,136,0.14)',
  },
  {
    Icon: IconShield,
    title: 'Certified Organic',
    sub: 'Third-party verified',
    stat: 'Verified',
    glow: 'rgba(82,183,136,0.18)',
  },
]

function TrustBar() {
  const ref = useRef(null)
  const freeShippingThreshold = useCartStore((s) => s.freeShippingThreshold)
  const fetchSettings         = useCartStore((s) => s.fetchSettings)

  useEffect(() => {
    // Fetch live shipping settings so this bar always shows the real
    // threshold, not a hardcoded fallback.
    fetchSettings()
  }, [])

  const TRUST = [
    TRUST_STATIC[0],
    TRUST_STATIC[1],
    {
      Icon: IconTruck,
      title: 'Free Shipping',
      sub: `On orders above ₹${freeShippingThreshold}`,
      stat: `${freeShippingThreshold}+`,
    },
    TRUST_STATIC[2],
  ]

  useGSAP(() => {
    gsap.fromTo(
      ref.current?.querySelectorAll('.trust-bar-item'),
      { y: 22, opacity: 0 },
      {
        y: 0, opacity: 1, stagger: 0.1, duration: 0.55, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 93%' },
      }
    )
  }, { scope: ref })

  return (
    <div ref={ref} className="trust-bar-section">
      <div className="container-main">
        <div className="trust-bar-strip">
          {TRUST.map(({ Icon, title, sub, stat }, i) => (
            <div key={i} className="trust-bar-item">
              <div className="trust-bar-badge">
                <Icon />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <p className="trust-bar-title">{title}</p>
                <span className="trust-bar-stat">{stat}</span>
              </div>
              <p className="trust-bar-sub">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   SECTION HEADER
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function SectionHeader({ eyebrow, title, sub, to, toLabel = 'View all' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
      <div>
        {eyebrow && (
          <p style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)', fontSize: 11, color: '#C8893A', letterSpacing: '0.22em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            <span style={{ width: 14, height: 1, background: '#C8893A', display: 'block', flexShrink: 0 }} />
            {eyebrow}
          </p>
        )}
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.4rem,3vw,2rem)', color: '#26221C', lineHeight: 1.2, margin: 0 }}>
          {title}
        </h2>
        {sub && <p style={{ fontFamily: 'var(--font-body)', color: '#A89F8C', fontSize: 13, margin: '4px 0 0' }}>{sub}</p>}
      </div>
      {to && (
        <Link to={to} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: '#2D6A4F', textDecoration: 'none', whiteSpace: 'nowrap', marginTop: 4 }}>
          {toLabel} <ChevronRight size={13} />
        </Link>
      )}
    </div>
  )
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   PRODUCT SLIDER
   FIX: wrapper uses overflow:hidden to
   prevent arrows from causing x-scroll
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ProductSlider({ products = [], loading, skeletonCount = 5 }) {
  const trackRef = useRef(null)
  const wrapRef  = useRef(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const isDragging  = useRef(false)
  const startX      = useRef(0)
  const scrollStart = useRef(0)

  const syncArrows = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', syncArrows, { passive: true })
    const ro = new ResizeObserver(syncArrows)
    ro.observe(el)
    syncArrows()
    return () => { el.removeEventListener('scroll', syncArrows); ro.disconnect() }
  }, [loading, products.length, syncArrows])

  const scrollBy = (dir) => {
    const el = trackRef.current
    if (!el) return
    const card = el.querySelector('.slider-card')
    const step = card ? (card.offsetWidth + 16) * 2 : el.clientWidth * 0.8
    gsap.to(el, {
      scrollLeft: el.scrollLeft + (dir === 'next' ? step : -step),
      duration: 0.5, ease: 'power3.inOut',
    })
  }

  const onMouseDown = (e) => {
    isDragging.current  = true
    startX.current      = e.pageX - trackRef.current.offsetLeft
    scrollStart.current = trackRef.current.scrollLeft
    trackRef.current.style.cursor = 'grabbing'
  }
  const onMouseMove = (e) => {
    if (!isDragging.current) return
    e.preventDefault()
    trackRef.current.scrollLeft =
      scrollStart.current - (e.pageX - trackRef.current.offsetLeft - startX.current) * 1.5
  }
  const endDrag = () => {
    isDragging.current = false
    if (trackRef.current) trackRef.current.style.cursor = 'grab'
  }

  if (loading) return (
    <div style={{ display: 'flex', gap: 12, overflow: 'hidden' }}>
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <div key={i} className="slider-card"
          style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #F5F0E8', flexShrink: 0 }}>
          <div className="skeleton" style={{ aspectRatio: '1/1' }} />
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="skeleton" style={{ height: 12, borderRadius: 8, width: '80%' }} />
            <div className="skeleton" style={{ height: 12, borderRadius: 8, width: '55%' }} />
            <div className="skeleton" style={{ height: 32, borderRadius: 10, marginTop: 4 }} />
          </div>
        </div>
      ))}
    </div>
  )

  if (!products.length) return null

  return (
    /* No extra padding on this wrapper â€” cards use full container width.
       overflow:hidden still clips GSAP scroll animation cleanly. */
    <div ref={wrapRef} style={{ position: 'relative' }}>

      {/* Prev arrow â€” shown only on wider screens where it fits */}
      {canPrev && (
        <button
          onClick={() => scrollBy('prev')}
          aria-label="Previous products"
          style={{
            position: 'absolute', top: '38%', transform: 'translateY(-50%)',
            left: -18, zIndex: 10,
            width: 36, height: 36, borderRadius: '50%',
            background: '#fff', border: '1px solid #E8E0D0',
            boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#5C5548',
          }}
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {/* Next arrow */}
      {canNext && (
        <button
          onClick={() => scrollBy('next')}
          aria-label="Next products"
          style={{
            position: 'absolute', top: '38%', transform: 'translateY(-50%)',
            right: -18, zIndex: 10,
            width: 36, height: 36, borderRadius: '50%',
            background: '#fff', border: '1px solid #E8E0D0',
            boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#5C5548',
          }}
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Track â€” full width, arrows don't steal space */}
      <div
        ref={trackRef}
        className="slider-track"
        style={{ display: 'flex', gap: 16, padding: '4px 0 16px', cursor: 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
      >
        {products.map(p => (
          <div key={p._id} className="slider-card">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  )
}
/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   3. FEATURED PRODUCTS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function FeaturedProducts({ products, loading }) {
  const ref = useRef(null)
  useGSAP(() => {
    gsap.fromTo(ref.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 88%' } })
  }, { scope: ref })

  const list = Array.isArray(products) ? products : []
  if (!loading && !list.length) return null

  return (
    <section ref={ref} className="home-section" style={{ background: '#FAFAF7' }}>
      <div className="container-main">
        <SectionHeader eyebrow="Handpicked for you" title="Featured Products" sub="Our finest selection â€” curated for quality and purity" to="/shop" toLabel="All products" />
        <ProductSlider products={list} loading={loading} />
      </div>
    </section>
  )
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   4. CATEGORY GRID
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function CategoryCard({ cat, tall = false }) {
  const imgRef     = useRef(null)
  const overlayRef = useRef(null)
  const hintRef    = useRef(null)

  return (
    <Link to={`/shop?page=1&category=${cat.slug}`}
      onMouseEnter={() => {
        gsap.to(imgRef.current,     { scale: 1.07, duration: 0.5, ease: 'power2.out' })
        gsap.to(overlayRef.current, { opacity: 0.72, duration: 0.3 })
        gsap.to(hintRef.current,    { y: 0, opacity: 1, duration: 0.25 })
      }}
      onMouseLeave={() => {
        gsap.to(imgRef.current,     { scale: 1, duration: 0.45, ease: 'power2.out' })
        gsap.to(overlayRef.current, { opacity: 0.42, duration: 0.3 })
        gsap.to(hintRef.current,    { y: 8, opacity: 0, duration: 0.2 })
      }}
      className={tall ? 'cat-card-tall' : 'cat-card-normal'}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, display: 'block', textDecoration: 'none' }}>
      <img ref={imgRef} src={cat.image || '/placeholder-category.jpg'} alt={cat.name} loading="lazy"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', willChange: 'transform' }} />
      <div ref={overlayRef}
        style={{ position: 'absolute', inset: 0, opacity: 0.42, background: 'linear-gradient(to top,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.18) 65%,transparent 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '18px 20px' }}>
        <p style={{ fontFamily: 'var(--font-heading)', color: '#fff', fontSize: tall ? 19 : 15, lineHeight: 1.3, margin: 0 }}>{cat.name}</p>
        <p ref={hintRef}
          style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.65)', fontSize: 12, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 3, transform: 'translateY(8px)', opacity: 0 }}>
          Shop now <ChevronRight size={11} />
        </p>
      </div>
    </Link>
  )
}

function CategoryGrid({ categories, loading }) {
  const cats = Array.isArray(categories) ? categories : []
  const ref  = useRef(null)

  useGSAP(() => {
    if (!cats.length) return
    gsap.fromTo(ref.current?.querySelectorAll('.cg-item'),
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.07, duration: 0.5, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 88%' } })
  }, { dependencies: [loading], scope: ref })

  if (!loading && !cats.length) return null

  return (
    <section className="home-section" style={{ background: '#fff' }} ref={ref}>
      <div className="container-main">
        <SectionHeader eyebrow="Browse by type" title="Shop by Category" sub="Everything pure, everything organic" to="/shop" toLabel="All products" />
        {loading ? (
          <div className="cat-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ borderRadius: 18, height: 220 }} />
            ))}
          </div>
        ) : (
          <div className="cat-grid">
            <div className="cg-item cat-tall">
              <CategoryCard cat={cats[0]} tall />
            </div>
            {cats.slice(1).map(cat => (
              <div key={cat._id} className="cg-item">
                <CategoryCard cat={cat} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   5. BEST SELLERS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function BestSellers({ products, loading }) {
  const ref = useRef(null)
  useGSAP(() => {
    gsap.fromTo(ref.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 88%' } })
  }, { scope: ref })

  const list = Array.isArray(products) ? products : []
  if (!loading && !list.length) return null

  return (
    <section ref={ref} className="home-section" style={{ background: 'rgba(200,137,58,0.04)' }}>
      <div className="container-main">
        <SectionHeader eyebrow="Customer favourites" title="Best Sellers" sub="Tried, trusted and loved by thousands" to="/shop?sort=best-seller" toLabel="See all" />
        <ProductSlider products={list} loading={loading} />
      </div>
    </section>
  )
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   6. WHY VARNAM â€” SVG icons, no emojis
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const WHY = [
  {
    Icon: IconSprout,
    title: 'Farm Direct',
    body: 'We work directly with certified organic farmers across Tamil Nadu. No middlemen â€” fresh from field to your door.',
    stat: '12+ farms',
  },
  {
    Icon: IconFlask,
    title: 'Zero Chemicals',
    body: 'Every product is tested. No parabens, no sulphates, no artificial fragrances â€” ever.',
    stat: '0 additives',
  },
  {
    Icon: IconSnowflake,
    title: 'Cold Pressed',
    body: 'Our oils are cold-pressed within hours of harvest to lock in every nutrient and natural aroma.',
    stat: '<4 hrs',
  },
  {
    Icon: IconPackage,
    title: 'Eco Packaging',
    body: 'Recyclable bottles, minimal plastic, FSC-certified labels. Good for you and the planet.',
    stat: '100% recyclable',
  },
  {
    Icon: IconWheel,
    title: 'Traditional Cold-Press',
    body: 'Pressed the age-old way on wood & stone chekku mills â€” slow, chemical-free, true to heritage.',
    stat: 'Heritage made',
  },
  {
    Icon: IconMicroscope,
    title: 'Lab Tested Purity',
    body: 'Every batch is lab-verified for purity and quality before it reaches your kitchen shelf.',
    stat: 'Every batch',
  },
]

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   ANIMATED PARTICLE CANVAS
   Pure canvas, no extra packages.
   Particles are tiny leaf/dot shapes that
   drift upward with gentle horizontal sway.
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function WhyParticles() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    // Particle pool â€” mix of dots and tiny leaf shapes
    const COUNT = 55
    const particles = Array.from({ length: COUNT }, () => ({
      x:       Math.random() * canvas.width,
      y:       Math.random() * canvas.height,         // start anywhere
      r:       Math.random() * 2.2 + 0.6,             // radius
      speed:   Math.random() * 0.38 + 0.10,
      drift:   Math.random() * 0.6 - 0.3,             // horizontal drift
      phase:   Math.random() * Math.PI * 2,           // wobble phase offset
      wobble:  Math.random() * 0.018 + 0.006,
      alpha:   Math.random() * 0.18 + 0.04,
      isLeaf:  Math.random() > 0.62,                  // ~38% are leaf shapes
      rotation:Math.random() * Math.PI * 2,
      rotSpeed:Math.random() * 0.008 - 0.004,
    }))

    const drawLeaf = (p) => {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.beginPath()
      // simple oval-leaf path
      ctx.ellipse(0, 0, p.r * 2.2, p.r * 1.0, 0, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(82,183,136,${p.alpha})`
      ctx.fill()
      ctx.restore()
    }

    const drawDot = (p) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(253,246,236,${p.alpha})`
      ctx.fill()
    }

    let t = 0
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t += 0.016

      for (const p of particles) {
        p.y        -= p.speed
        p.x        += Math.sin(t * p.wobble * 60 + p.phase) * 0.35 + p.drift * 0.04
        p.rotation += p.rotSpeed

        if (p.y + p.r * 3 < 0) {
          p.y = canvas.height + p.r * 3
          p.x = Math.random() * canvas.width
        }

        p.isLeaf ? drawLeaf(p) : drawDot(p)
      }

      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 1,
      }}
    />
  )
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   6. WHY VARNAM
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function WhyVarnam() {
  const sectionRef = useRef(null)
  const headRef    = useRef(null)
  const hexRef     = useRef(null)
  const imgRef     = useRef(null)

  useGSAP(() => {
    // left column copy
    gsap.fromTo(headRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out',
        scrollTrigger: { trigger: headRef.current, start: 'top 88%' } })

    // image
    gsap.fromTo(imgRef.current,
      { y: 36, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: imgRef.current, start: 'top 90%' } })

    // hexagons stagger in
    gsap.fromTo(hexRef.current?.querySelectorAll('.hex'),
      { y: 30, opacity: 0, scale: 0.85 },
      { y: 0, opacity: 1, scale: 1, stagger: 0.1, duration: 0.55, ease: 'back.out(1.5)',
        scrollTrigger: { trigger: hexRef.current, start: 'top 85%' } })
  }, { scope: sectionRef })

  return (
    <section
      ref={sectionRef}
      className="why-section"
      style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(160deg, #FDF6EC 0%, #F8EEDB 55%, #F3E7CE 100%)' }}
    >
      {/* ── Soft light-theme background accents ── */}
      <div style={{
        position: 'absolute', zIndex: 0,
        top: '-15%', right: '-8%',
        width: '50%', height: '90%',
        background: 'radial-gradient(ellipse at center, rgba(200,137,58,0.08) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', zIndex: 0,
        bottom: '-20%', left: '-10%',
        width: '55%', height: '95%',
        background: 'radial-gradient(ellipse at center, rgba(82,183,136,0.08) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, opacity: 0.04, pointerEvents: 'none' }}
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 800 600"
        xmlns="http://www.w3.org/2000/svg"
      >
        {[
          [60,  80],  [200, 30],  [380, 110], [560, 50],  [720, 90],
          [100, 220], [300, 180], [500, 250], [680, 210], [780, 160],
          [40,  370], [180, 330], [350, 400], [530, 360], [700, 420],
          [90,  520], [260, 490], [430, 540], [610, 510], [760, 560],
        ].map(([cx, cy], i) => (
          <g key={i} transform={`translate(${cx},${cy}) rotate(${i * 37 % 180 - 90})`}>
            <ellipse rx="18" ry="8" fill="#2D6A4F" />
            <line x1="0" y1="-8" x2="0" y2="8" stroke="#2D6A4F" strokeWidth="0.8" />
          </g>
        ))}
      </svg>

      {/* ── Content ── */}
      <div className="container-main" style={{ position: 'relative', zIndex: 10 }}>

        <div className="why-promise-grid">

          {/* ── Left: heading, sub-heading, paragraph, image ── */}
          <div ref={headRef}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ display: 'block', width: 32, height: 1, background: 'rgba(200,137,58,0.5)' }} />
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: 10, color: '#C8893A',
                letterSpacing: '0.28em', textTransform: 'uppercase',
              }}>
                Our Promise
              </span>
            </div>

            <h2 style={{
              fontFamily: 'var(--font-heading)',
              color: '#26221C',
              fontSize: 'clamp(1.8rem,4vw,2.9rem)',
              lineHeight: 1.15,
              margin: '0 0 14px',
            }}>
              Why Thousands Trust{' '}
              <span style={{ color: '#2D6A4F', position: 'relative', display: 'inline-block' }}>
                Varnam Foods
                <svg viewBox="0 0 200 8" style={{ position: 'absolute', bottom: -4, left: 0, width: '100%', height: 8 }}>
                  <path d="M0 6 Q50 0 100 5 Q150 10 200 4" stroke="#C8893A" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h2>

            <p style={{
              fontFamily: 'var(--font-heading)',
              fontStyle: 'italic',
              color: '#52B788',
              fontSize: 'clamp(1rem,1.6vw,1.2rem)',
              margin: '0 0 16px',
            }}>
              Purity you can see, trust you can taste.
            </p>

            <p style={{
              fontFamily: 'var(--font-body)',
              color: '#5C5548',
              fontSize: 15, lineHeight: 1.85,
              maxWidth: 460, margin: 0,
            }}>
              Every bottle, every bar, every supplement is made with integrity — sourced directly
              from certified organic farms, processed without shortcuts, and packaged with the
              planet in mind. It's a promise we keep from field to doorstep.
            </p>

            {/* ── Relevant quality image ── */}
            <div ref={imgRef} className="why-promise-image">
              <picture>
                <source srcSet="/WhyChooseUs/natural.webp" type="image/webp" />
                <img
                  src="/WhyChooseUs/natural.jpg"
                  alt="Varnam Foods — natural, organic ingredients"
                  loading="lazy"
                  style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
                />
              </picture>

              <div className="why-promise-badge">
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(82,183,136,0.22), rgba(45,106,79,0.28))',
                  border: '1px solid rgba(82,183,136,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
                    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: 13, color: '#26221C', margin: 0, lineHeight: 1.2 }}>100% Organic</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#A89F8C', margin: '2px 0 0', letterSpacing: '0.04em' }}>Field to bottle</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: honeycomb of reasons — hover to reveal ── */}
          <div ref={hexRef} className="hex-grid">
            <div className="hex-col">
              {[WHY[0], WHY[3]].map(({ Icon, title, body, stat }) => (
                <div key={title} className="hex" tabIndex={0}>
                  <div className="hex-face hex-front">
                    <div className="hex-icon-badge"><Icon /></div>
                    <p className="hex-title">{title}</p>
                    <span className="hex-stat">{stat}</span>
                  </div>
                  <div className="hex-face hex-back">
                    <p className="hex-back-title">{title}</p>
                    <p className="hex-back-body">{body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="hex-col hex-col-offset">
              {[WHY[1], WHY[4]].map(({ Icon, title, body, stat }) => (
                <div key={title} className="hex" tabIndex={0}>
                  <div className="hex-face hex-front">
                    <div className="hex-icon-badge"><Icon /></div>
                    <p className="hex-title">{title}</p>
                    <span className="hex-stat">{stat}</span>
                  </div>
                  <div className="hex-face hex-back">
                    <p className="hex-back-title">{title}</p>
                    <p className="hex-back-body">{body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="hex-col">
              {[WHY[2], WHY[5]].map(({ Icon, title, body, stat }) => (
                <div key={title} className="hex" tabIndex={0}>
                  <div className="hex-face hex-front">
                    <div className="hex-icon-badge"><Icon /></div>
                    <p className="hex-title">{title}</p>
                    <span className="hex-stat">{stat}</span>
                  </div>
                  <div className="hex-face hex-back">
                    <p className="hex-back-title">{title}</p>
                    <p className="hex-back-body">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* CTA row */}
        <div style={{ marginTop: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 14 }}>

          <Link to="/shop" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #C8893A, #E9B87A)',
            color: '#1B2F24',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14,
            padding: '14px 32px', borderRadius: 14, textDecoration: 'none',
            boxShadow: '0 8px 28px rgba(200,137,58,0.35)',
            letterSpacing: '0.02em',
          }}>
            Shop All Products <ChevronRight size={14} />
          </Link>
          <Link to="/track-order" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#FFFFFF',
            color: '#26221C',
            fontFamily: 'var(--font-body)', fontSize: 14,
            padding: '14px 28px', borderRadius: 14, textDecoration: 'none',
            border: '1px solid rgba(45,106,79,0.18)',
          }}>
            Track My Order
          </Link>
        </div>
      </div>
    </section>
  )
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   6b. TRUST & CERTIFICATIONS
   Standalone light section, badge/timeline style
   (no boxed cards) â€” FSSAI, MSME, Pan-India, Export
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function TrustCertifications() {
  const ref = useRef(null)

  useGSAP(() => {
    gsap.fromTo(ref.current?.querySelectorAll('.trust-item'),
      { y: 26, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.12, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 88%' } })
  }, { scope: ref })

  const TRUST_ITEMS = [
    {
      badge: <img src={fssaiLogo} alt="FSSAI Certified" />,
      title: 'FSSAI Certified',
      body: 'Licensed and regularly audited, meeting every safety and hygiene standard set by the Food Safety and Standards Authority of India.',
    },
    {
      badge: <img src={msmeLogo} alt="MSME Registered" />,
      title: 'MSME Registered',
      body: 'Proudly registered under the Ministry of MSME (Udyam), supporting local farmers and Indian manufacturing at every step.',
    },
    {
      badge: <IconTruckFast />,
      title: 'Pan-India Coverage',
      body: 'Prompt and secure delivery to every corner of India, from metro cities to the smallest towns.',
    },
    {
      badge: <IconPlane />,
      title: 'Global Export',
      body: 'Certified and seamless international shipping, carrying Varnam Foods across the globe.',
    },
  ]

  return (
    <section ref={ref} className="trust-section">
      <div className="container-main">

        <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ display: 'block', width: 32, height: 1, background: 'rgba(200,137,58,0.5)' }} />
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: 10, color: '#C8893A',
              letterSpacing: '0.28em', textTransform: 'uppercase',
            }}>
              Certified &amp; Trusted
            </span>
            <span style={{ display: 'block', width: 32, height: 1, background: 'rgba(200,137,58,0.5)' }} />
          </div>
          <h2 style={{
            fontFamily: 'var(--font-heading)', color: '#26221C',
            fontSize: 'clamp(1.6rem,3.4vw,2.3rem)', lineHeight: 1.2, margin: 0,
          }}>
            Verified Quality, Delivered Everywhere
          </h2>
        </div>

        <div className="trust-strip">
          {TRUST_ITEMS.map(({ badge, title, body }) => (
            <div key={title} className="trust-item">
              <div className="trust-badge">{badge}</div>
              <p className="trust-title">{title}</p>
              <p className="trust-body">{body}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   7. STATS STRIP
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function StatsStrip() {
  const ref = useRef(null)
  useGSAP(() => {
    gsap.fromTo(ref.current?.querySelectorAll('.stat-item'),
      { scale: 0.9, opacity: 0 },
      { scale: 1, opacity: 1, stagger: 0.09, duration: 0.5, ease: 'back.out(1.4)',
        scrollTrigger: { trigger: ref.current, start: 'top 90%' } })
  }, { scope: ref })

  return (
    <div ref={ref} style={{ background: '#FDF6EC', borderTop: '1px solid rgba(45,106,79,0.08)' }}>
      <div className="container-main">
        <div className="stats-grid">
          {[
            { n: '500+', l: 'Happy Customers' },
            { n: '100%', l: 'Organic Certified' },
            { n: '0',    l: 'Harmful Chemicals' },
            { n: '2',  l: 'Days Delivery' },
          ].map(({ n, l }, i) => (
            <div key={i} className="stat-item"
              style={{ padding: '30px 16px', borderRight: i < 3 ? '1px solid rgba(45,106,79,0.08)' : 'none' }}>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.6rem,4vw,2.6rem)', color: '#2D6A4F', lineHeight: 1, margin: 0 }}>{n}</p>
              <p style={{ fontFamily: 'var(--font-body)', color: '#A89F8C', fontSize: 12, margin: '6px 0 0', letterSpacing: '0.04em' }}>{l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   PAGE â€” reads from homeStore, fetches once
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const WEBSITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Varnam Foods',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/search?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
}

// Builds the Organization schema from live /settings data so business name,
// address, phone, logo and social links always match what's actually
// configured in the admin panel — never hardcoded/fabricated here.
function buildOrganizationJsonLd(settings) {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Varnam Foods',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: 'Varnam Foods makes pure, organic, chemical-free cold-pressed oils, handmade soaps and natural supplements.',
  }
  if (!settings) return org

  if (settings.storeEmail) org.email = settings.storeEmail
  if (settings.storePhone) {
    const digits = String(settings.storePhone).replace(/\D/g, '')
    if (digits) org.telephone = `+${digits.length === 10 ? `91${digits}` : digits}`
  }
  if (settings.address) {
    const a = settings.address
    org.address = {
      '@type': 'PostalAddress',
      streetAddress: [a.line1, a.line2].filter(Boolean).join(', ') || undefined,
      addressLocality: a.city || undefined,
      addressRegion: a.state || undefined,
      postalCode: a.postalCode || undefined,
      addressCountry: a.country || undefined,
    }
  }
  const sameAs = Object.values(settings.socialLinks || {}).filter(
    (v) => typeof v === 'string' && /^https?:\/\//i.test(v)
  )
  if (sameAs.length) org.sameAs = sameAs

  return org
}

export default function Home() {
  const { banners, featured, bestSellers, categories, fetched, loading, fetch } = useHomeStore()
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    // fetch() is a no-op if already fetched — safe to call on every mount
    fetch()
  }, [fetch])

  useEffect(() => {
    settingsAPI.getPublic()
      .then(({ data }) => setSettings(data?.data || null))
      .catch(() => {})
  }, [])

  // Welcome toast now lives in App.jsx (fires once per session, only on
  // actual site entry — see <WelcomeGreeting /> there).

  return (
    <>
      <Seo
        title="Pure. Organic. Natural."
        description="Shop pure organic cold-pressed oils, handmade soaps and natural supplements from Varnam Foods. FSSAI certified, chemical-free, made in India."
        path="/"
        jsonLd={[buildOrganizationJsonLd(settings), WEBSITE_JSON_LD]}
      />
      <HeroBanner    banners={banners}         loading={loading && !fetched} />
      <TrustBar />
      <FeaturedProducts products={featured}    loading={loading && !fetched} />
      <CategoryGrid     categories={categories} loading={loading && !fetched} />
      <BestSellers      products={bestSellers}  loading={loading && !fetched} />
      <WhyVarnam />
      <TrustCertifications />
      <StatsStrip />
    </>
  )
}
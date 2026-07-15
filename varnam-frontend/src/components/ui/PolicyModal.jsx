import { useEffect, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import PolicyContent from './PolicyContent'

export default function PolicyModal({ open, onClose, title = 'Store Policies', file = '/policies/varnam-store-policies.pdf' }) {
  const overlayRef = useRef(null)
  const panelRef = useRef(null)

  useGSAP(() => {
    if (!overlayRef.current || !panelRef.current) return
    if (open) {
      gsap.set(overlayRef.current, { display: 'flex' })
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: 'power2.out' })
      gsap.fromTo(panelRef.current,
        { opacity: 0, y: 18, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'power3.out' }
      )
    } else {
      gsap.to(overlayRef.current, {
        opacity: 0, duration: 0.18, ease: 'power2.in',
        onComplete: () => { if (overlayRef.current) gsap.set(overlayRef.current, { display: 'none' }) },
      })
    }
  }, { dependencies: [open] })

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <div
      ref={overlayRef}
      onClick={onClose}
      style={{ display: 'none' }}
      className="fixed inset-0 z-[100] items-center justify-center bg-black/55 backdrop-blur-sm px-0 sm:px-6 py-0 sm:py-8 overflow-x-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full sm:h-[94vh] sm:max-h-[880px] sm:max-w-4xl sm:rounded-2xl bg-white shadow-[0_20px_80px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden min-w-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-stone-100 flex-shrink-0 min-w-0">
          <div className="flex flex-col leading-tight min-w-0">
            <h2 className="font-heading text-lg sm:text-xl text-[#26221C] truncate">{title}</h2>
            <span className="text-[11px] font-body text-stone-400 mt-0.5 truncate">Varnam Foods · Effective July 2026</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={file}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-body text-brand-green hover:text-brand-green-dark px-2.5 py-1.5 rounded-full hover:bg-brand-green/8 transition-colors"
            >
              View original PDF
            </a>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 flex items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 transition-colors flex-shrink-0"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body — beautiful, tabbed React content instead of a raw PDF */}
        <div className="flex-1 min-h-0">
          <PolicyContent />
        </div>
      </div>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { settingsAPI } from '../../services/api'

/**
 * Floating WhatsApp button — fixed bottom-right, responsive, on-brand.
 * Phone number is pulled live from GET /api/settings (storePhone field,
 * set by the admin under Settings). Falls back to `fallbackPhone` if the
 * settings call fails or storePhone isn't configured yet.
 */
export default function WhatsAppButton({
  fallbackPhone = '919999999999',
  message = "Hi Varnam! I'd like to know more about your products.",
}) {
  const [phone, setPhone] = useState(fallbackPhone)
  const [visible, setVisible] = useState(false)
  const [showTip, setShowTip] = useState(false)

  console.log(phone);
  

  // Pull store phone number from settings
  useEffect(() => {
    let cancelled = false
    settingsAPI.getPublic()
      .then(({ data }) => {        
        const raw = data?.data?.storePhone
        
        if (!raw) return
        const digits = String(raw).replace(/\D/g, '')
        // Ensure it includes country code (assume India if a 10-digit
        // number was stored without one)
        const withCountryCode = digits.length === 10 ? `91${digits}` : digits
        if (!cancelled && withCountryCode) setPhone(withCountryCode)
      })
      .catch(() => {
        // silently keep fallbackPhone
      })
    return () => { cancelled = true }
  }, [])

  // Entrance animation after mount so it feels intentional, not jarring
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 600)
    return () => clearTimeout(t)
  }, [])

  // Auto-peek the tooltip once, a couple seconds after appearing
  useEffect(() => {
    if (!visible) return
    const showT = setTimeout(() => setShowTip(true), 1400)
    const hideT = setTimeout(() => setShowTip(false), 4600)
    return () => { clearTimeout(showT); clearTimeout(hideT) }
  }, [visible])

  const href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`

  return (
    <div
      className={[
        'fixed z-50',
        'bottom-4 right-4 sm:bottom-6 sm:right-6',
        'transition-all duration-500 ease-out',
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-75 pointer-events-none',
      ].join(' ')}
    >
      <div
        className="relative flex items-center"
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
      >
        {/* Tooltip */}
        <div
          className={[
            'absolute right-full mr-3 top-1/2 -translate-y-1/2',
            'whitespace-nowrap rounded-xl bg-brand-green-dark text-brand-cream',
            'font-body text-sm px-3.5 py-2 shadow-card',
            'transition-all duration-300 ease-out origin-right',
            'hidden sm:block',
            showTip ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-90 translate-x-1 pointer-events-none',
          ].join(' ')}
        >
          Chat with us on WhatsApp
          <span className="absolute left-full top-1/2 -translate-y-1/2 -ml-px border-8 border-transparent border-l-brand-green-dark" />
        </div>

        {/* Outer pulsing rings */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-40 animate-wa-ping" />
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 animate-wa-ping [animation-delay:0.9s]" />

        {/* Main button */}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className={[
            'relative flex items-center justify-center',
            'w-14 h-14 sm:w-16 sm:h-16 rounded-full',
            'bg-[#25D366] text-white shadow-hover',
            'transition-transform duration-300 ease-out',
            'hover:scale-110 hover:-translate-y-0.5 active:scale-95',
            'animate-wa-float',
          ].join(' ')}
          onClick={() => setShowTip(false)}
        >
          <svg
            viewBox="0 0 32 32"
            className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-sm"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.386.708 4.605 1.928 6.464L4.5 29l7.72-2.02A11.94 11.94 0 0 0 16.001 27C22.63 27 28 21.627 28 15S22.63 3 16.001 3zm0 21.818a9.78 9.78 0 0 1-4.99-1.367l-.358-.213-4.58 1.199 1.222-4.463-.233-.366A9.76 9.76 0 0 1 5.818 15c0-5.618 4.566-10.182 10.183-10.182 5.616 0 10.181 4.564 10.181 10.182 0 5.617-4.565 10.181-10.181 10.181h.001zm5.593-7.632c-.307-.153-1.812-.895-2.093-.997-.281-.102-.486-.153-.69.154-.204.306-.792.996-.972 1.2-.179.205-.358.23-.665.077-.307-.154-1.294-.477-2.464-1.52-.911-.812-1.526-1.815-1.705-2.122-.179-.307-.02-.473.134-.626.137-.137.306-.358.46-.537.153-.18.204-.307.306-.512.102-.204.05-.384-.026-.537-.076-.154-.69-1.662-.946-2.276-.249-.598-.502-.517-.69-.526a13.3 13.3 0 0 0-.588-.011c-.204 0-.537.077-.818.384-.281.306-1.073 1.048-1.073 2.557 0 1.508 1.098 2.966 1.251 3.17.153.205 2.16 3.297 5.234 4.624.731.316 1.301.505 1.745.646.733.233 1.4.2 1.927.121.588-.088 1.812-.74 2.068-1.456.256-.716.256-1.329.179-1.456-.076-.128-.281-.205-.588-.358z" />
          </svg>

          {/* Online indicator dot */}
          <span className="absolute top-0.5 right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-brand-amber-light border-2 border-white" />
        </a>
      </div>
    </div>
  )
}
import { useState } from 'react'

/* ── Small inline icons, matching the rest of the site's icon style ───────── */
const IconTruck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 3v5h-7V8z" />
    <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
)
const IconShield = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" />
  </svg>
)
const IconScale = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="3" x2="12" y2="21" /><path d="M5 7l-3 7a3.5 3.5 0 0 0 7 0l-3-7z" />
    <path d="M19 7l-3 7a3.5 3.5 0 0 0 7 0l-3-7z" /><path d="M5 7h14" /><path d="M9 21h6" />
  </svg>
)
const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" />
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
  </svg>
)
const IconLeaf = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

/* ── Highlight box for statutory / important notices ───────────────────────  */
function Notice({ children }) {
  return (
    <div className="flex gap-2.5 bg-brand-green/6 border border-brand-green/15 rounded-xl px-4 py-3 my-3">
      <span className="text-brand-green mt-0.5 flex-shrink-0"><IconLeaf /></span>
      <p className="text-[12.5px] font-body leading-relaxed text-[#2D6A4F]">{children}</p>
    </div>
  )
}

function Bullet({ children }) {
  return (
    <li className="flex gap-2.5 text-[13.5px] font-body leading-relaxed text-stone-600">
      <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-brand-amber/70 flex-shrink-0" />
      <span>{children}</span>
    </li>
  )
}

function H4({ children }) {
  return <h4 className="font-body font-semibold text-[13.5px] text-[#26221C] mt-5 mb-2 first:mt-0">{children}</h4>
}

/* ── Section content ────────────────────────────────────────────────────── */
const SECTIONS = [
  {
    id: 'shipping',
    label: 'Shipping & Delivery',
    icon: IconTruck,
    body: (
      <>
        <p className="text-[13.5px] font-body leading-relaxed text-stone-600 mb-3">
          Every order is quality-checked and packed with the same care whether it's cold-pressed oil, ghee, or a fruit powder — with handling tailored to keep each product stable on its journey to you.
        </p>

        <H4>Order processing</H4>
        <ul className="space-y-2 mb-1">
          <Bullet>Orders are processed and dispatched within <strong>1–3 business days</strong> of payment confirmation.</Bullet>
          <Bullet>Dispatch pauses on Sundays and national public holidays.</Bullet>
        </ul>

        <H4>Transit time</H4>
        <ul className="space-y-2 mb-1">
          <Bullet>Domestic deliveries typically arrive in <strong>3–7 business days</strong> via our courier partners.</Bullet>
          <Bullet>Delays from weather, regional disruptions, or remote pincodes are outside our control and not covered by delivery-time guarantees.</Bullet>
          <Bullet>Shipping cost is calculated at checkout based on weight and destination pincode.</Bullet>
        </ul>

        <H4>Why your product may look a little different on arrival</H4>
        <p className="text-[13px] font-body leading-relaxed text-stone-600 mb-2">
          Our products are 100% natural, with no artificial stabilizers — so they respond to temperature exactly as nature intended:
        </p>
        <ul className="space-y-2">
          <Bullet><strong>Cold-pressed coconut oil</strong> clouds, crystallizes, or solidifies below ~24°C. This is a sign of purity, not a defect.</Bullet>
          <Bullet><strong>Traditional ghee</strong> may liquefy or turn grainy depending on the weather during transit — its shelf life is unaffected.</Bullet>
        </ul>
      </>
    ),
  },
  {
    id: 'privacy',
    label: 'Privacy & Data',
    icon: IconShield,
    body: (
      <>
        <p className="text-[13.5px] font-body leading-relaxed text-stone-600 mb-3">
          We follow the Digital Personal Data Protection (DPDP) Act, 2023, and collect only what's needed to get your order to you.
        </p>

        <H4>What we collect</H4>
        <ul className="space-y-2 mb-1">
          <Bullet>Your name, shipping and billing address, mobile number, and email — used solely to process and deliver your order.</Bullet>
        </ul>

        <H4>How it's protected</H4>
        <ul className="space-y-2">
          <Bullet>All payments run through encrypted, PCI-DSS-compliant gateways.</Bullet>
          <Bullet>We never sell, rent, or share your data with third-party advertisers.</Bullet>
        </ul>

        <Notice>Questions about your data? Reach us anytime at <strong>varnam.mda@gmail.com</strong>.</Notice>
      </>
    ),
  },
  {
    id: 'terms',
    label: 'Terms & Product Info',
    icon: IconScale,
    body: (
      <>
        <H4>Natural product notes</H4>
        <ul className="space-y-2 mb-1">
          <Bullet>Cold-pressed groundnut, sesame, and coconut oils contain no anti-foaming additives, so mild foaming when heated is normal and expected.</Bullet>
          <Bullet>Our edible oils carry the statutory labels <strong>"Not to be sold loose"</strong> and <strong>"Free from Argemone oil"</strong>, per FSSAI regulations.</Bullet>
          <Bullet>Dates powder has no anti-caking agents — natural clumping from humidity is normal and resolves with gentle mixing.</Bullet>
        </ul>

        <H4>Allergies & sensitivities</H4>
        <p className="text-[13.5px] font-body leading-relaxed text-stone-600 mb-3">
          Please check ingredient labels before consuming. We're not able to take responsibility for individual allergies or sensitivities.
        </p>

        <H4>Intellectual property</H4>
        <p className="text-[13.5px] font-body leading-relaxed text-stone-600">
          The Varnam Foods name, logo, packaging design, and site content belong to us and are protected under Indian copyright and trademark law.
        </p>
      </>
    ),
  },
  {
    id: 'returns',
    label: 'Returns & Refunds',
    icon: IconRefresh,
    body: (
      <>
        <Notice>
          As perishable, ingestible food items regulated under FSSAI, opened or delivered products can't be returned or exchanged — for everyone's safety and hygiene.
        </Notice>

        <H4>When we'll step in</H4>
        <p className="text-[13px] font-body leading-relaxed text-stone-600 mb-2">We're happy to replace or refund your order if:</p>
        <ul className="space-y-2 mb-1">
          <Bullet>The package arrived damaged, leaking, or with a broken seal.</Bullet>
          <Bullet>You received the wrong item or variant.</Bullet>
        </ul>

        <H4>How to raise a claim</H4>
        <ul className="space-y-2 mb-1">
          <Bullet>Record a single, continuous, unedited unboxing video — starting from the sealed package (courier label visible) through to discovering the issue.</Bullet>
          <Bullet>Email the video to <strong>varnam.mda@gmail.com</strong> within <strong>48 hours</strong> of delivery.</Bullet>
          <Bullet>Claims without video evidence unfortunately can't be processed.</Bullet>
        </ul>

        <H4>Refund timeline</H4>
        <p className="text-[13.5px] font-body leading-relaxed text-stone-600">
          Once verified, refunds are credited to your original payment method within <strong>5–7 business days</strong>.
        </p>
      </>
    ),
  },
]

export default function PolicyContent() {
  const [active, setActive] = useState(SECTIONS[0].id)
  const activeSection = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0]

  return (
    <div className="flex flex-col sm:flex-row h-full min-h-0 w-full min-w-0">
      {/* Tabs — wrap into a grid on mobile (no horizontal scroll), vertical sidebar on desktop */}
      <nav className="flex-shrink-0 sm:w-52 border-b sm:border-b-0 sm:border-r border-stone-100 bg-stone-50/60">
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-1.5 sm:gap-1 px-3 sm:px-2.5 py-3 sm:py-4">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] sm:text-[12.5px] font-body font-medium transition-colors duration-150 text-left min-w-0
                ${active === id
                  ? 'bg-brand-green text-white shadow-[0_2px_10px_rgba(45,106,79,0.25)]'
                  : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <span className="flex-shrink-0"><Icon /></span>
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Active section content */}
      <div className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden px-5 sm:px-7 py-5 sm:py-6">
        <h3 className="font-heading text-lg text-[#26221C] mb-3 break-words">{activeSection.label}</h3>
        <div className="break-words">{activeSection.body}</div>
      </div>
    </div>
  )
}
// src/components/common/LangToggle.jsx
//
// Small pill toggle used on ProductDetail and BlogDetail to switch the
// on-page description/content between English and a hand-written Tamil
// translation. Purely a client-side display toggle — it never changes what
// Seo.jsx renders or what the build-time prerender script bakes into the
// page's HTML/JSON-LD, so it has no effect on what Google indexes. English
// stays the only crawlable version; this only helps a human reader who's
// already on the page.

export default function LangToggle({ lang, onChange, available }) {
  return (
    <div
      role="group"
      aria-label="Choose language"
      className="inline-flex items-center rounded-full border border-neutral-200 p-0.5 select-none"
    >
      <button
        type="button"
        onClick={() => onChange('en')}
        className={`px-3 py-1 rounded-full font-body text-xs font-semibold transition-colors ${
          lang === 'en' ? 'bg-brand-green text-white' : 'text-neutral-500 hover:text-neutral-700'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => available && onChange('ta')}
        disabled={!available}
        title={available ? 'தமிழில் படிக்க' : 'Tamil translation not available yet'}
        aria-disabled={!available}
        className={`px-3 py-1 rounded-full font-body text-xs font-semibold transition-colors ${
          !available
            ? 'text-neutral-300 cursor-not-allowed'
            : lang === 'ta'
              ? 'bg-brand-green text-white'
              : 'text-neutral-500 hover:text-neutral-700'
        }`}
      >
        தமிழ்
      </button>
    </div>
  )
}

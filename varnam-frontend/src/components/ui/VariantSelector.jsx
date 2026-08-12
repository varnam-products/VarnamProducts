// src/components/ui/VariantSelector.jsx
//
// Pill-style selector for a product's variants (e.g. "500ml" / "1L" / "2L").
// Purely presentational — the parent (ProductDetail) owns the selected
// variant state and passes it down, since price/discount/add-to-cart/SEO
// all need to react to the current selection too.

export default function VariantSelector({ variants = [], selectedId, onSelect }) {
  if (!variants.length || variants.length === 1) return null

  return (
    <div className="info-row mb-5" style={{ opacity: 0 }}>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
        color: '#5C5548', letterSpacing: '0.03em', margin: '0 0 10px',
      }}>
        Select Size / Pack
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {variants.map((v) => {
          const active = String(v._id) === String(selectedId)
          return (
            <button
              key={v._id}
              type="button"
              onClick={() => onSelect(v._id)}
              aria-pressed={active}
              style={{
                padding: '9px 16px',
                borderRadius: 12,
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.18s',
                border: active ? '1.5px solid #2D6A4F' : '1.5px solid #E8E0D0',
                background: active ? 'rgba(45,106,79,0.08)' : '#fff',
                color: active ? '#2D6A4F' : '#5C5548',
              }}
            >
              {v.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

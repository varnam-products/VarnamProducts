// src/pages/admin/VariantRows.jsx
//
// Repeatable "Add Variant" rows used inside the AdminProducts product form.
// Each row is { label, price, discountPrice } — the admin types the label
// freely ("500ml", "1kg", "Gift Box", …), stock stays a single field
// elsewhere on the product (shared across all variants).

const Ico = ({ children, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const IcoPlus  = () => <Ico><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Ico>
const IcoTrash = () => <Ico size={14}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></Ico>

const rowInputCls = (err) => ({
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: `1.5px solid ${err ? '#FCA5A5' : '#E8E0D0'}`,
  background: err ? '#FEF2F2' : '#fff',
  fontFamily: 'var(--font-body)', fontSize: 13, color: '#26221C',
  outline: 'none', boxSizing: 'border-box',
})

export default function VariantRows({ variants, onChange, errors = {} }) {
  const update = (idx, field, value) => {
    const next = variants.map((v, i) => (i === idx ? { ...v, [field]: value } : v))
    onChange(next)
  }

  const addRow = () => {
    onChange([...variants, { label: '', price: '', discountPrice: '' }])
  }

  const removeRow = (idx) => {
    if (variants.length <= 1) return // at least one variant is required
    onChange(variants.filter((_, i) => i !== idx))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {variants.map((v, i) => {
        const rowErr = errors[i] || {}
        return (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: 8,
            alignItems: 'start', padding: '10px', borderRadius: 10,
            background: '#FAFAF7', border: '1px solid #F0EBE1',
          }}>
            <div>
              <input
                value={v.label}
                onChange={e => update(i, 'label', e.target.value)}
                placeholder="e.g. 500ml, 1kg, Gift Box"
                style={rowInputCls(rowErr.label)}
              />
              {rowErr.label && <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#DC2626', margin: '3px 0 0' }}>{rowErr.label}</p>}
            </div>
            <div>
              <input
                type="number" min="0"
                value={v.price}
                onChange={e => update(i, 'price', e.target.value)}
                placeholder="Price ₹"
                style={rowInputCls(rowErr.price)}
              />
              {rowErr.price && <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#DC2626', margin: '3px 0 0' }}>{rowErr.price}</p>}
            </div>
            <div>
              <input
                type="number" min="0"
                value={v.discountPrice}
                onChange={e => update(i, 'discountPrice', e.target.value)}
                placeholder="Discount ₹ (0)"
                style={rowInputCls(rowErr.discountPrice)}
              />
              {rowErr.discountPrice && <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#DC2626', margin: '3px 0 0' }}>{rowErr.discountPrice}</p>}
            </div>
            <button
              type="button"
              onClick={() => removeRow(i)}
              disabled={variants.length <= 1}
              title={variants.length <= 1 ? 'At least one variant is required' : 'Remove variant'}
              style={{
                width: 34, height: 34, borderRadius: 8, border: '1.5px solid #E8E0D0',
                background: '#fff', cursor: variants.length <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: variants.length <= 1 ? '#D1D5DB' : '#DC2626',
              }}
            >
              <IcoTrash />
            </button>
          </div>
        )
      })}

      <button
        type="button"
        onClick={addRow}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '9px', borderRadius: 9, border: '1.5px dashed #C4B9A8',
          background: 'transparent', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 600, color: '#5C5548',
        }}
      >
        <IcoPlus /> Add Variant
      </button>
    </div>
  )
}

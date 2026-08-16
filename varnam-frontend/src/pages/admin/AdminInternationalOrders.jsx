// src/pages/admin/AdminInternationalOrders.jsx
// API:
//   GET   /api/international-orders            → { success, data: [] }   (optional ?status= filter)
//   PATCH /api/international-orders/:id/status → { success, data: {} }   (status: New | Contacted | Closed | Cancelled)

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import toast from 'react-hot-toast'
import { internationalOrderAPI } from '../../services/api'

/* ─── helpers ─────────────────────────────────────────────────────── */
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

const initials = (name = '') =>
  name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || 'G'

/* ─── icons ───────────────────────────────────────────────────────── */
const Ico = ({ children, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const IcoSearch   = () => <Ico><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Ico>
const IcoClose    = () => <Ico><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ico>
const IcoRefresh  = () => <Ico><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></Ico>
const IcoGlobe    = () => <Ico><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></Ico>
const IcoUser     = () => <Ico><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Ico>
const IcoMail     = () => <Ico><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></Ico>
const IcoPhone    = () => <Ico><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l1.27-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></Ico>
const IcoMapPin   = () => <Ico><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></Ico>
const IcoBox      = () => <Ico><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></Ico>
const IcoMsg      = () => <Ico><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Ico>
const IcoInbox    = () => <Ico size={22}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></Ico>

/* ─── status config ───────────────────────────────────────────────── */
const STATUS_CFG = {
  New:       { color: '#1D4ED8', bg: 'rgba(29,78,216,0.09)',  dot: '#3B82F6' },
  Contacted: { color: '#D97706', bg: 'rgba(217,119,6,0.09)',  dot: '#F59E0B' },
  Closed:    { color: '#065F46', bg: 'rgba(6,95,70,0.09)',    dot: '#10B981' },
  Cancelled: { color: '#B91C1C', bg: 'rgba(185,28,28,0.09)',  dot: '#EF4444' },
}
const STATUSES = ['New', 'Contacted', 'Closed', 'Cancelled']
const TABS = [{ key: 'All', label: 'All' }, ...STATUSES.map(s => ({ key: s, label: s }))]

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.New
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99,
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
      fontFamily: 'var(--font-body)',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {status}
    </span>
  )
}

/* ─── skeleton row ────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid #F5F0E8' }}>
      {[50, 40, 55, 30, 45, 25].map((w, i) => (
        <td key={i} style={{ padding: '13px 14px' }}>
          <div style={{ height: 13, width: `${w}%`, borderRadius: 6, background: '#F0EBE1', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </td>
      ))}
    </tr>
  )
}

/* ─── order row ───────────────────────────────────────────────────── */
function OrderRow({ order, onView }) {
  return (
    <tr
      onClick={() => onView(order)}
      style={{ borderBottom: '1px solid #F5F0E8', cursor: 'pointer', transition: 'background 0.12s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#FAFAF7'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <td style={{ padding: '13px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(45,106,79,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, color: '#2D6A4F', fontWeight: 700 }}>{initials(order.customerName)}</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: '#26221C', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>{order.customerName}</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: '#A89F8C', margin: '2px 0 0' }}>{order.email}</p>
          </div>
        </div>
      </td>
      <td style={{ padding: '13px 14px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#3D3830', margin: 0 }}>{order.country}</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: '#A89F8C', margin: '2px 0 0' }}>{order.phone}</p>
      </td>
      <td style={{ padding: '13px 14px', fontFamily: 'var(--font-body)', fontSize: 13, color: '#5C5548' }}>{order.city || '—'}</td>
      <td style={{ padding: '13px 14px', fontFamily: 'var(--font-body)', fontSize: 13, color: '#5C5548' }}>
        {order.items?.length ? `${order.items.length} item${order.items.length > 1 ? 's' : ''} · ${fmtINR(order.estimatedTotal)}` : '—'}
      </td>
      <td style={{ padding: '13px 14px', fontFamily: 'var(--font-body)', fontSize: 12.5, color: '#A89F8C', whiteSpace: 'nowrap' }}>{fmtDate(order.createdAt)}</td>
      <td style={{ padding: '13px 14px' }}><StatusBadge status={order.status} /></td>
    </tr>
  )
}

/* ─── detail drawer ───────────────────────────────────────────────── */
function OrderDetailModal({ order: initial, onClose, onUpdated }) {
  const [order, setOrder]       = useState(initial)
  const [updating, setUpdating] = useState(false)
  const overlayRef = useRef(null)
  const panelRef   = useRef(null)

  useGSAP(() => {
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.22 })
    gsap.fromTo(panelRef.current,   { x: '100%' }, { x: '0%', duration: 0.36, ease: 'power4.out' })
  }, { scope: overlayRef })

  const close = () => {
    gsap.to(panelRef.current,   { x: '100%', duration: 0.26, ease: 'power3.in' })
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.26, onComplete: onClose })
  }

  const handleStatusChange = async (status) => {
    if (status === order.status) return
    setUpdating(true)
    try {
      const { data } = await internationalOrderAPI.updateInquiryStatus(order._id, status)
      if (data.success) {
        setOrder(data.data)
        onUpdated(data.data)
        toast.success(`Marked as ${status}`)
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update status')
    } finally { setUpdating(false) }
  }

  const Row = ({ Icon, label, value, href }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0' }}>
      <span style={{ color: '#A89F8C', flexShrink: 0, marginTop: 1 }}><Icon /></span>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: '#A89F8C', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>{label}</p>
        {href ? (
          <a href={href} style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: '#2D6A4F', fontWeight: 600, textDecoration: 'none', wordBreak: 'break-word' }}>{value}</a>
        ) : (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: '#26221C', fontWeight: 500, margin: 0, wordBreak: 'break-word' }}>{value}</p>
        )}
      </div>
    </div>
  )

  const fullAddress = [order.addressLine, order.city, order.stateRegion, order.postalCode].filter(Boolean).join(', ')

  return createPortal(
    <div ref={overlayRef} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(20,18,14,0.35)', backdropFilter: 'blur(2px)' }} onClick={close}>
      <div ref={panelRef} onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(430px, 100vw)',
          background: '#fff', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
        {/* header */}
        <div style={{ padding: '20px 22px', borderBottom: '1px solid #F0EBE1', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: '#26221C', margin: '0 0 4px' }}>{order.customerName}</h2>
            <StatusBadge status={order.status} />
          </div>
          <button onClick={close} style={{ background: '#F5F0E8', border: 'none', borderRadius: 9, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#5C5548', flexShrink: 0 }}><IcoClose /></button>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 22px 22px' }}>
          <Row Icon={IcoGlobe}  label="Country" value={order.country} />
          <Row Icon={IcoMail}   label="Email" value={order.email} href={`mailto:${order.email}`} />
          <Row Icon={IcoPhone}  label="Phone" value={order.phone} href={`tel:${order.phone}`} />
          {fullAddress && <Row Icon={IcoMapPin} label="Address" value={fullAddress} />}

          {order.items?.length > 0 && (
            <div style={{ marginTop: 6, paddingTop: 14, borderTop: '1px solid #F5F0E8' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: '#A89F8C', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Requested items</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {order.items.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: '#FAFAF7', border: '1px solid #F0EBE1' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#3D3830', fontWeight: 500 }}>{p.name}</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#A89F8C' }}>Qty: {p.quantity}{p.price ? ` · ${fmtINR(p.price)}` : ''}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: '#5C5548', margin: '8px 0 0', textAlign: 'right' }}>
                Estimated total: <strong>{fmtINR(order.estimatedTotal)}</strong>
              </p>
            </div>
          )}

          {order.message && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F5F0E8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ color: '#A89F8C' }}><IcoMsg /></span>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: '#A89F8C', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Message</p>
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: '#3D3830', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{order.message}</p>
            </div>
          )}

          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: '#C0B8A5', margin: '18px 0 0' }}>
            Submitted {fmtDate(order.createdAt)}
          </p>
        </div>

        {/* footer — status actions */}
        <div style={{ padding: '16px 22px', borderTop: '1px solid #F0EBE1', background: '#FAFAF7' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, color: '#7A7265', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 10px' }}>Update status</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {STATUSES.map(s => {
              const active = s === order.status
              return (
                <button key={s} disabled={updating} onClick={() => handleStatusChange(s)}
                  style={{
                    flex: '1 1 calc(50% - 4px)', minWidth: 90, padding: '9px 8px', borderRadius: 10,
                    border: active ? 'none' : '1.5px solid #E8E0D0',
                    background: active ? STATUS_CFG[s].color : '#fff',
                    color: active ? '#fff' : '#5C5548',
                    fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 700,
                    cursor: updating ? 'default' : 'pointer', opacity: updating ? 0.6 : 1,
                    transition: 'all 0.15s',
                  }}>
                  {s}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ─── main page ────────────────────────────────────────────────────── */
export default function AdminInternationalOrders() {
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('All')
  const [search, setSearch]       = useState('')
  const [viewOrder, setViewOrder] = useState(null)

  const headerRef = useRef(null)
  const tableRef  = useRef(null)

  const fetchOrders = useCallback(async (status = tab) => {
    setLoading(true)
    try {
      const { data } = await internationalOrderAPI.getInquiries(status === 'All' ? undefined : status)
      if (data.success) setOrders(data.data)
    } catch {
      toast.error('Failed to load international orders')
    } finally { setLoading(false) }
  }, [tab])

  useEffect(() => { fetchOrders(tab) }, [tab])

  useGSAP(() => {
    if (headerRef.current)
      gsap.fromTo(headerRef.current, { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' })
  }, [])

  useGSAP(() => {
    if (!loading && tableRef.current) {
      gsap.fromTo(tableRef.current.querySelectorAll('tbody tr'),
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, stagger: 0.025, duration: 0.3, ease: 'power3.out' }
      )
    }
  }, [loading])

  const handleUpdated = (updated) => {
    setOrders(prev => {
      if (tab !== 'All' && updated.status !== tab) return prev.filter(o => o._id !== updated._id)
      return prev.map(o => o._id === updated._id ? updated : o)
    })
    setViewOrder(updated)
  }

  const counts = useMemo(() => {
    const c = { New: 0, Contacted: 0, Closed: 0, Cancelled: 0 }
    orders.forEach(o => { if (c[o.status] !== undefined) c[o.status]++ })
    return c
  }, [orders])

  const visible = search
    ? orders.filter(o => {
        const q = search.toLowerCase()
        return o.customerName.toLowerCase().includes(q) ||
               o.country.toLowerCase().includes(q) ||
               o.phone.toLowerCase().includes(q) ||
               (o.email || '').toLowerCase().includes(q) ||
               (o.city || '').toLowerCase().includes(q)
      })
    : orders

  return (
    <div>
      <div ref={headerRef} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.3rem,2vw,1.7rem)', color: '#26221C', margin: '0 0 4px' }}>International Orders</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#A89F8C', margin: 0 }}>
            {loading ? 'Loading…' : `${orders.length} requests · ${counts.New} new`}
          </p>
        </div>
        <button onClick={() => fetchOrders(tab)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1.5px solid #E8E0D0', background: '#fff', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: '#5C5548', cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#2D6A4F'; e.currentTarget.style.color = '#2D6A4F' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E0D0'; e.currentTarget.style.color = '#5C5548' }}>
          <IcoRefresh /> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16, borderBottom: '1px solid #F0EBE1', paddingBottom: 12 }}>
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            style={{
              padding: '6px 13px', borderRadius: 9, border: tab === key ? 'none' : '1.5px solid #E8E0D0',
              background: tab === key ? '#2D6A4F' : '#fff',
              color: tab === key ? '#fff' : '#5C5548',
              fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: tab === key ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
              boxShadow: tab === key ? '0 3px 10px rgba(45,106,79,0.25)' : 'none',
            }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #F0EBE1', boxShadow: '0 2px 16px rgba(45,106,79,0.06)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid #F5F0E8', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, border: '1.5px solid #E8E0D0', background: '#FAFAF7', flex: 1, minWidth: 220 }}>
            <span style={{ color: '#A89F8C', flexShrink: 0 }}><IcoSearch /></span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search customer, country, phone, email or city…"
              style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-body)', fontSize: 13, color: '#26221C', width: '100%' }} />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A89F8C', display: 'flex', padding: 0 }}><IcoClose /></button>
            )}
          </div>
        </div>

        <div style={{ width: '100%', overflowX: 'auto' }} ref={tableRef}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#FAFAF7', borderBottom: '1px solid #F0EBE1' }}>
                {['Customer', 'Country', 'City', 'Items', 'Submitted', 'Status'].map((h, i) => (
                  <th key={i} style={{ padding: '12px 14px', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, color: '#7A7265', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '48px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#C0B8A5' }}>
                      <IcoInbox />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#A89F8C' }}>No international orders found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                visible.map(o => <OrderRow key={o._id} order={o} onView={setViewOrder} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewOrder && (
        <OrderDetailModal
          order={viewOrder}
          onClose={() => setViewOrder(null)}
          onUpdated={handleUpdated}
        />
      )}

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }
      `}</style>
    </div>
  )
}
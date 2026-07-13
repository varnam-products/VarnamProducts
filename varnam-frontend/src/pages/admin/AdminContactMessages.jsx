// src/pages/admin/AdminContactMessages.jsx
// API:
//   GET    /api/contact              → { success, data: [] }   (optional ?status= filter)
//   PATCH  /api/contact/:id/status   → { success, data: {} }   (status: New | Read | Responded | Closed)
//   DELETE /api/contact/:id          → { success, data: {} }

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import toast from 'react-hot-toast'
import { contactAPI } from '../../services/api'

/* ─── helpers ─────────────────────────────────────────────────────── */
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const initials = (name = '') =>
  name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || 'C'

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
const IcoMail     = () => <Ico><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></Ico>
const IcoPhone    = () => <Ico><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l1.27-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></Ico>
const IcoTag      = () => <Ico><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></Ico>
const IcoMsg      = () => <Ico><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Ico>
const IcoInbox    = () => <Ico size={22}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></Ico>
const IcoTrash    = () => <Ico><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></Ico>

/* ─── status config ───────────────────────────────────────────────── */
const STATUS_CFG = {
  New:       { color: '#1D4ED8', bg: 'rgba(29,78,216,0.09)',  dot: '#3B82F6' },
  Read:      { color: '#D97706', bg: 'rgba(217,119,6,0.09)',  dot: '#F59E0B' },
  Responded: { color: '#065F46', bg: 'rgba(6,95,70,0.09)',    dot: '#10B981' },
  Closed:    { color: '#5C5548', bg: 'rgba(92,85,72,0.09)',   dot: '#A89F8C' },
}
const STATUSES = ['New', 'Read', 'Responded', 'Closed']
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
      {[50, 40, 55, 30, 45].map((w, i) => (
        <td key={i} style={{ padding: '13px 14px' }}>
          <div style={{ height: 13, width: `${w}%`, borderRadius: 6, background: '#F0EBE1', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </td>
      ))}
    </tr>
  )
}

/* ─── message row ─────────────────────────────────────────────────── */
function MessageRow({ msg, onView }) {
  return (
    <tr
      onClick={() => onView(msg)}
      style={{ borderBottom: '1px solid #F5F0E8', cursor: 'pointer', transition: 'background 0.12s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#FAFAF7'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <td style={{ padding: '13px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(45,106,79,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, color: '#2D6A4F', fontWeight: 700 }}>{initials(msg.name)}</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: '#26221C', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>{msg.name}</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: '#A89F8C', margin: '2px 0 0' }}>{msg.email}</p>
          </div>
        </div>
      </td>
      <td style={{ padding: '13px 14px', fontFamily: 'var(--font-body)', fontSize: 13, color: '#3D3830' }}>{msg.subject}</td>
      <td style={{ padding: '13px 14px', fontFamily: 'var(--font-body)', fontSize: 13, color: '#5C5548', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.message}</td>
      <td style={{ padding: '13px 14px', fontFamily: 'var(--font-body)', fontSize: 12.5, color: '#A89F8C', whiteSpace: 'nowrap' }}>{fmtDate(msg.createdAt)}</td>
      <td style={{ padding: '13px 14px' }}><StatusBadge status={msg.status} /></td>
    </tr>
  )
}

/* ─── detail drawer ───────────────────────────────────────────────── */
function MessageDetailModal({ message: initial, onClose, onUpdated, onDeleted }) {
  const [message, setMessage] = useState(initial)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
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
    if (status === message.status) return
    setUpdating(true)
    try {
      const { data } = await contactAPI.updateMessageStatus(message._id, status)
      if (data.success) {
        setMessage(data.data)
        onUpdated(data.data)
        toast.success(`Marked as ${status}`)
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update status')
    } finally { setUpdating(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this message permanently?')) return
    setDeleting(true)
    try {
      const { data } = await contactAPI.deleteMessage(message._id)
      if (data.success) {
        toast.success('Message deleted')
        onDeleted(message._id)
        close()
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete message')
      setDeleting(false)
    }
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
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: '#26221C', margin: '0 0 4px' }}>{message.name}</h2>
            <StatusBadge status={message.status} />
          </div>
          <button onClick={close} style={{ background: '#F5F0E8', border: 'none', borderRadius: 9, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#5C5548', flexShrink: 0 }}><IcoClose /></button>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 22px 22px' }}>
          <Row Icon={IcoMail} label="Email" value={message.email} href={`mailto:${message.email}`} />
          {message.phone && <Row Icon={IcoPhone} label="Phone" value={message.phone} href={`tel:${message.phone}`} />}
          <Row Icon={IcoTag} label="Subject" value={message.subject} />

          <div style={{ marginTop: 6, paddingTop: 14, borderTop: '1px solid #F5F0E8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ color: '#A89F8C' }}><IcoMsg /></span>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: '#A89F8C', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Message</p>
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: '#3D3830', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{message.message}</p>
          </div>

          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: '#C0B8A5', margin: '18px 0 0' }}>
            Submitted {fmtDate(message.createdAt)}
          </p>
        </div>

        {/* footer — status actions */}
        <div style={{ padding: '16px 22px', borderTop: '1px solid #F0EBE1', background: '#FAFAF7' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, color: '#7A7265', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 10px' }}>Update status</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {STATUSES.map(s => {
              const active = s === message.status
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
          <button onClick={handleDelete} disabled={deleting} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '9px 8px', borderRadius: 10, border: '1.5px solid rgba(185,28,28,0.25)',
            background: '#fff', color: '#B91C1C', fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 700,
            cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1,
          }}>
            <IcoTrash /> {deleting ? 'Deleting…' : 'Delete Message'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ─── main page ────────────────────────────────────────────────────── */
export default function AdminContactMessages() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('All')
  const [search, setSearch]     = useState('')
  const [viewMessage, setViewMessage] = useState(null)

  const headerRef = useRef(null)
  const tableRef  = useRef(null)

  const fetchMessages = useCallback(async (status = tab) => {
    setLoading(true)
    try {
      const { data } = await contactAPI.getMessages(status === 'All' ? undefined : status)
      if (data.success) setMessages(data.data)
    } catch {
      toast.error('Failed to load messages')
    } finally { setLoading(false) }
  }, [tab])

  useEffect(() => { fetchMessages(tab) }, [tab])

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
    setMessages(prev => {
      // If filtering by a specific status and the item no longer matches, drop it.
      if (tab !== 'All' && updated.status !== tab) return prev.filter(m => m._id !== updated._id)
      return prev.map(m => m._id === updated._id ? updated : m)
    })
    setViewMessage(updated)
  }

  const handleDeleted = (id) => {
    setMessages(prev => prev.filter(m => m._id !== id))
    setViewMessage(null)
  }

  const counts = useMemo(() => {
    const c = { New: 0, Read: 0, Responded: 0, Closed: 0 }
    messages.forEach(m => { if (c[m.status] !== undefined) c[m.status]++ })
    return c
  }, [messages])

  const visible = search
    ? messages.filter(m => {
        const q = search.toLowerCase()
        return m.name.toLowerCase().includes(q) ||
               m.email.toLowerCase().includes(q) ||
               (m.phone || '').toLowerCase().includes(q) ||
               m.subject.toLowerCase().includes(q) ||
               m.message.toLowerCase().includes(q)
      })
    : messages

  return (
    <div>
      <div ref={headerRef} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.3rem,2vw,1.7rem)', color: '#26221C', margin: '0 0 4px' }}>Contact Messages</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#A89F8C', margin: 0 }}>
            {loading ? 'Loading…' : `${messages.length} messages · ${counts.New} new`}
          </p>
        </div>
        <button onClick={() => fetchMessages(tab)}
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
              placeholder="Search name, email, phone, subject or message…"
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
                {['Sender', 'Subject', 'Message', 'Submitted', 'Status'].map((h, i) => (
                  <th key={i} style={{ padding: '12px 14px', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, color: '#7A7265', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '48px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#C0B8A5' }}>
                      <IcoInbox />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#A89F8C' }}>No messages found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                visible.map(m => <MessageRow key={m._id} msg={m} onView={setViewMessage} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewMessage && (
        <MessageDetailModal
          message={viewMessage}
          onClose={() => setViewMessage(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }
      `}</style>
    </div>
  )
}

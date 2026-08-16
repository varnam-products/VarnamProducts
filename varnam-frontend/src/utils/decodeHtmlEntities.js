// src/utils/decodeHtmlEntities.js
// Some content coming from the API (product name/description etc.) is
// HTML-entity-encoded (e.g. "&amp;" instead of "&", "&#39;" instead of "'").
// Since we render it as plain text (not HTML), the browser shows the raw
// entity code instead of the actual character. This helper decodes those
// entities back to normal characters before we display them.
export function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return str
  if (typeof window === 'undefined' || !window.document) return str

  const el = document.createElement('textarea')
  el.innerHTML = str
  return el.value
}
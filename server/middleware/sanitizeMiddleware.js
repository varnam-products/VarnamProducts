const escapeHtml = (str) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

const stripMongoOperators = (str) => str.replace(/\$/g, '_');

const sanitizeValue = (str) => escapeHtml(stripMongoOperators(str));

const deepSanitize = (obj) => {
  if (typeof obj === 'string') return sanitizeValue(obj);
  if (Buffer.isBuffer(obj)) return obj;
  if (Array.isArray(obj)) return obj.map(deepSanitize);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, deepSanitize(value)])
    );
  }
  return obj;
};

// Mongo-injection-safe sanitizer WITHOUT the HTML-escaping step. Use this
// (on req._rawBody) for content that is only ever rendered as plain text on
// the frontend (React/JSX escapes automatically) — e.g. blog post fields.
// Skipping the HTML-escape here avoids inflating string length (which trips
// up maxlength checks) and avoids storing literal "&amp;"/"&#x27;" garbage
// in the DB for content that never needed escaping in the first place.
const deepStripMongoOperators = (obj) => {
  if (typeof obj === 'string') return stripMongoOperators(obj);
  if (Buffer.isBuffer(obj)) return obj;
  if (Array.isArray(obj)) return obj.map(deepStripMongoOperators);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, deepStripMongoOperators(value)])
    );
  }
  return obj;
};
export { deepStripMongoOperators };

export const sanitizeMiddleware = (req, res, next) => {
  // Stash a pre-escape snapshot of the body. HTML-escaping (below) inflates
  // string length (' -> &#x27;, & -> &amp;, etc.), which otherwise causes
  // maxlength validators running *after* this middleware to reject input
  // that was actually within limits as typed by the user. Validators that
  // need an accurate character count should check req._rawBody instead of
  // the escaped req.body value.
  if (req.body) req._rawBody = JSON.parse(JSON.stringify(req.body));

  if (req.body) req.body = deepSanitize(req.body);
  if (req.params) req.params = deepSanitize(req.params);
  next();
};
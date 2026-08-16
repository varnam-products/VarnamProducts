import logger from './logger.js';

// Fires the frontend's Vercel Deploy Hook so a new build runs automatically
// whenever a product or category is created/deleted, or edited in a way that
// affects what's shown on the storefront/prerendered pages. The build step
// (`vite build && node scripts/prerender-static-routes.mjs`) is what actually
// regenerates sitemap.xml and the prerendered /shop/:slug and /category/:slug
// HTML — this just kicks that pipeline off instead of requiring someone to
// manually push a commit after every catalog change.
//
// Deliberately fire-and-forget (not awaited by callers): triggering a rebuild
// is a side effect of the admin action, not part of what the admin request is
// waiting on. If Vercel is slow or briefly down, the admin's create/update/
// delete call should still succeed and return normally — we only log the
// failure so it's visible in the server logs, not in the user's UI.
//
// VERCEL_DEPLOY_HOOK_URL is intentionally NOT in validateEnv.js's required
// list — it's an enhancement, not something the server needs to boot. If it's
// unset, this silently no-ops (once, with a warning) rather than blocking
// admin actions or crashing the process.
let warnedMissingHook = false;

export const triggerFrontendRedeploy = (reason) => {
  const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;

  if (!hookUrl) {
    if (!warnedMissingHook) {
      logger.warn('VERCEL_DEPLOY_HOOK_URL is not set — skipping auto-redeploy trigger. Sitemap/prerendered pages will only update on the next manual deploy.');
      warnedMissingHook = true;
    }
    return;
  }

  // Vercel deploy hooks accept a plain POST with no body/auth required (the
  // hook URL itself is the secret). If several catalog edits happen close
  // together, this may fire more than once in a short window — Vercel queues/
  // supersedes redundant deployments on its own, so this doesn't need its
  // own debouncing logic.
  fetch(hookUrl, { method: 'POST' })
    .then((res) => {
      if (!res.ok) {
        logger.error(`Deploy hook responded with non-OK status (${reason}):`, { status: res.status });
        return;
      }
      logger.info(`Frontend redeploy triggered (${reason})`);
    })
    .catch((err) => {
      logger.error(`Deploy hook request failed (${reason}):`, { message: err.message });
    });
};
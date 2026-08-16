import { Cashfree, CFEnvironment } from 'cashfree-pg';
import dotenv from 'dotenv';

dotenv.config();

// IMPORTANT: This is intentionally decoupled from NODE_ENV.
// Vercel sets NODE_ENV=production on every deployment (Production, Preview, and
// branch deploys alike), so tying the Cashfree environment to NODE_ENV meant we
// were always hitting Cashfree's PRODUCTION API — even while testing with sandbox
// keys. Use a dedicated CASHFREE_ENV var instead, set per-deployment in Vercel's
// environment variable settings ('sandbox' while testing, 'production' when live).
const isCashfreeProduction = process.env.CASHFREE_ENV === 'production';

const cashfree = new Cashfree(
  isCashfreeProduction ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
  process.env.CASHFREE_APP_ID,
  process.env.CASHFREE_SECRET_KEY
);

export default cashfree;
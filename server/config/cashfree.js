import { Cashfree, CFEnvironment } from 'cashfree-pg';
import dotenv from 'dotenv';

dotenv.config();

const cashfree = new Cashfree(
  process.env.NODE_ENV === 'production' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
  process.env.CASHFREE_APP_ID,
  process.env.CASHFREE_SECRET_KEY
);

export default cashfree;
import logger from './logger.js';

export const validateEnv = () => {
  const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'MONGO_URI',
    'JWT_SECRET',
    'CASHFREE_ENV',
    'CASHFREE_APP_ID',
    'CASHFREE_SECRET_KEY',
    'CASHFREE_WEBHOOK_SECRET',
    'CLIENT_URL',
    'MAIL_FROM',
    'ADMIN_EMAIL',
  ];

  const missingVars = [];
  requiredEnvVars.forEach((variable) => {
    if (!process.env[variable]) {
      missingVars.push(variable);
    }
  });

  if (missingVars.length > 0) {
    logger.error(`🚨 Missing Critical Environment Variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  logger.info('✅ Environment structural configurations verified successfully.');
};
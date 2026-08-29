import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Environment configuration object typed with strict properties.
 */
export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'mysql://mailuser:mailpass@localhost:3306/mail_sender',
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  elasticsearchNode: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-key-for-development-mode',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  slackClientId: process.env.SLACK_CLIENT_ID || '',
  slackClientSecret: process.env.SLACK_CLIENT_SECRET || '',
  slackRedirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/callback',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  minEmailDelay: parseInt(process.env.MIN_EMAIL_DELAY || '2', 10),
  maxEmailsPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR || '10', 10),
};

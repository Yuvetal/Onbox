import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { initElasticsearchIndex } from './services/elasticsearch';
import { reconcileScheduledEmails } from './queue/reconciliation';
import './queue/worker'; // Import emailWorker to initialize BullMQ worker process

import authRouter from './routes/auth';
import slackRouter from './routes/slack';
import sendersRouter from './routes/senders';
import scheduleRouter from './routes/schedule';
import emailsRouter from './routes/emails';
import searchRouter from './routes/search';
import { bullBoardRouter } from './routes/bullBoard';

const app = express();

// Enable CORS for frontend credentials (cookies)
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Baseline healthcheck endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'mail-sender-backend',
  });
});

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/slack', slackRouter);
app.use('/api/senders', sendersRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/search', searchRouter);

// Mount Bull Board live queue monitoring dashboard
app.use('/admin/queues', bullBoardRouter);

// Global error handling middleware
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
});

const PORT = env.port;

app.listen(PORT, async () => {
  console.log(`🚀 Mail Sender Backend running on http://localhost:${PORT}`);
  console.log(`📊 Healthcheck available at http://localhost:${PORT}/health`);
  console.log(`🐂 Live BullMQ Dashboard available at http://localhost:${PORT}/admin/queues`);

  // Initialize Elasticsearch index mapping
  await initElasticsearchIndex();

  // Run startup reconciliation for SCHEDULED emails
  await reconcileScheduledEmails();
});

export default app;

# Mail Scheduler & Dispatch Service

## 1. Project Overview
A production-grade email scheduling and dispatch web application built with Express, BullMQ, Redis, MySQL, Elasticsearch, and React. It provides deterministic time-delayed email execution with atomic hourly sender rate limits, restart recovery, real Google/Slack OAuth 2.0 integrations, and full-text search.

---

## 2. Setup Instructions

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Docker & Docker Compose**: v2.x or higher

### Step 1: Start Infrastructure Containers
Run Docker Compose from the project root to spin up MySQL 8.0, Redis 7.0 (with AOF persistence enabled), and Elasticsearch 8.11:
```bash
docker-compose up -d
```
Verify all three containers are healthy:
```bash
docker ps
```
- **MySQL**: `localhost:3306` (Database: `mail_sender`, User: `mailuser`, Password: `mailpass`)
- **Redis**: `localhost:6379` (`--appendonly yes`)
- **Elasticsearch**: `localhost:9200` (`discovery.type=single-node`)

### Step 2: Backend Setup
1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Create `backend/.env` (copy from `backend/.env.example`):
   ```bash
   cp .env.example .env
   ```
   **Required Environment Variables (`backend/.env`)**:
   ```ini
   PORT=5000
   DATABASE_URL=mysql://mailuser:mailpass@localhost:3306/mail_sender
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ELASTICSEARCH_NODE=http://localhost:9200
   JWT_SECRET=super-secret-jwt-key-for-development-mode
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
   SLACK_CLIENT_ID=your-slack-client-id
   SLACK_CLIENT_SECRET=your-slack-client-secret
   SLACK_REDIRECT_URI=http://localhost:5000/api/slack/callback
   FRONTEND_URL=http://localhost:5173
   WORKER_CONCURRENCY=5
   MIN_EMAIL_DELAY=2
   MAX_EMAILS_PER_HOUR=10
   ```
3. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```
4. Build and start the backend server:
   ```bash
   npm run build
   npm start
   ```
   - Healthcheck: `http://localhost:5000/health`
   - Bull Board Queue UI: `http://localhost:5000/admin/queues`

### Step 3: Frontend Setup
1. Navigate to the frontend directory and install dependencies:
   ```bash
   cd ../frontend
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
   - Frontend UI: `http://localhost:5173`

### Step 4: Ethereal Email Setup
No manual account creation or credentials are required. The backend uses Nodemailer's `nodemailer.createTestAccount()` utility to automatically generate an ephemeral Ethereal SMTP test account on the first email delivery. Every sent message outputs a public preview link (e.g., `https://ethereal.email/message/...`) in the backend console logs.

### Step 5: Google OAuth 2.0 Credentials
1. Go to the [Google Cloud Console](https://console.cloud.google.com/) > **APIs & Services** > **Credentials**.
2. Create an **OAuth 2.0 Client ID** (Application type: *Web application*).
3. Set **Authorized JavaScript origins** to `http://localhost:5000` and `http://localhost:5173`.
4. Set **Authorized redirect URIs** to `http://localhost:5000/api/auth/google/callback`.
5. Copy the Client ID and Client Secret into `backend/.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### Step 6: Slack OAuth 2.0 Credentials
1. Go to [Slack API Apps](https://api.slack.com/apps) and create a new App from scratch.
2. Under **OAuth & Permissions**, add the following **Bot Token Scopes**:
   - `chat:write`
   - `chat:write.public`
3. Under **Redirect URLs**, add:
   - `http://localhost:5000/api/slack/callback`
4. Copy the **Client ID** and **Client Secret** from **Basic Information** into `backend/.env` as `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET`.
5. Ensure the bot is added to your target channel (configured as `#all-yuve39s-space` in `backend/src/services/slack.ts`).

---

## 3. Architecture Overview

### How Scheduling Works
Email jobs are scheduled entirely using BullMQ delayed jobs backed by Redis (`--appendonly yes`) without cron jobs or `setInterval`. When a campaign is submitted via `POST /api/schedule`, each recipient is assigned a deterministic BullMQ job ID (`email-${emailId}`). The delay until execution is computed as `Math.max(0, scheduledAt.getTime() - Date.now())` and enqueued into `emailQueue`.

### Persistence & Crash Recovery on Restart
1. **Startup Reconciliation**: On server boot, `reconcileScheduledEmails()` scans MySQL for all emails with `status = 'SCHEDULED'`. For each record, it inspects Redis; if the job already exists in BullMQ (in `delayed`, `waiting`, or `active` state), it skips re-enqueuing. If missing, it re-enqueues the job into BullMQ.
2. **Watchdog Lock Recovery**: Jobs mid-send during a crash are held under a 10-second lock (`lockDuration: 10000`). When the lock expires, BullMQ's stalled-job watchdog poll (`stalledInterval: 3000`) reclaims the job and hands it to an active worker for delivery to `SENT`.

### Rate Limiting & Atomic Rescheduling
Sender limits are enforced using an atomic Redis counter key formatted as `ratelimit:${senderId}:${YYYYMMDDHH}` with a 2-hour TTL.
1. When a worker picks up a job, it atomically increments the counter via `INCR`.
2. If `currentCount > hourlyLimit`, the worker reschedules the job to the start of the next hour window (`nextHourTimestamp`) using `job.moveToDelayed(nextHourTimestamp, token)` and throws BullMQ's `DelayedError()`.
3. The database updates `scheduledAt` to the next hour and increments `rescheduleCount`.
4. A rate-limit alert is dispatched to Slack via `chat.postMessage`.

### System Component Architecture

```mermaid
flowchart TD
    Client[React Frontend :5173] -->|HTTP / REST| API[Express Backend :5000]
    API -->|Auth / State| MySQL[(MySQL 8.0 DB)]
    API -->|Enqueue Delayed Job| Queue[BullMQ / Redis 7.0 AOF]
    Queue -->|Process Job with Lock| Worker[BullMQ Worker Service]
    Worker -->|Atomic Rate Limit Check| RedisLimiter[(Redis Atomic INCR)]
    Worker -->|Deliver Email| SMTP[Nodemailer / Ethereal SMTP]
    Worker -->|Over-Quota Alert| Slack[Slack Web API : chat.postMessage]
    Worker -->|Sync Status| MySQL
    Worker -->|Index Document| ES[(Elasticsearch 8.11)]
    Client -->|Search Query| API
    API -->|Multi-Match Query| ES
```

---

## 4. Features Implemented

### Backend
- [x] Time-delayed email scheduler using BullMQ (Zero cron jobs)
- [x] Crash persistence & startup reconciliation (`reconcileScheduledEmails`)
- [x] Stalled job watchdog recovery (`lockDuration: 10s`, `stalledInterval: 3s`)
- [x] Sender-level hourly rate limiting via atomic Redis counters
- [x] Atomic rescheduling via `job.moveToDelayed()` + `throw new DelayedError()`
- [x] Real Google OAuth 2.0 authentication with 7-day `httpOnly` JWT cookies
- [x] Real Slack OAuth 2.0 connection and live `chat.postMessage` rate-limit alerts
- [x] Elasticsearch 8.11 multi-field text search with strict status enum filtering
- [x] Bull Board queue monitoring dashboard at `/admin/queues`

### Frontend
- [x] Figma-matched React 18 + Vite + Tailwind CSS interface
- [x] Login page with Google OAuth button and local dev shortcut
- [x] Dashboard with dark sidebar (`#18181b`), Scheduled and Sent inbox tabs
- [x] Dynamic status badges (amber scheduled time, gray sent pills, red failed pills)
- [x] Full-page Compose view with sender dropdown, rich text toolbar, and delay/limit inputs
- [x] CSV recipient bulk file upload and tag chips parser
- [x] "Send Later" popover modal with datetime picker and quick preset buttons
- [x] Email detail view with sender avatar, attachment preview cards, and metadata callout
- [x] Real-time debounced Elasticsearch search bar and empty states

---

## 5. Assumptions, Shortcuts & Trade-Offs

- **Dev-Login Bypass**: An `"Instant Dev Session (Local Mode)"` link is included on the login page as a local testing shortcut when offline or running without live Google credentials. It is not used in the primary production OAuth flow.
- **Slack Token Storage**: Slack OAuth tokens are stored at the `User` model level (`user.slackAccessToken`) rather than per individual sender address, assuming the authenticated user manages all their sender addresses under one Slack workspace.
- **Slack Channel Target**: The Slack rate-limit alert posts to `#all-yuve39s-space` (the channel where the bot was added).
- **SMTP Transport**: The application is configured to deliver via Ethereal fake SMTP to prevent accidentally sending real emails during test runs while providing public message preview URLs.
- **Elasticsearch Deployment**: Elasticsearch is configured in single-node mode (`discovery.type=single-node`) with security disabled for local development simplicity.
- **Load Behavior at Scale**: The rate-limiting and pagination logic is designed to handle 1000+ concurrently scheduled emails (Redis-backed atomic counters, paginated list endpoints), but this was verified with test batches of 10 rather than a full 1000+ load test, per the assignment's note that large-scale sending doesn't need to be literally demonstrated via Ethereal.

---

## 6. Demo Video

**Video Demonstration Link**: [INSERT_DEMO_VIDEO_URL_HERE]

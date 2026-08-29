# ReachInbox Email Scheduler

## Project Overview
ReachInbox Email Scheduler is an enterprise-grade full-stack distributed system built to manage and stagger cold email campaigns. It prevents domain reputation damage by automating delayed email dispatching using BullMQ, Redis, and a rate-limiting algorithm.

## Main Features
- **Idempotent Scheduling**: Ensures no duplicated emails, even in the event of crashes.
- **BullMQ Delayed Dispatch**: Schedules emails with configurable delays per recipient.
- **Distributed Rate Limiting**: Redis-powered throttle ensuring strict limits on emails sent per sender per hour.
- **Elasticsearch Integration**: Robust full-text searching across all email logs with graceful MySQL fallback.
- **Live Queue Dashboard**: Embedded BullMQ dashboard for real-time monitoring.
- **Google OAuth**: Authenticated seamless Google login.
- **Slack Alerting**: Immediate Slack notifications when rate limits are breached.
- **CSV/TXT List Ingestion**: Smart upload logic for bulk adding recipients.

## Architecture & Technologies
**Backend**:
- Node.js & Express.js
- TypeScript
- Prisma ORM (MySQL)
- BullMQ & Redis
- Elasticsearch 8.11
- Nodemailer (Ethereal SMTP for testing)

**Frontend**:
- React 18 & Vite
- TypeScript
- Tailwind CSS
- Axios

## Prerequisites & Infrastructure Setup
Docker and Node.js (v18+) must be installed.

1. **Start Docker Infrastructure** (MySQL, Redis, Elasticsearch)
   ```bash
   docker compose up -d
   ```

2. **Required Environment Variables**
   Rename `backend/.env.example` to `backend/.env` and fill in the missing credentials:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `SLACK_CLIENT_ID`
   - `SLACK_CLIENT_SECRET`

## Backend Setup
1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize the Database Schema:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```
4. Start the Development Server (API + BullMQ Worker):
   ```bash
   npm run dev
   ```
   *The backend will be available at http://localhost:5000*
   *The BullMQ Dashboard will be available at http://localhost:5000/admin/queues*

## Frontend Setup
1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Development Server:
   ```bash
   npm run dev
   ```
   *The frontend will be available at http://localhost:5173*

## Application & Testing Workflow
1. Navigate to the frontend UI (`http://localhost:5173`).
2. Log in using the **Sign In with Google Account** flow.
3. On the dashboard, click **Compose** to create a new campaign.
4. Input your sender details, upload a CSV list of recipients, and configure your delay (e.g., 10 seconds) and hourly limit.
5. Click **Schedule**. The backend will instantly secure the database entries and enqueue delayed jobs in BullMQ.
6. Observe the jobs processing in real-time on the **BullMQ Dashboard**.
7. If your jobs exceed the configured hourly limit, you will see them transition to a `RATE_LIMITED` state and they will automatically reschedule for the next available window.
8. Connect Slack to receive an automated notification when the rate limit engages.

# Auction Bid System

A real-time auction platform built with React, Node.js, WebSockets, and PostgreSQL.

## Features

- Real-time bidding with WebSocket connections
- Auction creation and management
- Email notifications with SendGrid
- PDF invoice generation
- Redis for fast bid caching
- Supabase PostgreSQL database
- Docker deployment ready

## Quick Start

1. Clone the repository
2. Install dependencies: `npm run install-deps`
3. Set up environment variables (see .env.example)
4. Run development: `npm run dev`

## Environment Variables

Create a `.env` file in the root directory with:

```
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_postgres_connection_string

# Redis
REDIS_URL=your_upstash_redis_url

# SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=your_verified_sender_email

# JWT
JWT_SECRET=your_jwt_secret

# Server
PORT=3000
NODE_ENV=production
CLIENT_URL=
RENDER=true
```

Note: Do NOT commit the .env file. The repo has a .gitignore entry to prevent this.

## Single Dockerfile build (Frontend + Backend)

This project ships with a single multi-stage Dockerfile that builds the React client and serves it via the Node/Express server. No docker-compose is required.

Build locally (Windows PowerShell):

```
docker build -t auction-system .
docker run -p 3000:3000 --env-file .env auction-system
```

The container serves APIs under `/api` and the React app from `/`.

## Deploy on Render.com (Docker)

- Push this repository to GitHub (see Git workflow below).
- In Render dashboard: New + -> Web Service.
- Select “Deploy an existing image or Dockerfile from a registry or repo”. Point to your repo.
- Render will detect Dockerfile in the root.
- Set Service Type: Web Service.
- Port: 3000 (Render sets `PORT`, our app respects it).
- Build Command: leave empty (Render uses the Dockerfile).
- Start Command: leave empty (CMD in Dockerfile runs the app).
- Instance: pick a plan.
- Environment Variables (add in Render UI):
  - DATABASE_URL
  - REDIS_URL (or omit to use mock cache)
  - SENDGRID_API_KEY, FROM_EMAIL
  - JWT_SECRET
  - NODE_ENV=production (Render sets this by default)
  - CLIENT_URL (optional; keep empty so same-origin is used)

Notes:
- Socket.IO and API will run on the same origin. The client defaults to same-origin in production.
- Puppeteer uses the system Chromium in the image; no extra flags required on Render.

## Git: replace an existing repo’s contents and push

If you have a pre-existing remote repo that you want to overwrite with this project:

1. Ensure .gitignore excludes secrets and generated files (already configured).
2. Initialize local Git (if not already):
   - `git init`
   - `git add .`
   - `git commit -m "Initial commit: auction bid system"`
3. Point to the existing remote (replace placeholders):
   - `git remote add origin https://github.com/<user>/<repo>.git`
4. Overwrite remote history (DANGEROUS: replaces remote branch):
   - `git push -u origin --force main`
   If your local branch is `master`:
   - `git branch -M main` (optional to rename locally)
   - `git push -u origin --force main`

If the remote has protections, disable branch protections temporarily or push to a new branch and open a PR.

To delete all files in the remote and replace them, the force push above is sufficient; you do not need to manually delete files in the remote.

## Render health checks

- A `/health` endpoint returns JSON OK; the Dockerfile defines a HEALTHCHECK.
- Render can also use its own health checks against `/health`.

## Tech Stack

- Frontend: React.js
- Backend: Node.js + Express
- Database: Supabase (PostgreSQL)
- Real-time: Socket.IO
- Cache: Redis (Upstash)
- Email: SendGrid
- PDF: Puppeteer

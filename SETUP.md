# Live Auction Platform - Setup Guide

## 🎯 Complete Setup Instructions

### Step 1: PowerShell Execution Policy (Windows)

Since you're using Windows PowerShell, you need to enable script execution:

```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Or use this alternative method for temporary access:
```powershell
# Run this in PowerShell (temporary for current session)
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

### Step 2: Install Dependencies

```powershell
# Navigate to project root
cd "d:\Assignment\auction_bid"

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ..\client
npm install

# Go back to root
cd ..
```

### Step 3: Environment Variables Setup

**Server Environment (.env in server folder):**
```env
NODE_ENV=development
PORT=3000

# Database - Use one of these options:

# Option 1: Local PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auction_db
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password

# Option 2: Supabase (Recommended for quick start)
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=your-anon-key

# JWT Secret (Generate a long random string)
JWT_SECRET=your-super-secret-jwt-key-make-it-long-and-complex-at-least-32-characters
JWT_EXPIRE=7d

# Redis - Use one of these options:

# Option 1: Local Redis
REDIS_URL=redis://localhost:6379

# Option 2: Upstash (Recommended for quick start)
REDIS_URL=rediss://default:[password]@[endpoint]:6379

# Email Service
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourauction.com

# Frontend URL
CLIENT_URL=http://localhost:3001
```

**Client Environment (.env in client folder):**
```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_SOCKET_URL=http://localhost:3000
```

### Step 4: Database Setup Options

#### Option A: Local PostgreSQL

1. **Install PostgreSQL:**
   - Download from https://www.postgresql.org/download/windows/
   - Follow installation wizard
   - Remember the superuser password

2. **Create Database:**
   ```sql
   -- Open pgAdmin or psql
   CREATE DATABASE auction_db;
   CREATE USER auction_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE auction_db TO auction_user;
   ```

#### Option B: Supabase (Recommended - Easier)

1. **Create Supabase Account:**
   - Go to https://supabase.com
   - Sign up/Login
   - Create new project

2. **Get Database URL:**
   - Go to Settings → Database
   - Copy the connection string
   - Add to your .env file

### Step 5: Redis Setup Options

#### Option A: Local Redis (Windows)

**Using WSL (Recommended):**
```bash
# Install WSL if not already installed
wsl --install

# In WSL terminal:
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

**Using Docker:**
```powershell
# Install Docker Desktop, then:
docker run -d -p 6379:6379 redis:alpine
```

#### Option B: Upstash (Recommended - Easier)

1. **Create Upstash Account:**
   - Go to https://upstash.com
   - Sign up/Login
   - Create Redis database

2. **Get Redis URL:**
   - Copy the connection URL
   - Add to your .env file

### Step 6: SendGrid Setup (for Emails)

1. **Create SendGrid Account:**
   - Go to https://sendgrid.com
   - Sign up for free account

2. **Get API Key:**
   - Go to Settings → API Keys
   - Create new API key with full access
   - Add to your .env file

3. **Verify Sender Email:**
   - Go to Settings → Sender Authentication
   - Verify your email address

### Step 7: Run the Application

**Method 1: Using npm scripts (from root directory):**
```powershell
# This runs both server and client
npm run dev
```

**Method 2: Run separately (two terminals):**

**Terminal 1 - Backend:**
```powershell
cd "d:\Assignment\auction_bid\server"
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd "d:\Assignment\auction_bid\client"
npm start
```

### Step 8: Access the Application

- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:3000
- **API Documentation:** http://localhost:3000/api-docs (if implemented)

## 🚀 Quick Start with Cloud Services (Easiest)

If you want to get started quickly without local setup:

1. **Use Supabase for Database** (free tier available)
2. **Use Upstash for Redis** (free tier available)
3. **Use SendGrid for emails** (free tier available)

This way you only need Node.js locally!

## 🧪 Testing the Application

### Test User Registration
1. Go to http://localhost:3001/register
2. Create a seller account (select "Seller" role)
3. Create a buyer account (select "Buyer" role)

### Test Auction Creation
1. Login as seller
2. Go to "Create Auction"
3. Fill in auction details
4. Set start time 5 minutes from now
5. Set end time 1 hour from start

### Test Real-time Bidding
1. Login as buyer in another browser/incognito
2. Navigate to the auction
3. Place bids and see real-time updates

## 🐛 Troubleshooting

### Common Issues:

**1. Database Connection Error:**
- Check your DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check firewall settings

**2. Redis Connection Error:**
- Ensure Redis is running
- Check REDIS_URL format
- For Upstash, ensure URL includes username/password

**3. Email Not Sending:**
- Verify SendGrid API key
- Check sender email is verified
- Look at server console for error messages

**4. Port Already in Use:**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000
# Kill the process (replace PID)
taskkill /PID <process_id> /F
```

**5. CORS Errors:**
- Check CLIENT_URL in server .env
- Ensure both apps are running on correct ports

## 📁 Project Structure

```
auction_bid/
├── server/                 # Backend Node.js app
│   ├── config/            # Database config
│   ├── controllers/       # Route handlers
│   ├── middleware/        # Auth, validation, etc.
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── utils/            # Helper functions
│   ├── .env              # Server environment variables
│   └── server.js         # Entry point
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── contexts/     # React contexts
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   └── utils/       # Helper functions
│   ├── .env             # Client environment variables
│   └── package.json
├── Dockerfile           # Docker config
└── README.md
```

## 🚀 Deployment (Optional)

### Deploy to Render.com

1. **Push to GitHub**
2. **Connect to Render:**
   - Create account at render.com
   - Connect GitHub repo
   - Create new Web Service

3. **Build Settings:**
   - Build Command: `npm install && cd client && npm install && npm run build`
   - Start Command: `cd server && npm start`

4. **Environment Variables:**
   - Add all server .env variables in Render dashboard
   - Use cloud services (Supabase, Upstash, SendGrid)

## 🎉 You're Done!

Your auction platform should now be running with:
- ✅ Real-time bidding
- ✅ User authentication
- ✅ Email notifications
- ✅ Admin panel
- ✅ Responsive design

**Happy Bidding!** 🎯

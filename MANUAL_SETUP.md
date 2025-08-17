# 🚀 Complete Manual Setup Guide - Live Auction Platform

## 📋 Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js (version 16 or higher)
- ✅ Supabase account (free)
- ✅ Upstash account (free) 
- ✅ PowerShell execution enabled

## 🔧 Step 1: Fix PowerShell Execution Policy

**Run PowerShell as Administrator** and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📦 Step 2: Install Dependencies

**Open PowerShell in project root:**
```powershell
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

## 🗄️ Step 3: Database Setup (Supabase)

1. **Go to https://supabase.com**
2. **Sign up/Login**
3. **Create New Project:**
   - Project name: `auction-platform`
   - Database password: `alex123` (or your choice)
   - Region: Choose closest to you
4. **Wait for project creation (2-3 minutes)**
5. **Get Connection Details:**
   - Go to Settings → Database
   - Find "Connection string" section
   - Copy the URI string
   - **Important:** Replace `[YOUR-PASSWORD]` with your actual password

**Your DATABASE_URL should look like:**
```
postgresql://postgres.phdbuillerfhwnfurjbt:alex123@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

## 🔄 Step 4: Redis Setup (Upstash)

1. **Go to https://upstash.com**
2. **Sign up/Login**
3. **Create Database:**
   - Name: `auction-redis`
   - Type: Regional
   - Region: Choose closest to you
4. **Get Redis URL:**
   - Click on your database
   - Copy the "Redis Connect URL"

**Your REDIS_URL should look like:**
```
redis://default:AR3_AAImcDFjYzgxNjRjMzAzNDg0MTZlOGE0OTdmYTE1MDQwZmE2YnAxNzY3OQ@willing-cobra-7679.upstash.io:6379
```

## ⚙️ Step 5: Update Environment Variables

**Edit `d:\Assignment\auction_bid\server\.env`:**

Make sure these lines are **uncommented and filled**:
```env
NODE_ENV=development
PORT=3000

# Use your actual Supabase values:
DATABASE_URL=postgresql://postgres.phdbuillerfhwnfurjbt:alex123@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://phdbuillerfhwnfurjbt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZGJ1aWxsZXJmaHduZnVyamJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MzE3MjksImV4cCI6MjA3MTAwNzcyOX0.BSPkVlqK_hqb09DHj0UHe4zOk3fj1F7oFU1x4aE7rj4

# Use your actual Upstash Redis URL:
REDIS_URL=redis://default:AR3_AAImcDFjYzgxNjRjMzAzNDg0MTZlOGE0OTdmYTE1MDQwZmE2YnAxNzY3OQ@willing-cobra-7679.upstash.io:6379

# JWT Secret (already set)
JWT_SECRET=your-super-secret-jwt-key-make-it-long-and-complex-at-least-32-characters-for-security
JWT_EXPIRE=7d

# Email (optional for now)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourauction.com

# Frontend URL
CLIENT_URL=http://localhost:3001
```

**Check `d:\Assignment\auction_bid\client\.env` exists with:**
```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_SOCKET_URL=http://localhost:3000
```

## 🚀 Step 6: Start the Application

### Method 1: Start Both Services Together (Recommended)

**Open PowerShell in project root:**
```powershell
cd "d:\Assignment\auction_bid"
npm run dev
```

### Method 2: Start Services Separately

**Terminal 1 (Backend):**
```powershell
cd "d:\Assignment\auction_bid\server"
npm run dev
```

**Terminal 2 (Frontend):**
```powershell
cd "d:\Assignment\auction_bid\client"
npm start
```

## 🌐 Step 7: Access Your Application

- **Frontend (Main App):** http://localhost:3001
- **Backend API:** http://localhost:3000
- **Health Check:** http://localhost:3000/health

## 🧪 Step 8: Test the Application

### Test 1: Basic Access
1. Open http://localhost:3001
2. You should see the auction platform homepage

### Test 2: User Registration
1. Click "Register" or go to http://localhost:3001/register
2. Create a **Seller** account:
   - First Name: `John`
   - Last Name: `Seller` 
   - Email: `john@seller.com`
   - Password: `password123`
   - Role: `Seller`
3. Create a **Buyer** account (use different browser/incognito):
   - First Name: `Jane`
   - Last Name: `Buyer`
   - Email: `jane@buyer.com` 
   - Password: `password123`
   - Role: `Buyer`

### Test 3: Create Auction (Seller)
1. Login as seller
2. Go to "Create Auction"
3. Fill details:
   - Title: `Vintage Camera`
   - Description: `Professional vintage camera in excellent condition`
   - Category: `Electronics`
   - Starting Price: `100`
   - Start Time: 5 minutes from now
   - End Time: 2 hours from start time
4. Click "Create Auction"

### Test 4: Real-time Bidding (Buyer)
1. In another browser/incognito, login as buyer
2. Navigate to the auction you created
3. Place bids and watch real-time updates
4. Test with multiple browser windows

## 🐛 Troubleshooting

### Issue 1: Server Won't Start
**Error:** `app.use() requires a middleware function`
**Solution:** Already fixed in the code. Restart the server.

### Issue 2: Database Connection Error
**Symptoms:** `DATABASE_URL is undefined`
**Solution:**
```powershell
# Check your .env file in server directory
cd "d:\Assignment\auction_bid\server"
type .env
# Ensure DATABASE_URL is uncommented and has your Supabase URL
```

### Issue 3: Redis Connection Error
**Symptoms:** Redis connection warnings
**Solution:** 
- Check REDIS_URL in .env file
- The app will work with mock Redis if connection fails

### Issue 4: Port Already in Use
**Symptoms:** `Something is already running on port 3000/3001`
**Solution:**
```powershell
# Find and kill processes using the ports
netstat -ano | findstr :3000
netstat -ano | findstr :3001
# Kill the processes (replace PID)
taskkill /PID <process_id> /F
```

### Issue 5: CORS Errors
**Solution:** Ensure CLIENT_URL in server .env matches frontend URL

## 📱 Step 9: Features to Test

### ✅ What Should Work:
- ✅ User registration and login
- ✅ Auction creation (sellers)
- ✅ Auction browsing and search
- ✅ Real-time bidding
- ✅ Dashboard with statistics
- ✅ Responsive design

### 📧 Optional: Email Setup (SendGrid)
1. Go to https://sendgrid.com
2. Create free account
3. Get API key from Settings → API Keys
4. Add to SENDGRID_API_KEY in .env
5. Verify sender email

## 🎯 Success Indicators

**If everything works, you should see:**

**Backend Console:**
```
✅ Connected to database
✅ Connected to Redis (or Mock Redis)
🚀 Server running on port 3000
✅ Socket.IO server ready
```

**Frontend:**
- Beautiful auction platform homepage
- Working registration/login
- Auction listings with real-time updates
- Responsive design on mobile/desktop

## 🎉 Congratulations!

Your **Live Auction Platform** is now running with:
- 🔐 User authentication
- 📊 Real-time bidding
- 💰 Auction management
- 📱 Responsive design
- ⚡ Socket.IO real-time updates
- 🗄️ PostgreSQL database
- 🔄 Redis caching

**Happy Bidding!** 🎊

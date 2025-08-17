// Complete Fix & Test Script
// Run this in your browser console after logging in

console.log('🚀 Starting Auction Platform Test...');

// 1. Clear any cached auth data
function clearAuthCache() {
  console.log('🧹 Clearing authentication cache...');
  localStorage.clear();
  sessionStorage.clear();
  console.log('✅ Cache cleared');
}

// 2. Test Socket Connection
function testSocketConnection() {
  console.log('🔌 Testing Socket.IO connection...');
  
  // Check if socket is connected
  if (window.socket) {
    console.log('✅ Socket found:', window.socket.connected ? 'Connected' : 'Disconnected');
    console.log('🆔 Socket ID:', window.socket.id);
  } else {
    console.log('❌ No socket found - Socket.IO not initialized');
  }
}

// 3. Create demo users via API
async function createDemoUsers() {
  console.log('👥 Creating demo users...');
  
  const users = [
    {
      username: 'buyer1',
      email: 'buyer1@test.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Buyer',
      role: 'buyer'
    },
    {
      username: 'buyer2', 
      email: 'buyer2@test.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Buyer',
      role: 'buyer'
    },
    {
      username: 'seller1',
      email: 'seller1@test.com',
      password: 'password123',
      firstName: 'Bob',
      lastName: 'Seller',
      role: 'seller'
    }
  ];

  for (const user of users) {
    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      
      if (response.ok) {
        console.log(`✅ Created: ${user.email}`);
      } else {
        const error = await response.json();
        console.log(`⚠️ ${user.email}: ${error.message}`);
      }
    } catch (error) {
      console.error(`❌ Error creating ${user.email}:`, error);
    }
  }
}

// 4. Create test auction
async function createTestAuction() {
  console.log('🏺 Creating test auction...');
  
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ No token found - please login first');
    return;
  }

  const now = new Date();
  const startTime = new Date(now.getTime() + 1000); // Start in 1 second
  const endTime = new Date(now.getTime() + 30 * 60 * 1000); // End in 30 minutes

  const auctionData = {
    title: "Test Gaming Laptop - RTX 4080",
    description: "High-end gaming laptop with RTX 4080, 32GB RAM, perfect for gaming and streaming. Almost new condition with warranty.",
    category: "Electronics",
    startingPrice: 80000,
    bidIncrement: 2000,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    imageUrl: ""
  };

  try {
    const response = await fetch('http://localhost:3000/api/auctions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(auctionData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Test auction created!');
      console.log('🔗 Auction ID:', result.auction.id);
      console.log('💰 Starting Price: ₹80,000');
      console.log('📈 Bid Increment: ₹2,000');
      console.log(`🌐 URL: http://localhost:3001/auction/${result.auction.id}`);
      
      return result.auction.id;
    } else {
      const error = await response.json();
      console.error('❌ Failed to create auction:', error.message);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// 5. Test bid placement
async function testBidPlacement(auctionId, bidAmount) {
  console.log(`💰 Testing bid placement: ₹${bidAmount} on auction ${auctionId}`);
  
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ No token found - please login first');
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/api/bids/${auctionId}/place`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ amount: bidAmount })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Bid placed successfully!');
      console.log('💰 Bid Amount:', result.bid.amount);
      console.log('⏰ Bid Time:', result.bid.bidTime);
      return result.bid;
    } else {
      const error = await response.json();
      console.error('❌ Failed to place bid:', error.message);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Main test function
async function runCompleteTest() {
  console.log('🎯 Running complete auction platform test...');
  
  // Step 1: Create demo users
  await createDemoUsers();
  
  console.log('\n📋 Test Instructions:');
  console.log('1. Login as seller1@test.com / password123');
  console.log('2. Run: const auctionId = await createTestAuction()');
  console.log('3. Open second browser/incognito window');
  console.log('4. Login as buyer1@test.com / password123');
  console.log('5. Navigate to the auction URL');
  console.log('6. Place bids and watch real-time updates!');
  console.log('7. Test notifications by opening third window with buyer2@test.com');
}

// Quick functions for manual testing
window.clearAuthCache = clearAuthCache;
window.testSocketConnection = testSocketConnection;
window.createDemoUsers = createDemoUsers;
window.createTestAuction = createTestAuction;
window.testBidPlacement = testBidPlacement;
window.runCompleteTest = runCompleteTest;

console.log('🛠️ Test functions available:');
console.log('- clearAuthCache()');
console.log('- testSocketConnection()');
console.log('- createDemoUsers()');
console.log('- createTestAuction()');
console.log('- testBidPlacement(auctionId, amount)');
console.log('- runCompleteTest()');

// Auto-run if you want
runCompleteTest();

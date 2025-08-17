// Test Auction Creator
// Run this in browser console to create a test auction with immediate active status

async function createTestAuction() {
  // First login as seller
  const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'seller@test.com',
      password: 'password123'
    })
  });
  
  const loginData = await loginResponse.json();
  
  if (!loginResponse.ok) {
    console.error('Login failed:', loginData);
    return;
  }
  
  console.log('✅ Logged in as seller');
  
  // Create auction with immediate start time
  const now = new Date();
  const startTime = new Date(now.getTime() - 1000); // 1 second ago (already started)
  const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
  
  const auctionData = {
    title: 'Test iPhone 15 Pro',
    description: 'Brand new iPhone 15 Pro for testing bidding functionality',
    category: 'Electronics',
    startingPrice: 50000,
    bidIncrement: 1000,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    imageUrl: ''
  };
  
  const auctionResponse = await fetch('http://localhost:3000/api/auctions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginData.token}`
    },
    body: JSON.stringify(auctionData)
  });
  
  const auctionResult = await auctionResponse.json();
  
  if (auctionResponse.ok) {
    console.log('✅ Test auction created:', auctionResult.auction);
    console.log(`🔗 View auction at: http://localhost:3001/auction/${auctionResult.auction.id}`);
    console.log('📝 Now login with buyer@test.com to test bidding!');
    return auctionResult.auction;
  } else {
    console.error('❌ Failed to create auction:', auctionResult);
  }
}

createTestAuction();

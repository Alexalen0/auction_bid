// Quick Test Auction Creator
// Use this in browser console on http://localhost:3001 AFTER logging in as seller

async function createTestAuction() {
  const now = new Date();
  const startTime = new Date(now.getTime() + 2 * 60 * 1000); // Start in 2 minutes
  const endTime = new Date(now.getTime() + 60 * 60 * 1000); // End in 1 hour

  const auctionData = {
    title: "Test Laptop - Gaming Ready",
    description: "High-performance gaming laptop with RGB keyboard and powerful GPU. Perfect for gaming and professional work.",
    category: "Electronics",
    startingPrice: 25000,
    bidIncrement: 1000,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    imageUrl: ""
  };

  try {
    const response = await fetch('http://localhost:3000/api/auctions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(auctionData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Test auction created successfully!');
      console.log('🔗 Auction ID:', result.auction.id);
      console.log('⏰ Status:', result.auction.status);
      console.log('🎯 Starting Price: ₹25,000');
      console.log('📈 Bid Increment: ₹1,000');
      console.log('⏳ Will be active in 2 minutes');
      console.log(`🌐 URL: http://localhost:3001/auction/${result.auction.id}`);
      
      // Auto-navigate to the auction
      window.location.href = `/auction/${result.auction.id}`;
    } else {
      console.error('❌ Failed to create auction:', result.message);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Check if user is logged in
if (localStorage.getItem('token')) {
  console.log('🔑 Token found - creating test auction...');
  createTestAuction();
} else {
  console.log('❌ Please login first, then run this script again');
}

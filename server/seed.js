const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Fallback: Try to load from project root if server .env doesn't exist
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

const { User, Auction, Bid } = require('./models');
const { sequelize } = require('./config/database');

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const hoursFrom = (date, h) => {
  const d = new Date(date);
  d.setHours(d.getHours() + h);
  return d;
};

const seedDemoData = async () => {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to database for seeding');

    // Ensure basic users (NO ADMIN)
    const [seller] = await User.findOrCreate({
      where: { email: 'seller@test.com' },
      defaults: {
        username: 'seller_demo',
        email: 'seller@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Seller',
        role: 'seller',
        isActive: true
      }
    });

    const [buyer1] = await User.findOrCreate({
      where: { email: 'buyer@test.com' },
      defaults: {
        username: 'buyer_demo',
        email: 'buyer@test.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Buyer',
        role: 'buyer',
        isActive: true
      }
    });

    const [buyer2] = await User.findOrCreate({
      where: { email: 'buyer2@test.com' },
      defaults: {
        username: 'buyer2_demo',
        email: 'buyer2@test.com',
        password: 'password123',
        firstName: 'Alex',
        lastName: 'Buyer',
        role: 'buyer',
        isActive: true
      }
    });

    console.log('👤 Users ready:', { seller: seller.email, buyer1: buyer1.email, buyer2: buyer2.email });

    // Create a long-running auction (~50 days window)
    const startTime = daysAgo(49); // started 49 days ago
    const endTime = hoursFrom(new Date(), 24); // ends in 24 hours

    const auction = await Auction.create({
      title: '50-Day Test Auction - Premium Smartphone',
      description: 'A long-running auction to showcase bidding history over ~50 days.',
      category: 'Electronics',
      startingPrice: 15000,
      bidIncrement: 500,
      startTime,
      endTime,
      sellerId: seller.id,
      status: 'active',
      imageUrl: ''
    });

    console.log(`🏺 Created auction #${auction.id}`);

    // Create sample bids spread across ~50 days
    let currentAmount = 15000;
    const bidders = [buyer1.id, buyer2.id];

    // About 2 bids per day for 50 days => ~100 bids
    const totalBids = 100;
    const totalHoursSpan = 49 * 24; // hours between start and now
    const stepHours = Math.max(1, Math.floor(totalHoursSpan / totalBids));

    const bidIncrements = [500, 750, 1000];

    const bidCreates = [];
    let cursor = new Date(startTime);
    for (let i = 0; i < totalBids; i++) {
      cursor = hoursFrom(cursor, stepHours);
      if (cursor > new Date()) break; // don't create future bids

      const inc = bidIncrements[i % bidIncrements.length];
      currentAmount += inc;
      const bidderId = bidders[i % bidders.length];

      bidCreates.push(Bid.create({
        auctionId: auction.id,
        bidderId,
        amount: currentAmount,
        bidTime: cursor,
        isWinning: false
      }));
    }

    await Promise.all(bidCreates);

    // Mark the last bid as winning (current highest)
    const lastBid = await Bid.findOne({
      where: { auctionId: auction.id },
      order: [['bidTime', 'DESC']]
    });
    if (lastBid) {
      await lastBid.update({ isWinning: true });
      await auction.update({ currentHighestBid: lastBid.amount, status: 'active' });
    }

    console.log(`📈 Seeded ${bidCreates.length} bids over ~50 days for auction #${auction.id}`);

    console.log('\n🎉 Seeding completed!');
    console.log('📝 Demo Account Credentials (no admin):');
    console.log('Seller: seller@test.com / password123');
    console.log('Buyer1: buyer@test.com / password123');
    console.log('Buyer2: buyer2@test.com / password123');
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
  } finally {
    await sequelize.close();
  }
};

// Run if called directly
if (require.main === module) {
  seedDemoData();
}

module.exports = seedDemoData;

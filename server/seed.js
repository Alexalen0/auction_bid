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

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const categories = [
  'Electronics', 'Fashion', 'Home & Garden', 'Sports & Outdoors',
  'Books & Media', 'Collectibles', 'Art & Antiques', 'Other'
];

const sampleTitles = [
  'Premium Smartphone', 'Vintage Watch', 'Gaming Laptop', 'Designer Handbag',
  'Mountain Bike', 'Wireless Earbuds', '4K Action Camera', 'Antique Vase'
];

const createUsers = async () => {
  // Sellers
  const sellersData = [
    { email: 'seller1@test.com', username: 'seller_one', firstName: 'Seller', lastName: 'One' },
    { email: 'seller2@test.com', username: 'seller_two', firstName: 'Seller', lastName: 'Two' },
    { email: 'seller3@test.com', username: 'seller_three', firstName: 'Seller', lastName: 'Three' }
  ];

  const buyersData = [
    { email: 'buyer1@test.com', username: 'buyer_one', firstName: 'Buyer', lastName: 'One' },
    { email: 'buyer2@test.com', username: 'buyer_two', firstName: 'Buyer', lastName: 'Two' },
    { email: 'buyer3@test.com', username: 'buyer_three', firstName: 'Buyer', lastName: 'Three' },
    { email: 'buyer4@test.com', username: 'buyer_four', firstName: 'Buyer', lastName: 'Four' },
    { email: 'buyer5@test.com', username: 'buyer_five', firstName: 'Buyer', lastName: 'Five' },
    { email: 'buyer6@test.com', username: 'buyer_six', firstName: 'Buyer', lastName: 'Six' }
  ];

  const sellers = [];
  for (const s of sellersData) {
    const [seller] = await User.findOrCreate({
      where: { email: s.email },
      defaults: { ...s, password: 'password123', role: 'seller', isActive: true }
    });
    sellers.push(seller);
  }

  const buyers = [];
  for (const b of buyersData) {
    const [buyer] = await User.findOrCreate({
      where: { email: b.email },
      defaults: { ...b, password: 'password123', role: 'buyer', isActive: true }
    });
    buyers.push(buyer);
  }

  return { sellers, buyers };
};

const createAuctionsAndBids = async ({ sellers, buyers }) => {
  const auctionsCreated = [];

  for (const seller of sellers) {
    // 2 auctions per seller
    for (let i = 0; i < 2; i++) {
      const startTime = daysAgo(49); // started 49 days ago
      const endTime = hoursFrom(new Date(), 24); // ends in 24 hours

      const startingPrice = randInt(1000, 20000);
      const bidIncrement = [100, 250, 500, 750, 1000][randInt(0, 4)];

      const auction = await Auction.create({
        title: `50-Day Auction - ${sampleTitles[randInt(0, sampleTitles.length - 1)]}`,
        description: 'Long-running auction seeded for demo purposes with bids spread across ~50 days.',
        category: categories[randInt(0, categories.length - 1)],
        startingPrice,
        bidIncrement,
        startTime,
        endTime,
        sellerId: seller.id,
        status: 'active',
        imageUrl: ''
      });

      // Create randomized bids across the 49-day span
      let currentAmount = startingPrice;
      const totalHoursSpan = 49 * 24; // hours between start and now
      const totalBids = randInt(60, 140); // ~1-3 bids/day
      const stepHours = Math.max(1, Math.floor(totalHoursSpan / totalBids));
      let cursor = new Date(startTime);

      const bidCreates = [];
      for (let j = 0; j < totalBids; j++) {
        cursor = hoursFrom(cursor, stepHours + randInt(0, 6));
        if (cursor > new Date()) break; // avoid future bids

        currentAmount += bidIncrement * (randInt(1, 3));
        const bidder = buyers[randInt(0, buyers.length - 1)];

        bidCreates.push(Bid.create({
          auctionId: auction.id,
          bidderId: bidder.id,
          amount: currentAmount,
          bidTime: cursor,
          isWinning: false
        }));
      }

      await Promise.all(bidCreates);

      // Mark latest as winning and update auction
      const lastBid = await Bid.findOne({ where: { auctionId: auction.id }, order: [['bidTime', 'DESC']] });
      if (lastBid) {
        await lastBid.update({ isWinning: true });
        await auction.update({ currentHighestBid: lastBid.amount });
      }

      auctionsCreated.push({ id: auction.id, bids: bidCreates.length });
    }
  }

  return auctionsCreated;
};

const seedDemoData = async () => {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to database for seeding');

    const { sellers, buyers } = await createUsers();
    console.log(`👤 Users ready: ${sellers.length} sellers, ${buyers.length} buyers`);

    const auctions = await createAuctionsAndBids({ sellers, buyers });
    const totalBids = auctions.reduce((sum, a) => sum + a.bids, 0);

    console.log(`🏺 Created ${auctions.length} auctions across ${sellers.length} sellers`);
    console.log(`📈 Seeded ~${totalBids} bids over ~50 days`);

    console.log('\n🎉 Seeding completed!');
    console.log('📝 Demo Accounts (password: password123):');
    console.log('Sellers:', sellers.map(s => s.email).join(', '));
    console.log('Buyers:', buyers.map(b => b.email).join(', '));
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

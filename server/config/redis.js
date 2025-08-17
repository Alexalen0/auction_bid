const redis = require('redis');

let client;

// Check if we should use real Redis or mock
const useRealRedis = process.env.REDIS_URL && 
                   !process.env.REDIS_URL.includes('mock://') && 
                   process.env.NODE_ENV === 'production';

if (useRealRedis) {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        tls: process.env.REDIS_URL.includes('rediss://'),
        rejectUnauthorized: false
      }
    });
  } catch (error) {
    console.warn('⚠️ Redis connection failed, using mock client');
    client = createMockRedisClient();
  }
} else {
  // Always use mock Redis for development
  console.log('📝 Using mock Redis client for development');
  client = createMockRedisClient();
}

// Mock Redis client for development
function createMockRedisClient() {
  return {
    connect: async () => console.log('✅ Mock Redis connected'),
    ping: async () => 'PONG',
    on: () => {},
    get: async () => null,
    set: async () => 'OK',
    setEx: async () => 'OK',
    del: async () => 1,
    sAdd: async () => 1,
    sMembers: async () => [],
    quit: async () => 'OK',
    isOpen: true,
    isReady: true
  };
}

// Only set up event handlers for real Redis clients
if (useRealRedis && typeof client.on === 'function') {
  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('✅ Connected to Redis');
  });

  client.on('ready', () => {
    console.log('✅ Redis client ready');
  });

  // Connect to Redis
  (async () => {
    try {
      await client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      // Fall back to mock client
      client = createMockRedisClient();
    }
  })();
} else {
  // For mock client, just call connect
  client.connect();
}

// Redis utility functions
const redisUtils = {
  // Get highest bid for auction
  async getHighestBid(auctionId) {
    try {
      const bid = await client.get(`auction:${auctionId}:highest_bid`);
      return bid ? JSON.parse(bid) : null;
    } catch (error) {
      console.error('Error getting highest bid:', error);
      return null;
    }
  },

  // Set highest bid for auction
  async setHighestBid(auctionId, bidData) {
    try {
      await client.setEx(`auction:${auctionId}:highest_bid`, 3600, JSON.stringify(bidData));
      return true;
    } catch (error) {
      console.error('Error setting highest bid:', error);
      return false;
    }
  },

  // Get auction participants
  async getAuctionParticipants(auctionId) {
    try {
      const participants = await client.sMembers(`auction:${auctionId}:participants`);
      return participants || [];
    } catch (error) {
      console.error('Error getting auction participants:', error);
      return [];
    }
  },

  // Add auction participant
  async addAuctionParticipant(auctionId, userId) {
    try {
      await client.sAdd(`auction:${auctionId}:participants`, userId.toString());
      return true;
    } catch (error) {
      console.error('Error adding auction participant:', error);
      return false;
    }
  },

  // Cache auction data
  async cacheAuction(auctionId, auctionData) {
    try {
      await client.setEx(`auction:${auctionId}:data`, 3600, JSON.stringify(auctionData));
      return true;
    } catch (error) {
      console.error('Error caching auction:', error);
      return false;
    }
  },

  // Get cached auction data
  async getCachedAuction(auctionId) {
    try {
      const auction = await client.get(`auction:${auctionId}:data`);
      return auction ? JSON.parse(auction) : null;
    } catch (error) {
      console.error('Error getting cached auction:', error);
      return null;
    }
  },

  // Clear auction cache
  async clearAuctionCache(auctionId) {
    try {
      await client.del(`auction:${auctionId}:highest_bid`);
      await client.del(`auction:${auctionId}:participants`);
      await client.del(`auction:${auctionId}:data`);
      return true;
    } catch (error) {
      console.error('Error clearing auction cache:', error);
      return false;
    }
  }
};

module.exports = client;
module.exports.redisUtils = redisUtils;

const express = require('express');
const { Op } = require('sequelize');
const { User, Auction, Bid, Notification } = require('../models');
const { authenticateAdmin } = require('../middleware/auth');
const { redisUtils } = require('../config/redis');

const router = express.Router();

// Apply admin authentication to all routes
router.use(authenticateAdmin);

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const stats = await Promise.all([
      User.count(),
      User.count({ where: { role: 'seller' } }),
      User.count({ where: { role: 'buyer' } }),
      Auction.count(),
      Auction.count({ where: { status: 'active' } }),
      Auction.count({ where: { status: 'ended' } }),
      Bid.count(),
      Auction.sum('winningBid', { where: { isTransactionComplete: true } })
    ]);

    const dashboard = {
      users: {
        total: stats[0] || 0,
        sellers: stats[1] || 0,
        buyers: stats[2] || 0
      },
      auctions: {
        total: stats[3] || 0,
        active: stats[4] || 0,
        ended: stats[5] || 0
      },
      bids: {
        total: stats[6] || 0
      },
      revenue: {
        total: parseFloat(stats[7]) || 0
      }
    };

    res.json({ dashboard });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all users with pagination
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    
    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (role) {
      whereClause.role = role;
    }

    const users = await User.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      users: users.rows,
      totalPages: Math.ceil(users.count / limit),
      currentPage: parseInt(page),
      totalItems: users.count
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Activate/Deactivate user
router.patch('/users/:id/toggle-status', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't allow deactivating admin users
    if (user.role === 'admin' && user.isActive) {
      return res.status(400).json({
        message: 'Cannot deactivate admin users'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all auctions with detailed info
router.get('/auctions', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const auctions = await Auction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'winner',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        },
        {
          model: Bid,
          as: 'bids',
          separate: true,
          limit: 1,
          order: [['amount', 'DESC']]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      auctions: auctions.rows,
      totalPages: Math.ceil(auctions.count / limit),
      currentPage: parseInt(page),
      totalItems: auctions.count
    });
  } catch (error) {
    console.error('Get admin auctions error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Force start/end auction
router.patch('/auctions/:id/force-status', async (req, res) => {
  try {
    const { status } = req.body;
    const auction = await Auction.findByPk(req.params.id);

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    if (!['active', 'ended', 'cancelled'].includes(status)) {
      return res.status(400).json({
        message: 'Invalid status. Must be active, ended, or cancelled'
      });
    }

    const oldStatus = auction.status;
    auction.status = status;

    // If ending auction, set end time to now
    if (status === 'ended') {
      auction.endTime = new Date();
    }

    await auction.save();

    // Clear Redis cache for this auction
    await redisUtils.clearAuctionCache(auction.id);

    res.json({
      message: `Auction status changed from ${oldStatus} to ${status}`,
      auction
    });
  } catch (error) {
    console.error('Force auction status error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get auction participants and bids
router.get('/auctions/:id/participants', async (req, res) => {
  try {
    const auctionId = req.params.id;
    
    // Get unique bidders for this auction
    const participants = await Bid.findAll({
      where: { auctionId },
      include: [
        {
          model: User,
          as: 'bidder',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        }
      ],
      attributes: ['bidderId', [Bid.sequelize.fn('MAX', Bid.sequelize.col('amount')), 'highestBid'], [Bid.sequelize.fn('COUNT', Bid.sequelize.col('id')), 'bidCount']],
      group: ['bidderId', 'bidder.id', 'bidder.username', 'bidder.firstName', 'bidder.lastName', 'bidder.email'],
      order: [[Bid.sequelize.fn('MAX', Bid.sequelize.col('amount')), 'DESC']]
    });

    // Get Redis participants for real-time info
    const redisParticipants = await redisUtils.getAuctionParticipants(auctionId);

    res.json({
      participants,
      activeParticipants: redisParticipants.length
    });
  } catch (error) {
    console.error('Get auction participants error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get recent activities
router.get('/activities', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Get recent bids
    const recentBids = await Bid.findAll({
      include: [
        {
          model: User,
          as: 'bidder',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: Auction,
          as: 'auction',
          attributes: ['id', 'title', 'status']
        }
      ],
      order: [['bidTime', 'DESC']],
      limit: parseInt(limit) / 2
    });

    // Get recent auctions
    const recentAuctions = await Auction.findAll({
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit) / 2
    });

    const activities = [];

    // Add bid activities
    recentBids.forEach(bid => {
      activities.push({
        type: 'bid',
        id: bid.id,
        timestamp: bid.bidTime,
        description: `${bid.bidder.firstName} ${bid.bidder.lastName} bid $${bid.amount} on "${bid.auction.title}"`,
        user: bid.bidder,
        auction: bid.auction,
        amount: bid.amount
      });
    });

    // Add auction activities
    recentAuctions.forEach(auction => {
      activities.push({
        type: 'auction',
        id: auction.id,
        timestamp: auction.createdAt,
        description: `${auction.seller.firstName} ${auction.seller.lastName} created auction "${auction.title}"`,
        user: auction.seller,
        auction: {
          id: auction.id,
          title: auction.title,
          status: auction.status
        },
        amount: auction.startingPrice
      });
    });

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      activities: activities.slice(0, parseInt(limit))
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Manually trigger auction status updates
router.post('/auctions/update-statuses', async (req, res) => {
  try {
    const now = new Date();
    let updatedCount = 0;

    // Update scheduled auctions to active
    const scheduledToActive = await Auction.update(
      { status: 'active' },
      {
        where: {
          status: 'scheduled',
          startTime: { [Op.lte]: now }
        }
      }
    );

    // Update active auctions to ended
    const activeToEnded = await Auction.update(
      { status: 'ended' },
      {
        where: {
          status: 'active',
          endTime: { [Op.lte]: now }
        }
      }
    );

    updatedCount = scheduledToActive[0] + activeToEnded[0];

    res.json({
      message: `Updated ${updatedCount} auction statuses`,
      scheduledToActive: scheduledToActive[0],
      activeToEnded: activeToEnded[0]
    });
  } catch (error) {
    console.error('Update auction statuses error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get system health
router.get('/health', async (req, res) => {
  try {
    const dbHealth = await User.findOne({ limit: 1 });
    const redisHealth = await redisUtils.getCachedAuction('health-check');
    
    res.json({
      status: 'healthy',
      database: dbHealth ? 'connected' : 'disconnected',
      redis: 'connected', // If we got here, Redis is working
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;

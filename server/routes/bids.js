const express = require('express');
const { Auction, Bid, User, Notification } = require('../models');
const { redisUtils } = require('../config/redis');
const { authenticateToken } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

// Apply bid rate limiter
router.use('/:auctionId/place', rateLimiter.bid);

// Get bids for an auction
router.get('/:auctionId', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const bids = await Bid.findAndCountAll({
      where: { auctionId: req.params.auctionId },
      include: [
        {
          model: User,
          as: 'bidder',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ],
      order: [['amount', 'DESC'], ['bidTime', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      bids: bids.rows,
      totalPages: Math.ceil(bids.count / limit),
      currentPage: parseInt(page),
      totalItems: bids.count
    });
  } catch (error) {
    console.error('Get bids error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Place a bid (requires authentication)
router.post('/:auctionId/place', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const auctionId = req.params.auctionId;
    const bidderId = req.user.id;

    // Validate bid amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        message: 'Valid bid amount is required'
      });
    }

    // Get auction details
    const auction = await Auction.findByPk(auctionId, {
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    // Check if auction is active
    const now = new Date();
    if (auction.status !== 'active' || auction.endTime <= now) {
      return res.status(400).json({
        message: 'Auction is not currently active'
      });
    }

    // Check if bidder is not the seller
    if (auction.sellerId === bidderId) {
      return res.status(400).json({
        message: 'Sellers cannot bid on their own auctions'
      });
    }

    // Get current highest bid from Redis
    const currentHighestBid = await redisUtils.getHighestBid(auctionId);
    const currentHighestAmount = currentHighestBid ? 
      parseFloat(currentHighestBid.amount) : 
      parseFloat(auction.startingPrice);

    // Validate bid amount against minimum required
    const minimumBid = currentHighestAmount + parseFloat(auction.bidIncrement);
    if (parseFloat(amount) < minimumBid) {
      return res.status(400).json({
        message: `Bid must be at least ₹${minimumBid.toFixed(2)}`
      });
    }

    // Create the bid in database
    const bid = await Bid.create({
      amount: parseFloat(amount),
      auctionId: parseInt(auctionId),
      bidderId: bidderId,
      bidTime: new Date()
    });

    // Load bid with bidder info
    const bidWithBidder = await Bid.findByPk(bid.id, {
      include: [
        {
          model: User,
          as: 'bidder',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    });

    // Update highest bid in Redis
    const bidData = {
      id: bid.id,
      amount: parseFloat(amount),
      bidderId: bidderId,
      bidder: {
        id: req.user.id,
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      },
      bidTime: bid.bidTime
    };

    await redisUtils.setHighestBid(auctionId, bidData);
    await redisUtils.addAuctionParticipant(auctionId, bidderId);

    // Update auction's current highest bid in database
    auction.currentHighestBid = parseFloat(amount);
    auction.winnerId = bidderId;
    auction.winningBid = parseFloat(amount);
    await auction.save();

    // Mark previous highest bids as not winning
    await Bid.update(
      { isWinning: false },
      { where: { auctionId: auctionId } }
    );

    // Mark current bid as winning
    await Bid.update(
      { isWinning: true },
      { where: { id: bid.id } }
    );

    // Create notifications
    try {
      // Notify seller of new bid
      await Notification.create({
        userId: auction.sellerId,
        auctionId: auctionId,
        type: 'new_bid',
        title: 'New Bid on Your Auction',
        message: `${req.user.firstName} ${req.user.lastName} placed a bid of ₹${amount} on "${auction.title}"`,
        data: {
          bidAmount: amount,
          bidderName: `${req.user.firstName} ${req.user.lastName}`,
          auctionTitle: auction.title
        }
      });

      // Notify previous highest bidder if they were outbid
      if (currentHighestBid && currentHighestBid.bidderId !== bidderId) {
        await Notification.create({
          userId: currentHighestBid.bidderId,
          auctionId: auctionId,
          type: 'outbid',
          title: 'You Have Been Outbid',
          message: `Your bid of $${currentHighestBid.amount} on "${auction.title}" has been outbid. New highest bid: $${amount}`,
          data: {
            previousBid: currentHighestBid.amount,
            newBid: amount,
            auctionTitle: auction.title
          }
        });
      }
    } catch (notificationError) {
      console.error('Error creating notifications:', notificationError);
      // Don't fail the bid if notifications fail
    }

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      console.log('🔔 Emitting newBid event to auction room:', `auction-${auctionId}`);
      
      const bidEvent = {
        id: bidWithBidder.id,
        amount: bidWithBidder.amount,
        auctionId: auctionId,
        bidTime: bidWithBidder.bidTime,
        bidder: bidWithBidder.bidder
      };
      
      // Emit to auction room
      io.to(`auction-${auctionId}`).emit('newBid', bidEvent);
      
      // Emit notification to seller
      io.to(`user-${auction.sellerId}`).emit('notification', {
        type: 'new_bid',
        title: 'New Bid on Your Auction',
        message: `${req.user.firstName} ${req.user.lastName} placed a bid of ₹${amount} on "${auction.title}"`,
        auctionId: auctionId
      });

      // Emit notification to previous highest bidder
      if (currentHighestBid && currentHighestBid.bidderId !== bidderId) {
        io.to(`user-${currentHighestBid.bidderId}`).emit('notification', {
          type: 'outbid',
          title: 'You Have Been Outbid',
          message: `Your bid of ₹${currentHighestBid.amount} on "${auction.title}" has been outbid. New highest bid: ₹${amount}`,
          auctionId: auctionId
        });
      }
      
      console.log('✅ Socket events emitted successfully');
    } else {
      console.warn('⚠️ Socket.IO instance not available');
    }

    res.status(201).json({
      message: 'Bid placed successfully',
      bid: bidWithBidder,
      isHighestBid: true,
      minimumNextBid: parseFloat(amount) + parseFloat(auction.bidIncrement)
    });

  } catch (error) {
    console.error('Place bid error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get user's bids (requires authentication)
router.get('/user/my-bids', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    
    let includeWhere = {};
    if (status) {
      includeWhere.status = status;
    }

    const bids = await Bid.findAll({
      where: { bidderId: req.user.id },
      include: [
        {
          model: Auction,
          as: 'auction',
          where: includeWhere,
          include: [
            {
              model: User,
              as: 'seller',
              attributes: ['id', 'username', 'firstName', 'lastName']
            }
          ]
        }
      ],
      order: [['bidTime', 'DESC']]
    });

    // Group bids by auction and get highest bid per auction
    const bidsByAuction = {};
    bids.forEach(bid => {
      const auctionId = bid.auctionId;
      if (!bidsByAuction[auctionId] || bid.amount > bidsByAuction[auctionId].amount) {
        bidsByAuction[auctionId] = bid;
      }
    });

    const userBids = Object.values(bidsByAuction);

    res.json({ bids: userBids });
  } catch (error) {
    console.error('Get user bids error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get bid history for user on specific auction (requires authentication)
router.get('/:auctionId/user-history', authenticateToken, async (req, res) => {
  try {
    const bids = await Bid.findAll({
      where: { 
        auctionId: req.params.auctionId,
        bidderId: req.user.id
      },
      order: [['bidTime', 'DESC']]
    });

    res.json({ bids });
  } catch (error) {
    console.error('Get user bid history error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;

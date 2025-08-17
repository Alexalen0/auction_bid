const express = require('express');
const { Op } = require('sequelize');
const { Auction, User, Bid } = require('../models');
const { authenticateToken, authenticateSeller } = require('../middleware/auth');
const { redisUtils } = require('../config/redis');

const router = express.Router();

// Debug route to list all auction IDs
router.get('/debug/list', async (req, res) => {
  try {
    const auctions = await Auction.findAll({
      attributes: ['id', 'title', 'status', 'createdAt']
    });
    
    console.log('📋 All auctions in database:');
    auctions.forEach(auction => {
      console.log(`  ID: ${auction.id}, Title: ${auction.title}, Status: ${auction.status}`);
    });
    
    res.json({ auctions });
  } catch (error) {
    console.error('Debug list error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all auctions (public)
router.get('/', async (req, res) => {
  try {
    console.log('🔄 Fetching all auctions...');
    const { status, page = 1, limit = 10, search } = req.query;
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
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'winner',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    console.log('✅ Found auctions:', auctions.rows.map(a => ({ id: a.id, title: a.title })));

    // Update auction statuses based on current time
    const now = new Date();
    for (const auction of auctions.rows) {
      let statusChanged = false;
      
      if (auction.status === 'scheduled' && auction.startTime <= now) {
        auction.status = 'active';
        statusChanged = true;
      } else if (auction.status === 'active' && auction.endTime <= now) {
        auction.status = 'ended';
        statusChanged = true;
      }
      
      if (statusChanged) {
        await auction.save();
      }
    }

    res.json({
      auctions: auctions.rows,
      totalPages: Math.ceil(auctions.count / limit),
      currentPage: parseInt(page),
      totalItems: auctions.count
    });
  } catch (error) {
    console.error('Get auctions error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get single auction
router.get('/:id', async (req, res) => {
  try {
    console.log('🔄 Fetching auction with ID:', req.params.id);
    
    const auction = await Auction.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'winner',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: Bid,
          as: 'bids',
          include: [
            {
              model: User,
              as: 'bidder',
              attributes: ['id', 'username', 'firstName', 'lastName']
            }
          ],
          order: [['amount', 'DESC']],
          limit: 10
        }
      ]
    });

    if (!auction) {
      console.log('❌ Auction not found with ID:', req.params.id);
      return res.status(404).json({ message: 'Auction not found' });
    }
    
    console.log('✅ Auction found:', { id: auction.id, title: auction.title, status: auction.status });

    // Update auction status if needed
    const now = new Date();
    let statusChanged = false;
    
    if (auction.status === 'scheduled' && auction.startTime <= now) {
      auction.status = 'active';
      statusChanged = true;
    } else if (auction.status === 'active' && auction.endTime <= now) {
      auction.status = 'ended';
      statusChanged = true;
    }
    
    if (statusChanged) {
      await auction.save();
    }

    // Get highest bid from Redis
    const highestBid = await redisUtils.getHighestBid(auction.id);
    if (highestBid) {
      auction.dataValues.currentHighestBid = highestBid.amount;
      auction.dataValues.highestBidder = highestBid.bidder;
    }

    res.json({ auction });
  } catch (error) {
    console.error('Get auction error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Create auction (sellers only)
router.post('/', authenticateToken, authenticateSeller, async (req, res) => {
  try {
    console.log('🔄 Creating auction with data:', req.body);
    console.log('🔄 User creating auction:', req.user.id, req.user.email);
    
    const {
      title,
      description,
      category,
      startingPrice,
      bidIncrement,
      startTime,
      endTime,
      imageUrl
    } = req.body;

    // Validate required fields
    if (!title || !description || !startingPrice || !bidIncrement || !startTime || !endTime) {
      console.log('❌ Missing required fields:', { title: !!title, description: !!description, startingPrice: !!startingPrice, bidIncrement: !!bidIncrement, startTime: !!startTime, endTime: !!endTime });
      return res.status(400).json({
        message: 'All required fields must be provided'
      });
    }

    // Validate times
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    // Allow start time up to 1 minute in the past for immediate start
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    if (start < oneMinuteAgo) {
      return res.status(400).json({
        message: 'Start time cannot be more than 1 minute in the past'
      });
    }

    if (end <= start) {
      return res.status(400).json({
        message: 'End time must be after start time'
      });
    }

    // Set status based on start time - be more permissive
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);
    const auctionStatus = start <= fiveMinutesFromNow ? 'active' : 'scheduled';

    console.log('🔄 Auction timing:', {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      now: now.toISOString(),
      status: auctionStatus
    });

    // Create auction
    const auction = await Auction.create({
      title,
      description,
      category: category || 'Other',
      startingPrice,
      bidIncrement,
      startTime: start,
      endTime: end,
      sellerId: req.user.id,
      status: auctionStatus,
      imageUrl
    });
    
    console.log('✅ Auction created successfully:', auction.id);

    // Load auction with seller info
    const createdAuction = await Auction.findByPk(auction.id, {
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    });

    res.status(201).json({
      message: 'Auction created successfully',
      auction: createdAuction
    });
  } catch (error) {
    console.error('Create auction error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update auction (seller only, before it starts)
router.put('/:id', authenticateToken, authenticateSeller, async (req, res) => {
  try {
    const auction = await Auction.findByPk(req.params.id);

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    // Check if user is the seller
    if (auction.sellerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this auction' });
    }

    // Check if auction can be updated
    if (auction.status !== 'draft' && auction.status !== 'scheduled') {
      return res.status(400).json({
        message: 'Cannot update auction that has already started'
      });
    }

    const {
      title,
      description,
      startingPrice,
      bidIncrement,
      startTime,
      endTime,
      imageUrl
    } = req.body;

    // Update fields if provided
    if (title) auction.title = title;
    if (description) auction.description = description;
    if (startingPrice) auction.startingPrice = startingPrice;
    if (bidIncrement) auction.bidIncrement = bidIncrement;
    if (imageUrl !== undefined) auction.imageUrl = imageUrl;
    
    if (startTime) {
      const start = new Date(startTime);
      if (start < new Date()) {
        return res.status(400).json({
          message: 'Start time must be in the future'
        });
      }
      auction.startTime = start;
    }
    
    if (endTime) {
      const end = new Date(endTime);
      if (end <= new Date(auction.startTime)) {
        return res.status(400).json({
          message: 'End time must be after start time'
        });
      }
      auction.endTime = end;
    }

    await auction.save();

    const updatedAuction = await Auction.findByPk(auction.id, {
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    });

    res.json({
      message: 'Auction updated successfully',
      auction: updatedAuction
    });
  } catch (error) {
    console.error('Update auction error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete auction (seller only, before it starts)
router.delete('/:id', authenticateToken, authenticateSeller, async (req, res) => {
  try {
    const auction = await Auction.findByPk(req.params.id);

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    // Check if user is the seller
    if (auction.sellerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this auction' });
    }

    // Check if auction can be deleted
    if (auction.status !== 'draft' && auction.status !== 'scheduled') {
      return res.status(400).json({
        message: 'Cannot delete auction that has already started'
      });
    }

    await auction.destroy();

    res.json({
      message: 'Auction deleted successfully'
    });
  } catch (error) {
    console.error('Delete auction error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Seller decision on highest bid
router.post('/:id/decision', authenticateToken, authenticateSeller, async (req, res) => {
  try {
    const { decision, counterOfferAmount } = req.body;
    const auction = await Auction.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'winner',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    // Check if user is the seller
    if (auction.sellerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to make decision on this auction' });
    }

    // Check if auction has ended
    if (auction.status !== 'ended') {
      return res.status(400).json({
        message: 'Can only make decisions on ended auctions'
      });
    }

    // Check if there's a winner
    if (!auction.winnerId) {
      return res.status(400).json({
        message: 'No bids to make decision on'
      });
    }

    // Validate decision
    if (!['accepted', 'rejected', 'counter_offered'].includes(decision)) {
      return res.status(400).json({
        message: 'Invalid decision. Must be accepted, rejected, or counter_offered'
      });
    }

    // Validate counter offer amount
    if (decision === 'counter_offered') {
      if (!counterOfferAmount || counterOfferAmount <= 0) {
        return res.status(400).json({
          message: 'Counter offer amount is required and must be positive'
        });
      }
      auction.counterOfferAmount = counterOfferAmount;
      auction.counterOfferStatus = 'pending';
    }

    auction.sellerDecision = decision;
    await auction.save();

    // TODO: Send notifications and emails based on decision
    // This will be implemented in the notification service

    res.json({
      message: `Auction decision recorded: ${decision}`,
      auction
    });
  } catch (error) {
    console.error('Seller decision error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Handle counter offer response
router.post('/:id/counter-offer-response', authenticateToken, async (req, res) => {
  try {
    const { response } = req.body; // 'accepted' or 'rejected'
    const auction = await Auction.findByPk(req.params.id);

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    // Check if user is the winner
    if (auction.winnerId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to respond to this counter offer' });
    }

    // Check if there's a pending counter offer
    if (auction.sellerDecision !== 'counter_offered' || auction.counterOfferStatus !== 'pending') {
      return res.status(400).json({
        message: 'No pending counter offer to respond to'
      });
    }

    // Validate response
    if (!['accepted', 'rejected'].includes(response)) {
      return res.status(400).json({
        message: 'Invalid response. Must be accepted or rejected'
      });
    }

    auction.counterOfferStatus = response;
    
    if (response === 'accepted') {
      auction.isTransactionComplete = true;
      auction.winningBid = auction.counterOfferAmount;
    }

    await auction.save();

    // TODO: Send notifications and emails based on response
    // This will be implemented in the notification service

    res.json({
      message: `Counter offer ${response}`,
      auction
    });
  } catch (error) {
    console.error('Counter offer response error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get user's auctions
router.get('/user/my-auctions', authenticateToken, async (req, res) => {
  try {
    const { status, type = 'selling' } = req.query; // type: 'selling' or 'bidding'
    
    let whereClause = {};
    if (status) whereClause.status = status;

    let auctions;
    
    if (type === 'selling') {
      whereClause.sellerId = req.user.id;
      auctions = await Auction.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'winner',
            attributes: ['id', 'username', 'firstName', 'lastName']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    } else {
      // Get auctions where user has placed bids
      auctions = await Auction.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'seller',
            attributes: ['id', 'username', 'firstName', 'lastName']
          },
          {
            model: Bid,
            as: 'bids',
            where: { bidderId: req.user.id },
            required: true,
            attributes: ['amount', 'bidTime'],
            order: [['amount', 'DESC']],
            limit: 1
          }
        ],
        order: [['createdAt', 'DESC']]
      });
    }

    res.json({ auctions });
  } catch (error) {
    console.error('Get user auctions error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;

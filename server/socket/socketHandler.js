const jwt = require('jsonwebtoken');
const { User, Auction, Notification } = require('../models');
const { redisUtils } = require('../config/redis');

const socketHandler = (io) => {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      console.log('🔌 Socket authentication attempt for token:', token ? token.substring(0, 20) + '...' : 'none');
      
      if (!token) {
        console.log('❌ No token provided for socket connection');
        return next(new Error('No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId);
      
      if (!user || !user.isActive) {
        console.log('❌ Invalid or inactive user for socket:', decoded.userId);
        return next(new Error('Invalid or inactive user'));
      }
      
      console.log('✅ Socket authenticated for user:', user.email);
      socket.user = user;
      next();
    } catch (error) {
      console.error('❌ Socket authentication error:', error.message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.id} (${socket.user.username}) connected`);

    // Join user to their personal room for notifications
    socket.join(`user-${socket.user.id}`);

    // Handle joining auction rooms
    socket.on('joinAuction', async (auctionId) => {
      try {
        // Validate auction exists and is active
        const auction = await Auction.findByPk(auctionId);
        
        if (!auction) {
          socket.emit('error', { message: 'Auction not found' });
          return;
        }

        // Join auction room
        socket.join(`auction-${auctionId}`);
        
        // Add user to Redis participants
        await redisUtils.addAuctionParticipant(auctionId, socket.user.id);
        
        // Send current auction state
        const highestBid = await redisUtils.getHighestBid(auctionId);
        const participants = await redisUtils.getAuctionParticipants(auctionId);
        
        socket.emit('auctionJoined', {
          auctionId,
          auction,
          highestBid,
          participantCount: participants.length
        });

        // Notify other participants of new joiner
        socket.to(`auction-${auctionId}`).emit('participantJoined', {
          user: {
            id: socket.user.id,
            username: socket.user.username,
            firstName: socket.user.firstName,
            lastName: socket.user.lastName
          },
          participantCount: participants.length
        });

        console.log(`User ${socket.user.username} joined auction ${auctionId}`);
      } catch (error) {
        console.error('Join auction error:', error);
        socket.emit('error', { message: 'Failed to join auction' });
      }
    });

    // Handle leaving auction rooms
    socket.on('leaveAuction', async (auctionId) => {
      try {
        socket.leave(`auction-${auctionId}`);
        
        // Update participant count
        const participants = await redisUtils.getAuctionParticipants(auctionId);
        
        socket.to(`auction-${auctionId}`).emit('participantLeft', {
          user: {
            id: socket.user.id,
            username: socket.user.username
          },
          participantCount: participants.length
        });

        console.log(`User ${socket.user.username} left auction ${auctionId}`);
      } catch (error) {
        console.error('Leave auction error:', error);
      }
    });

    // Handle real-time auction updates request
    socket.on('requestAuctionUpdate', async (auctionId) => {
      try {
        const auction = await Auction.findByPk(auctionId);
        const highestBid = await redisUtils.getHighestBid(auctionId);
        
        socket.emit('auctionUpdate', {
          auction,
          highestBid,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Auction update request error:', error);
        socket.emit('error', { message: 'Failed to get auction update' });
      }
    });

    // Handle notification read status
    socket.on('markNotificationRead', async (notificationId) => {
      try {
        const notification = await Notification.findOne({
          where: {
            id: notificationId,
            userId: socket.user.id
          }
        });

        if (notification) {
          notification.isRead = true;
          await notification.save();
          
          socket.emit('notificationMarkedRead', { notificationId });
        }
      } catch (error) {
        console.error('Mark notification read error:', error);
      }
    });

    // Handle getting unread notifications count
    socket.on('getUnreadNotificationsCount', async () => {
      try {
        const count = await Notification.count({
          where: {
            userId: socket.user.id,
            isRead: false
          }
        });

        socket.emit('unreadNotificationsCount', { count });
      } catch (error) {
        console.error('Get unread notifications count error:', error);
      }
    });

    // Handle getting notifications
    socket.on('getNotifications', async ({ page = 1, limit = 10 }) => {
      try {
        const offset = (page - 1) * limit;
        
        const notifications = await Notification.findAndCountAll({
          where: { userId: socket.user.id },
          include: [
            {
              model: Auction,
              as: 'auction',
              attributes: ['id', 'title', 'status']
            }
          ],
          order: [['createdAt', 'DESC']],
          limit: parseInt(limit),
          offset: parseInt(offset)
        });

        socket.emit('notifications', {
          notifications: notifications.rows,
          totalPages: Math.ceil(notifications.count / limit),
          currentPage: parseInt(page),
          totalItems: notifications.count
        });
      } catch (error) {
        console.error('Get notifications error:', error);
        socket.emit('error', { message: 'Failed to get notifications' });
      }
    });

    // Handle auction timer updates
    socket.on('subscribeToTimer', (auctionId) => {
      socket.join(`timer-${auctionId}`);
    });

    socket.on('unsubscribeFromTimer', (auctionId) => {
      socket.leave(`timer-${auctionId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.username} disconnected`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Set up timer for auction status updates
  setInterval(async () => {
    try {
      const now = new Date();
      
      // Find auctions that should change status
      const scheduledAuctions = await Auction.findAll({
        where: {
          status: 'scheduled',
          startTime: { [require('sequelize').Op.lte]: now }
        }
      });

      const activeAuctions = await Auction.findAll({
        where: {
          status: 'active',
          endTime: { [require('sequelize').Op.lte]: now }
        }
      });

      // Update scheduled auctions to active
      for (const auction of scheduledAuctions) {
        auction.status = 'active';
        await auction.save();
        
        // Emit auction started event
        io.to(`auction-${auction.id}`).emit('auctionStarted', {
          auctionId: auction.id,
          message: 'Auction has started!'
        });

        io.to(`timer-${auction.id}`).emit('auctionStatusChanged', {
          auctionId: auction.id,
          status: 'active',
          startTime: auction.startTime
        });
      }

      // Update active auctions to ended
      for (const auction of activeAuctions) {
        auction.status = 'ended';
        await auction.save();
        
        // Get final highest bid
        const highestBid = await redisUtils.getHighestBid(auction.id);
        
        // Emit auction ended event
        io.to(`auction-${auction.id}`).emit('auctionEnded', {
          auctionId: auction.id,
          message: 'Auction has ended!',
          highestBid: highestBid,
          winner: highestBid ? highestBid.bidder : null
        });

        io.to(`timer-${auction.id}`).emit('auctionStatusChanged', {
          auctionId: auction.id,
          status: 'ended',
          endTime: auction.endTime,
          highestBid: highestBid
        });

        // Create notifications for auction end
        if (highestBid) {
          // Notify winner
          await Notification.create({
            userId: highestBid.bidderId,
            auctionId: auction.id,
            type: 'auction_won',
            title: 'Auction Won!',
            message: `Congratulations! You won the auction "${auction.title}" with a bid of $${highestBid.amount}`,
            data: {
              auctionTitle: auction.title,
              winningBid: highestBid.amount
            }
          });

          // Notify seller
          await Notification.create({
            userId: auction.sellerId,
            auctionId: auction.id,
            type: 'auction_ended',
            title: 'Auction Ended',
            message: `Your auction "${auction.title}" has ended. Highest bid: $${highestBid.amount}`,
            data: {
              auctionTitle: auction.title,
              highestBid: highestBid.amount,
              winner: highestBid.bidder
            }
          });

          // Send real-time notifications
          io.to(`user-${highestBid.bidderId}`).emit('notification', {
            type: 'auction_won',
            title: 'Auction Won!',
            message: `Congratulations! You won the auction "${auction.title}" with a bid of $${highestBid.amount}`,
            auctionId: auction.id
          });

          io.to(`user-${auction.sellerId}`).emit('notification', {
            type: 'auction_ended',
            title: 'Auction Ended',
            message: `Your auction "${auction.title}" has ended. Highest bid: $${highestBid.amount}`,
            auctionId: auction.id
          });
        }
      }
    } catch (error) {
      console.error('Timer update error:', error);
    }
  }, 10000); // Check every 10 seconds

  return io;
};

module.exports = socketHandler;

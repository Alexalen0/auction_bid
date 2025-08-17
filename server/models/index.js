const User = require('./User');
const Auction = require('./Auction');
const Bid = require('./Bid');
const Notification = require('./Notification');

// Define associations
User.hasMany(Auction, { foreignKey: 'sellerId', as: 'sellerAuctions' });
User.hasMany(Auction, { foreignKey: 'winnerId', as: 'wonAuctions' });
User.hasMany(Bid, { foreignKey: 'bidderId', as: 'bids' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });

Auction.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });
Auction.belongsTo(User, { foreignKey: 'winnerId', as: 'winner' });
Auction.hasMany(Bid, { foreignKey: 'auctionId', as: 'bids' });
Auction.hasMany(Notification, { foreignKey: 'auctionId', as: 'notifications' });

Bid.belongsTo(User, { foreignKey: 'bidderId', as: 'bidder' });
Bid.belongsTo(Auction, { foreignKey: 'auctionId', as: 'auction' });

Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Notification.belongsTo(Auction, { foreignKey: 'auctionId', as: 'auction' });

module.exports = {
  User,
  Auction,
  Bid,
  Notification
};

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  auctionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Auctions',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM(
      'new_bid',
      'outbid',
      'auction_won',
      'auction_lost',
      'bid_accepted',
      'bid_rejected',
      'counter_offer',
      'counter_offer_accepted',
      'counter_offer_rejected',
      'auction_started',
      'auction_ended'
    ),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  data: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'isRead']
    },
    {
      fields: ['auctionId']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = Notification;

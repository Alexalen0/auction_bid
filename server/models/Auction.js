const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Auction = sequelize.define('Auction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Other'
  },
  startingPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  bidIncrement: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  currentHighestBid: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isAfter: function(value) {
        if (new Date(value) <= new Date(this.startTime)) {
          throw new Error('End time must be after start time');
        }
      }
    }
  },
  status: {
    type: DataTypes.ENUM('draft', 'scheduled', 'active', 'ended', 'cancelled'),
    allowNull: false,
    defaultValue: 'draft'
  },
  sellerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  winnerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  winningBid: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  sellerDecision: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'counter_offered'),
    defaultValue: 'pending'
  },
  counterOfferAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  counterOfferStatus: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    allowNull: true
  },
  isTransactionComplete: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  hooks: {
    beforeUpdate: (auction) => {
      // Auto-update status based on time
      const now = new Date();
      if (auction.startTime <= now && auction.endTime > now && auction.status === 'scheduled') {
        auction.status = 'active';
      } else if (auction.endTime <= now && auction.status === 'active') {
        auction.status = 'ended';
      }
    }
  }
});

module.exports = Auction;

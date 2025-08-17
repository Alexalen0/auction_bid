const express = require('express');
const { User } = require('../models');

const router = express.Router();

// Create demo users (for development only)
router.post('/create-demo-users', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Demo users can only be created in development' });
    }

    console.log('🔄 Creating demo users...');

    // Create demo buyer1
    const [buyer1] = await User.findOrCreate({
      where: { email: 'buyer@test.com' },
      defaults: {
        username: 'testbuyer',
        email: 'buyer@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Buyer',
        role: 'buyer',
        isActive: true
      }
    });

    // Create demo buyer2
    const [buyer2] = await User.findOrCreate({
      where: { email: 'buyer2@test.com' },
      defaults: {
        username: 'testbuyer2',
        email: 'buyer2@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Buyer2',
        role: 'buyer',
        isActive: true
      }
    });

    // Create demo seller
    const [seller] = await User.findOrCreate({
      where: { email: 'seller@test.com' },
      defaults: {
        username: 'testseller',
        email: 'seller@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Seller',
        role: 'seller',
        isActive: true
      }
    });

    console.log('✅ Demo users setup complete!');

    res.json({
      message: 'Demo users created successfully',
      users: {
        buyer1: { email: 'buyer@test.com' },
        buyer2: { email: 'buyer2@test.com' },
        seller: { email: 'seller@test.com' }
      },
      credentials: [
        'Seller: seller@test.com / password123',
        'Buyer1: buyer@test.com / password123',
        'Buyer2: buyer2@test.com / password123'
      ]
    });
  } catch (error) {
    console.error('❌ Error creating demo users:', error);
    res.status(500).json({
      message: 'Failed to create demo users',
      error: error.message
    });
  }
});

module.exports = router;

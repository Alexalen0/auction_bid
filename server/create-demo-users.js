const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🔍 Environment check:');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Import database and models
const { sequelize } = require('./config/database');
const { User } = require('./models');

async function createDemoUsers() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    console.log('🔄 Creating demo users...');

    // Create demo buyer
    const [buyer, buyerCreated] = await User.findOrCreate({
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

    // Create demo seller
    const [seller, sellerCreated] = await User.findOrCreate({
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

    // Create demo admin
    const [admin, adminCreated] = await User.findOrCreate({
      where: { email: 'admin@test.com' },
      defaults: {
        username: 'testadmin',
        email: 'admin@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'admin',
        isActive: true
      }
    });

    console.log('✅ Demo users created successfully!');
    console.log('📧 Login credentials:');
    console.log('  Buyer: buyer@test.com / password123', buyerCreated ? '(NEW)' : '(EXISTS)');
    console.log('  Seller: seller@test.com / password123', sellerCreated ? '(NEW)' : '(EXISTS)');
    console.log('  Admin: admin@test.com / password123', adminCreated ? '(NEW)' : '(EXISTS)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating demo users:', error);
    process.exit(1);
  }
}

createDemoUsers();

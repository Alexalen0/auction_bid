const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { User } = require('./models');

async function checkAndCreateUsers() {
  try {
    console.log('🔍 Checking existing users...');
    
    const allUsers = await User.findAll({ 
      attributes: ['id', 'email', 'username', 'role', 'firstName', 'lastName'] 
    });
    
    console.log('📋 Current users in database:');
    allUsers.forEach(user => {
      console.log(`  ID: ${user.id} | Email: ${user.email} | Role: ${user.role} | Name: ${user.firstName} ${user.lastName}`);
    });
    
    console.log('\n🔄 Creating/updating demo users...');
    
    // Create or update demo users with explicit roles
    const [buyer] = await User.findOrCreate({
      where: { email: 'buyer@test.com' },
      defaults: {
        username: 'demobuyer',
        email: 'buyer@test.com',
        password: 'password123',
        firstName: 'Demo',
        lastName: 'Buyer',
        role: 'buyer',
        isActive: true
      }
    });
    
    const [seller] = await User.findOrCreate({
      where: { email: 'seller@test.com' },
      defaults: {
        username: 'demoseller',
        email: 'seller@test.com',
        password: 'password123',
        firstName: 'Demo',
        lastName: 'Seller',
        role: 'seller',
        isActive: true
      }
    });
    
    const [admin] = await User.findOrCreate({
      where: { email: 'admin@test.com' },
      defaults: {
        username: 'demoadmin',
        email: 'admin@test.com',
        password: 'password123',
        firstName: 'Demo',
        lastName: 'Admin',
        role: 'admin',
        isActive: true
      }
    });
    
    // Force update roles if they exist but have wrong role
    await User.update({ role: 'buyer' }, { where: { email: 'buyer@test.com' } });
    await User.update({ role: 'seller' }, { where: { email: 'seller@test.com' } });
    await User.update({ role: 'admin' }, { where: { email: 'admin@test.com' } });
    
    console.log('\n✅ Demo users created/updated successfully!');
    console.log('📧 Test accounts:');
    console.log('🛒 BUYER:  buyer@test.com  / password123');
    console.log('🏪 SELLER: seller@test.com / password123');  
    console.log('👑 ADMIN:  admin@test.com  / password123');
    
    console.log('\n📋 Final user list:');
    const finalUsers = await User.findAll({ 
      attributes: ['id', 'email', 'username', 'role', 'firstName', 'lastName'] 
    });
    finalUsers.forEach(user => {
      console.log(`  ID: ${user.id} | Email: ${user.email} | Role: ${user.role} | Name: ${user.firstName} ${user.lastName}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAndCreateUsers();

import apiService from '../services/apiService';

export const createDemoUsers = async () => {
  const demoUsers = [
    {
      username: 'testseller',
      email: 'seller@test.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Seller',
      role: 'seller'
    },
    {
      username: 'testbuyer',
      email: 'buyer@test.com', 
      password: 'password123',
      firstName: 'Test',
      lastName: 'Buyer',
      role: 'buyer'
    },
    {
      username: 'testbuyer2',
      email: 'buyer2@test.com', 
      password: 'password123',
      firstName: 'Test',
      lastName: 'Buyer2',
      role: 'buyer'
    }
  ];

  console.log('🔄 Creating demo users...');
  
  for (const user of demoUsers) {
    try {
      await apiService.auth.register(user);
      console.log(`✅ Created ${user.role}: ${user.email}`);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        console.log(`ℹ️  User already exists: ${user.email}`);
      } else {
        console.error(`❌ Failed to create ${user.email}:`, error.response?.data?.message);
      }
    }
  }
  
  console.log('✅ Demo user creation completed!');
  console.log('📧 Available test accounts:');
  console.log('  Seller: seller@test.com / password123');
  console.log('  Buyer1: buyer@test.com / password123');
  console.log('  Buyer2: buyer2@test.com / password123');
};

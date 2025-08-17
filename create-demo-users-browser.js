// Quick Demo User Creator
// Use this in browser console on http://localhost:3001

async function createDemoUsers() {
  const users = [
    {
      username: 'testbuyer',
      email: 'buyer@test.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Buyer',
      role: 'buyer'
    },
    {
      username: 'testseller', 
      email: 'seller@test.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Seller',
      role: 'seller'
    },
    {
      username: 'testadmin',
      email: 'admin@test.com', 
      password: 'password123',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'admin'
    }
  ];

  for (const user of users) {
    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(user)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ Created user: ${user.email} (${user.role})`);
      } else {
        console.log(`⚠️ User ${user.email} might already exist:`, result.message);
      }
    } catch (error) {
      console.error(`❌ Error creating ${user.email}:`, error);
    }
  }
  
  console.log('🎉 Demo user creation complete!');
  console.log('📧 Login credentials:');
  console.log('  Buyer: buyer@test.com / password123');
  console.log('  Seller: seller@test.com / password123');
  console.log('  Admin: admin@test.com / password123');
}

// Run the function
createDemoUsers();

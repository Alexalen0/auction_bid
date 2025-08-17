@echo off
echo 🌱 Creating demo accounts for auction platform...
echo.

cd /d "d:\Assignment\auction_bid"

echo Running seed script...
npm run seed

echo.
echo ✅ Demo accounts created! You can now use:
echo.
echo 👨‍💼 Admin: admin@test.com / password123
echo 💼 Seller: seller@test.com / password123  
echo 🛍️ Buyer: buyer@test.com / password123
echo.
echo 🎯 Try logging in with these accounts!
echo.
pause

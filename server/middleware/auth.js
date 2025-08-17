const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    console.log('🔄 Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded:', { userId: decoded.userId, email: decoded.email });
    
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      console.log('❌ User not found:', decoded.userId);
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (!user.isActive) {
      console.log('❌ User inactive:', decoded.userId);
      return res.status(401).json({ message: 'User account is inactive' });
    }
    
    console.log('✅ User authenticated:', { id: user.id, email: user.email, role: user.role });
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Token verification error:', error.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

const authenticateAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const authenticateSeller = async (req, res, next) => {
  if (!req.user || (req.user.role !== 'seller' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Seller access required' });
  }
  next();
};

module.exports = {
  authenticateToken,
  authenticateAdmin,
  authenticateSeller
};

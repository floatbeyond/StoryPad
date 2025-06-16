import jwt from 'jsonwebtoken';

export const SECRET_KEY = process.env.JWT_SECRET;

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      console.log('❌ JWT verification failed:', err.message);
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
    
    // Debug: Log the RAW token payload
    console.log('🔍 RAW JWT payload:', user);
    console.log('🔍 User ID length:', user.id?.length);
    console.log('🔍 User ID characters:', user.id?.split(''));
    
    req.user = user;
    next();
  });
};
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bodhichitta-secret-key-change-in-production';

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

const requireAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: { message: 'Authentication required' } });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
};

const requireAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: { message: 'Authentication required' } });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded.is_admin) {
      return res.status(403).json({ error: { message: 'Admin access required' } });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
};

module.exports = { auth, requireAuth, requireAdmin, JWT_SECRET };

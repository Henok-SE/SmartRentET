const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No token provided.'
      });
    }

    const secret = process.env.JWT_SECRET || 'smartrent_fallback_secret';
    const decoded = jwt.verify(token, secret);

    // ✅ Check if session exists and is valid
    const session = await prisma.session.findFirst({
      where: {
        sessionId: decoded.sessionId,
        userId: decoded.userId,
        revoked: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Session expired or invalid. Please login again.'
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { userId: decoded.userId },
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        username: true,
        phone: true,
        role: true,
        isActive: true,
        isNationalIdVerified: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is disabled. Please contact administrator.'
      });
    }

    // Attach user and session to request
    req.user = {
      ...user,
      sessionId: session.sessionId
    };
    req.session = session;
    req.token = token;

    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired. Please login again.'
      });
    }

    console.error('Auth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during authentication'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const secret = process.env.JWT_SECRET || 'smartrent_fallback_secret';
      const decoded = jwt.verify(token, secret);
      
      const user = await prisma.user.findUnique({
        where: { userId: decoded.userId },
        select: {
          userId: true,
          firstName: true,
          lastName: true,
          username: true,
          role: true,
          isActive: true
        }
      });

      if (user && user.isActive) {
        req.user = user;
      }
    }
    next();
  } catch {
    next();
  }
};

module.exports = { authenticateToken, optionalAuth };
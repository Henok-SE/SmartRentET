const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

// ============================================
// JWT SECRET HELPER
// ============================================

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set. Refusing to sign or verify tokens without it.');
  }
  return secret;
};

// ============================================
// AUTHENTICATE (Required)
// ============================================

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required: No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);

    // Check session exists and is valid
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
        message: 'Session expired or invalid. Please login again.'
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
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is disabled. Please contact administrator.'
      });
    }

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
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }

    console.error('Auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

// ============================================
// AUTHENTICATE TOKEN (Alias for authenticate)
// ============================================

// This is an alias for backward compatibility
const authenticateToken = authenticate;

// ============================================
// OPTIONAL AUTH
// ============================================

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const secret = getJwtSecret();
      const decoded = jwt.verify(token, secret);

      const session = await prisma.session.findFirst({
        where: {
          sessionId: decoded.sessionId,
          userId: decoded.userId,
          revoked: false,
          expiresAt: { gt: new Date() }
        }
      });

      if (session) {
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
          req.user = { ...user, sessionId: session.sessionId };
          req.session = session;
        }
      }
    }
    next();
  } catch {
    next();
  }
};

// ============================================
// EXPORT
// ============================================

module.exports = {
  authenticate,
  authenticateToken, // Alias for backward compatibility
  optionalAuth
};
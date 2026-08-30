const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/db');
const jwt = require('jsonwebtoken');

const createSession = async (userId, userData) => {
  const sessionId = uuidv4();
  const secret = process.env.JWT_SECRET || 'smartrent_fallback_secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  const expiresAt = new Date();
  const days = parseInt(expiresIn) || 7;
  expiresAt.setDate(expiresAt.getDate() + days);

  const token = jwt.sign(
    {
      userId: userId,
      username: userData.username,
      role: userData.role,
      sessionId: sessionId
    },
    secret,
    { expiresIn }
  );

  // Revoke all existing sessions for this user
  await prisma.session.updateMany({
    where: { userId: userId, revoked: false },
    data: { revoked: true }
  });

  const session = await prisma.session.create({
    data: {
      sessionId: sessionId,
      userId: userId,
      token: token,
      expiresAt: expiresAt,
      revoked: false
    }
  });

  return { session, token };
};

// used in setAccountStatus when deactivating users
const revokeAllSessions = async (userId) => {
  return prisma.session.updateMany({
    where: { userId: userId, revoked: false },
    data: { revoked: true }
  });
};

const revokeSession = async (sessionId) => {
  return prisma.session.update({
    where: { sessionId: sessionId },
    data: { revoked: true }
  });
};

const getActiveSessions = async (userId) => {
  return prisma.session.findMany({
    where: {
      userId: userId,
      revoked: false,
      expiresAt: { gt: new Date() }
    },
    select: {
      sessionId: true,
      expiresAt: true,
      createdAt: true
    }
  });
};

const cleanupExpiredSessions = async () => {
  return prisma.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { revoked: true }
      ]
    }
  });
};

module.exports = {
  createSession,
  revokeSession, 
  revokeAllSessions,
  getActiveSessions,
  cleanupExpiredSessions
};
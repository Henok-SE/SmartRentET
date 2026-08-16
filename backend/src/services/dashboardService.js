const prisma = require('../config/db');

const getSummary = async () => {
  const [totalAgreements, activeAgreements, pendingVerification] =
    await Promise.all([
      prisma.rentalAgreement.count(),
      prisma.rentalAgreement.count({
        where: { status: 'ACTIVE' },
      }),
      prisma.rentalAgreement.count({
        where: { status: 'PENDING_VERIFICATION' },
      }),
    ]);

  return {
    totalAgreements,
    activeAgreements,
    pendingVerification,
    flaggedContracts: 0,
  };
};

const getSuperAdmins = async () => {
  return prisma.superAdmin.findMany({
    select: {
      superAdminId: true,
      createdAt: true,
      user: {
        select: {
          userId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          username: true,
          role: true,
          isActive: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

module.exports = {
  getSummary,
  getSuperAdmins,
};
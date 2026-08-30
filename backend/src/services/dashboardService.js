const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const { generateSecurePassword, userDTO, officeDTO } = require('../utils/userUtils');
const afroSMSService = require('./afroSMSService');

// ============================================
// GET SUMMARY
// ============================================

const getSummary = async () => {
  const [
    totalAgreements,
    activeAgreements,
    pendingAgreements,
    totalLandlords,
    totalTenants,
    totalOfficers,
    totalOffices,
    totalPayments,
    collectedPayments,
    overduePayments,
    pendingVerifications,
    totalSuperAdmins,
    activeSuperAdmins,
    totalOfficeAdmins,
    activeOfficeAdmins,
  ] = await Promise.all([
    prisma.rentalAgreement.count(),
    prisma.rentalAgreement.count({ where: { status: 'ACTIVE' } }),
    prisma.rentalAgreement.count({ where: { status: 'PENDING_VERIFICATION' } }),
    prisma.landlord.count(),
    prisma.tenant.count(),
    prisma.officer.count(),
    prisma.governmentOffice.count(),
    prisma.payment.count(),
    prisma.payment.count({ where: { status: 'PAID' } }),
    prisma.payment.count({ where: { status: 'OVERDUE' } }),
    prisma.agreementVerification.count({ where: { status: 'PENDING' } }),
    prisma.superAdmin.count(),
    prisma.superAdmin.count({ where: { user: { isActive: true } } }),
    prisma.officeAdmin.count(),
    prisma.officeAdmin.count({ where: { user: { isActive: true } } })
  ]);

  return {
    totalAgreements,
    activeAgreements,
    pendingAgreements,
    totalLandlords,
    totalTenants,
    totalOfficers,
    totalOffices,
    totalPayments,
    collectedPayments,
    overduePayments,
    pendingVerifications,
    totalSuperAdmins,
    activeSuperAdmins,
    totalOfficeAdmins,
    activeOfficeAdmins,
  };
};

// ============================================
// GET SUPER ADMINS
// ============================================

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

// ============================================
// GET CONTRACTS (Rental Agreements)
// ============================================

const getContracts = async ({
  referenceNumber,
  status,
  subCity,
  landlord,
  tenant,
} = {}) => {
  return prisma.rentalAgreement.findMany({
    where: {
      ...(referenceNumber
        ? {
            referenceNumber: {
              contains: referenceNumber,
              mode: 'insensitive',
            },
          }
        : {}),

      ...(status ? { status } : {}),

      ...(subCity ? { unit: { property: { subCity } } } : {}),

      ...(landlord
        ? {
            landlord: {
              user: {
                OR: [
                  { firstName: { contains: landlord, mode: 'insensitive' } },
                  { lastName: { contains: landlord, mode: 'insensitive' } },
                ],
              },
            },
          }
        : {}),

      ...(tenant
        ? {
            tenant: {
              user: {
                OR: [
                  { firstName: { contains: tenant, mode: 'insensitive' } },
                  { lastName: { contains: tenant, mode: 'insensitive' } },
                ],
              },
            },
          }
        : {}),
    },

    select: {
      agreementId: true,
      referenceNumber: true,
      status: true,
      durationValue: true,
      durationUnit: true,
      rentalAmount: true,
      effectiveDate: true,
      terminationDate: true,
      createdAt: true,

      landlord: {
        select: {
          landlordId: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      },

      tenant: {
        select: {
          tenantId: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      },

      unit: {
        select: {
          unitId: true,
          unitNumber: true,
          property: {
            select: {
              location: true,
              subCity: true,
              woreda: true,
            },
          },
        },
      },

      office: {
        select: {
          officeId: true,
          officeCode: true,
          officeName: true,
        },
      },

      createdByOfficer: {
        select: {
          officerId: true,
          employeeId: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },

      serviceFeePayment: {
        select: {
          serviceFeePaymentId: true,
          status: true,
        },
      },

      payments: {
        select: {
          paymentId: true,
          amount: true,
          status: true,
          dueDate: true,
          paidDate: true,
        },
        orderBy: {
          dueDate: 'desc',
        },
        take: 3,
      },
    },

    orderBy: {
      createdAt: 'desc',
    },
  });
};

const getAuditLogs = async ({ action, userId, startDate, endDate, user } = {}) => {
  let officeId = null;

  // If the requester is an OFFICE_ADMIN, scope logs to their office
  if (user && user.role === 'OFFICE_ADMIN') {
    const admin = await prisma.officeAdmin.findUnique({
      where: { userId: user.userId },
      select: { officeId: true },
    });
    officeId = admin?.officeId;
  }

  return prisma.auditLog.findMany({
    where: {
      ...(action ? { action } : {}),
      ...(userId ? { userId } : {}), 
      ...(startDate ? { createdAt: { gte: new Date(startDate) } } : {}),
      ...(endDate ? { createdAt: { lte: new Date(endDate) } } : {}),
      // Scoping for Office Admin: only see logs from users in their office
      ...(officeId ? {
        user: {
          OR: [
            { officeAdmin: { officeId } },
            { officer: { officeId } }
          ]
        }
      } : {}),
    },
    select: {
      auditId: true,
      action: true,
      entityType: true,
      entityId: true,
      description: true,
      ipAddress: true,
      createdAt: true,

      user: {
        select: {
          userId: true,
          firstName: true,
          lastName: true,
          username: true,
        },
      },
    },

    orderBy: {
      createdAt: 'desc',
    },
  });
};

// ============================================
// GET REPORTS
// ============================================

const getReports = async ({ subCity, startDate, endDate } = {}) => {
  const where = {
    ...(subCity ? { unit: { property: { subCity } } } : {}),
  };

  const agreementWhere = {
    ...where,
    ...(startDate ? { effectiveDate: { gte: new Date(startDate) } } : {}),
    ...(endDate ? { effectiveDate: { lte: new Date(endDate) } } : {}),
  };

  const [
    totalRegisteredAgreements,
    activeAgreements,
    endedAgreements,
    verifiedRentalIncome,
    collectedIncome,
    pendingPayments,
    paidPayments,
    overduePayments,
  ] = await Promise.all([
    prisma.rentalAgreement.count({ where: agreementWhere }),

    prisma.rentalAgreement.count({
      where: { ...agreementWhere, status: 'ACTIVE' },
    }),

    prisma.rentalAgreement.count({
      where: {
        ...agreementWhere,
        OR: [
          { status: 'TERMINATED' },
          { status: 'EXPIRED' },
          { status: 'REJECTED' },
        ],
      },
    }),

    prisma.rentalAgreement.aggregate({
      where: agreementWhere,
      _sum: {
        rentalAmount: true,
      },
    }),

    prisma.payment.aggregate({
      where: { status: 'PAID', agreement: where },
      _sum: {
        amount: true,
      },
    }),

    prisma.payment.count({ where: { status: 'PENDING', agreement: where } }),
    prisma.payment.count({ where: { status: 'PAID', agreement: where } }),
    prisma.payment.count({ where: { status: 'OVERDUE', agreement: where } }),
  ]);

  const totalPayments = paidPayments + pendingPayments + overduePayments;
  const paymentComplianceRate =
    totalPayments > 0 ? Math.round((paidPayments / totalPayments) * 100) : 0;

  return {
    totalRegisteredAgreements,
    activeAgreements,
    endedAgreements,
    paymentComplianceRate,
    verifiedRentalIncome: Number(verifiedRentalIncome._sum.rentalAmount ?? 0),
    collectedIncome: Number(collectedIncome._sum.amount ?? 0),
    pendingPayments,
    paidPayments,
    overduePayments,
  };
};

// ============================================
// GET NOTIFICATIONS
// ============================================

const getNotifications = async ({ userId, isRead } = {}) => {
  if (!userId) {
    return [];
  }

  const numericUserId = parseInt(userId, 10);

  const user = await prisma.user.findUnique({
    where: { userId: numericUserId },
    select: {
      landlord: { select: { landlordId: true } },
      tenant: { select: { tenantId: true } },
    },
  });

  if (!user) {
    return [];
  }

  const notifications = [];

  const agreementIds = (
    await prisma.rentalAgreement.findMany({
      where: {
        OR: [
          ...(user.landlord ? [{ landlordId: user.landlord.landlordId }] : []),
          ...(user.tenant ? [{ tenantId: user.tenant.tenantId }] : []),
        ],
      },
      select: {
        agreementId: true,
        referenceNumber: true,
      },
    })
  ).map((agreement) => agreement.agreementId);

  // 1. Pending verifications
  const pendingVerifications = await prisma.agreementVerification.findMany({
    where: {
      agreementId: { in: agreementIds },
      status: 'PENDING',
    },
    select: {
      verificationId: true,
      agreementId: true,
      party: true,
      sentAt: true,
      expiresAt: true,
      agreement: {
        select: {
          referenceNumber: true,
        },
      },
    },
  });

  for (const verification of pendingVerifications) {
    notifications.push({
      notificationId: `VER-${verification.verificationId}`,
      type: 'VERIFICATION',
      title: 'SMS verification pending',
      message: `Agreement ${verification.agreement.referenceNumber} is awaiting ${verification.party.toLowerCase()} SMS verification.`,
      isRead: false,
      createdAt: verification.sentAt,
    });
  }

  // 2. Pending service fees
  const pendingFees = await prisma.serviceFeePayment.findMany({
    where: {
      agreementId: { in: agreementIds },
      status: 'PENDING',
    },
    select: {
      serviceFeePaymentId: true,
      agreementId: true,
      amount: true,
      createdAt: true,
      agreement: {
        select: {
          referenceNumber: true,
        },
      },
    },
  });

  for (const fee of pendingFees) {
    notifications.push({
      notificationId: `FEE-${fee.serviceFeePaymentId}`,
      type: 'SERVICE_FEE',
      title: 'Service fee payment pending',
      message: `Agreement ${fee.agreement.referenceNumber} has an unpaid service fee of ${fee.amount} ETB.`,
      isRead: false,
      createdAt: fee.createdAt,
    });
  }

  // 3. Overdue payments
  const overduePayments = await prisma.payment.findMany({
    where: {
      agreementId: { in: agreementIds },
      status: 'OVERDUE',
    },
    select: {
      paymentId: true,
      agreementId: true,
      amount: true,
      dueDate: true,
      agreement: {
        select: {
          referenceNumber: true,
        },
      },
    },
  });

  for (const payment of overduePayments) {
    notifications.push({
      notificationId: `PAY-${payment.paymentId}`,
      type: 'OVERDUE_PAYMENT',
      title: 'Overdue rent payment',
      message: `Agreement ${payment.agreement.referenceNumber} has an overdue rent payment of ${payment.amount} ETB (was due ${payment.dueDate.toISOString().slice(0, 10)}).`,
      isRead: false,
      createdAt: payment.dueDate,
    });
  }

  notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (isRead !== undefined) {
    return notifications.filter((n) => n.isRead === (isRead === 'true'));
  }

  return notifications;
};

const getOfficers = async ({ subCity, isActive, user } = {}) => {
  let officeId = null;

  // If the requester is an OFFICE_ADMIN, scope officers to their office
  if (user && user.role === 'OFFICE_ADMIN') {
    const admin = await prisma.officeAdmin.findUnique({
      where: { userId: user.userId },
      select: { officeId: true },
    });
    officeId = admin?.officeId;
  }

  return prisma.officer.findMany({
    where: {
      ...(officeId ? { officeId } : {}), // Enforce office scoping
      ...(subCity
        ? {
            office: {
              subCity,
            },
          }
        : {}),

      ...(isActive !== undefined
        ? {
            user: {
              isActive: isActive === 'true',
            },
          }
        : {}),
    },

    select: {
      officerId: true,
      employeeId: true,
      position: true,
      assignedArea: true,
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

      office: {
        select: {
          officeId: true,
          officeCode: true,
          officeName: true,
          subCity: true,
          woreda: true,
        },
      },
    },

    orderBy: {
      createdAt: 'desc',
    },
  });
};

// ============================================
// GET OFFICE ADMINS
// ============================================

const getOfficeAdmins = async ({ officeId, subCity, isActive, officeCode } = {}) => {
  return prisma.officeAdmin.findMany({
    where: {
      ...(officeId
        ? { officeId }
        : {}),

      ...(officeCode
        ? {
            office: {
              OR: [
                { officeCode: { contains: officeCode, mode: 'insensitive' } },
                { officeName: { contains: officeCode, mode: 'insensitive' } },
              ],
            },
          }
        : {}),

      ...(subCity
        ? {
            office: {
              subCity,
            },
          }
        : {}),

      ...(isActive !== undefined
        ? {
            user: {
              isActive: isActive === 'true',
            },
          }
        : {}),
    },

    select: {
      officeAdminId: true,
      employeeId: true,
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

      office: {
        select: {
          officeId: true,
          officeCode: true,
          officeName: true,
          region: true,
          city: true,
          subCity: true,
          woreda: true,
          status: true,
        },
      },
    },

    orderBy: {
      createdAt: 'desc',
    },
  });
};

// ============================================
// GET OFFICE SUMMARY
// ============================================

const getOfficeSummary = async ({ officeId, subCity } = {}) => {
  const officeWhere = {
    ...(officeId ? { officeId } : {}),
    ...(subCity ? { office: { subCity } } : {}),
  };

  const agreementWhere = {
    ...(officeId ? { officeId } : {}),
    ...(subCity ? { office: { subCity } } : {}),
  };

  const [
    totalOfficers,
    activeOfficers,
    totalAgreements,
    activeAgreements,
    pendingAgreements,
    pendingPayments,
    overduePayments,
    totalOfficeAdmins,
    totalOffices,
  ] = await Promise.all([
    prisma.officer.count({ where: officeWhere }),
    prisma.officer.count({
      where: { ...officeWhere, user: { isActive: true } },
    }),
    prisma.rentalAgreement.count({ where: agreementWhere }),
    prisma.rentalAgreement.count({
      where: { ...agreementWhere, status: 'ACTIVE' },
    }),
    prisma.rentalAgreement.count({
      where: { ...agreementWhere, status: 'PENDING_VERIFICATION' },
    }),
    prisma.payment.count({
      where: { agreement: agreementWhere, status: 'PENDING' },
    }),
    prisma.payment.count({
      where: { agreement: agreementWhere, status: 'OVERDUE' },
    }),
    prisma.officeAdmin.count(),
    prisma.governmentOffice.count(),
  ]);

  return {
    totalOfficers,
    activeOfficers,
    totalAgreements,
    activeAgreements,
    pendingAgreements,
    pendingPayments,
    overduePayments,
    totalOfficeAdmins,
    totalOffices,
  };
};

// ============================================
// GET OFFICES
// ============================================

const getOffices = async ({ status, subCity, city } = {}) => {
  const offices = await prisma.governmentOffice.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(subCity ? { subCity } : {}),
      ...(city ? { city } : {}),
    },

    select: {
      officeId: true,
      officeCode: true,
      officeName: true,
      region: true,
      city: true,
      subCity: true,
      woreda: true,
      address: true,
      status: true,
      createdAt: true,

      _count: {
        select: {
          officeAdmins: true,
          officers: true,
          agreements: true,
        },
      },
    },

    orderBy: {
      createdAt: 'desc',
    },
  });

  return offices.map(officeDTO);
};

// ============================================
// CREATE OFFICE
// ============================================

const createOffice = async ({ officeName, officeCode, region, city, subCity, woreda, address }) => {
  const existing = await prisma.governmentOffice.findUnique({
    where: { officeCode },
  });

  if (existing) {
    throw Object.assign(new Error('Office code already exists'), { code: 'OFFICE_CODE_EXISTS' });
  }

  const office = await prisma.governmentOffice.create({
    data: {
      officeName,
      officeCode,
      region: region ?? null,
      city: city ?? null,
      subCity: subCity ?? null,
      woreda: woreda ?? null,
      address: address ?? null,
    },
  });

  return officeDTO(office);
};

// ============================================
// CREATE OFFICE ADMIN - Auto-generate password only
// ============================================

const createOfficeAdmin = async ({
  firstName,
  lastName,
  username,
  phone,
  nationalId,
  employeeId,
  email,
  officeId,
  password, // This will be ignored - auto-generated
}) => {
  const office = await prisma.governmentOffice.findUnique({
    where: { officeId },
  });

  if (!office) {
    throw Object.assign(new Error('Government office not found'), { code: 'OFFICE_NOT_FOUND' });
  }

  
  const existingUsername = await prisma.user.findUnique({
    where: { username: username }
  });

  if (existingUsername) {
    throw Object.assign(new Error('Username already taken. Please choose another.'), { code: 'USERNAME_EXISTS' });
  }


  const plainPassword = generateSecurePassword(14);
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        firstName,
        lastName,
        username,
        phone,
        email: email ?? null,
        nationalId: nationalId ?? null,
        passwordHash,
        role: 'OFFICE_ADMIN',
        isActive: true,
        isNationalIdVerified: false
      },
    });

    const admin = await tx.officeAdmin.create({
      data: {
        userId: user.userId,
        officeId,
        employeeId,
      },
      include: {
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
        office: {
          select: {
            officeId: true,
            officeCode: true,
            officeName: true,
            subCity: true,
            woreda: true,
          },
        },
      },
    });

    // Send credentials via SMS
    await afroSMSService.sendSMS(
      phone,
      `SmartRent: Your account has been created.\nUsername: ${username}\nPassword: ${plainPassword}\nPlease login and change your password.`
    );

    return admin;
  });

  return result;
};

// ============================================
// CREATE OFFICER - Auto-generate password only
// ============================================

const createOfficer = async ({
  firstName,
  lastName,
  username,
  phone,
  nationalId,
  employeeId,
  email,
  officeId,
  position,
  assignedArea,
  password, // This will be ignored - auto-generated
}) => {
  const office = await prisma.governmentOffice.findUnique({
    where: { officeId },
  });

  if (!office) {
    throw Object.assign(new Error('Government office not found'), { code: 'OFFICE_NOT_FOUND' });
  }

  // check username uniqueness
  const existingUsername = await prisma.user.findUnique({
    where: { username: username }
  });

  if (existingUsername) {
    throw Object.assign(new Error('Username already taken. Please choose another.'), { code: 'USERNAME_EXISTS' });
  }

  // Auto-generate password 
  const plainPassword = generateSecurePassword(14);
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        firstName,
        lastName,
        username,
        phone,
        email: email ?? null,
        nationalId: nationalId ?? null,
        passwordHash,
        role: 'OFFICER',
        isActive: true,
        isNationalIdVerified: false
      },
    });

    const officer = await tx.officer.create({
      data: {
        userId: user.userId,
        officeId,
        employeeId,
        position: position ?? null,
        assignedArea: assignedArea ?? null,
      },
      include: {
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
        office: {
          select: {
            officeId: true,
            officeCode: true,
            officeName: true,
            subCity: true,
            woreda: true,
          },
        },
      },
    });

    // Send credentials via SMS
    await afroSMSService.sendSMS(
      phone,
      `SmartRent: Your account has been created.\nUsername: ${username}\nPassword: ${plainPassword}\nPlease login and change your password.`
    );

    return officer;
  });

  return result;
};

// ============================================
// EXPORT
// ============================================

module.exports = {
  getSummary,
  getSuperAdmins,
  getOfficers,
  getContracts,
  getAuditLogs,
  getReports,
  getNotifications,
  getOfficeAdmins,
  getOfficeSummary,
  getOffices,
  createOffice,
  createOfficeAdmin,
  createOfficer,
};
const prisma = require('../config/db');

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

      // Property location filters
      ...(subCity ? { unit: { property: { subCity } } } : {}),

      // Landlord name filters first/last name (case-insensitive)
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

      // Tenant name filters first/last name (case-insensitive)
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

      // Landlord -> User full name
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

      // Tenant -> User full name
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

      // Unit -> Property location
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

      // Office that processed the agreement
      office: {
        select: {
          officeId: true,
          officeCode: true,
          officeName: true,
        },
      },

      // Processing officer
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

      // Service fee payment status
      serviceFeePayment: {
        select: {
          serviceFeePaymentId: true,
          status: true,
        },
      },

      // Latest agreement-level payments (PAID / PENDING)
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

const getAuditLogs = async ({ action, userId, startDate, endDate } = {}) => {
  return prisma.auditLog.findMany({
    where: {
      ...(action ? { action } : {}),

      ...(userId ? { userId: parseInt(userId, 10) } : {}),

      ...(startDate ? { createdAt: { gte: new Date(startDate) } } : {}),

      ...(endDate ? { createdAt: { lte: new Date(endDate) } } : {}),
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

const getReports = async ({ subCity, startDate, endDate } = {}) => {
  const where = {
    ...(subCity ? { unit: { property: { subCity } } } : {}),
  };

  // Agreements within an optional date window (by effective date)
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

    // Sum of rentalAmount over the period (raw, no duration conversion)
    prisma.rentalAgreement.aggregate({
      where: agreementWhere,
      _sum: {
        rentalAmount: true,
      },
    }),

    // Collected income = sum of PAID rent payments
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

const getNotifications = async ({ userId, isRead } = {}) => {
  // The schema has no Notification model, so notifications are derived from
  // real database events: pending verifications, pending service fees,
  // and overdue payments for the given user's agreements.

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

  // Agreement references for this user (as landlord and/or tenant)
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

  // Sort newest first
  notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Apply optional isRead filter
  if (isRead !== undefined) {
    return notifications.filter((n) => n.isRead === (isRead === 'true'));
  }

  return notifications;
};

const getOfficers = async ({ subCity, isActive } = {}) => {
  return prisma.officer.findMany({
    where: {
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


const getOfficeAdmins = async ({ officeId, subCity, isActive, officeCode } = {}) => {
  return prisma.officeAdmin.findMany({
    where: {
      ...(officeId
        ? { officeId: parseInt(officeId, 10) }
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

const getOfficeSummary = async ({ officeId, subCity } = {}) => {
  const officeWhere = {
    ...(officeId ? { officeId: parseInt(officeId, 10) } : {}),
    ...(subCity ? { office: { subCity } } : {}),
  };

  const agreementWhere = {
    ...(officeId ? { officeId: parseInt(officeId, 10) } : {}),
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

const getOffices = async ({ status, subCity, city } = {}) => {
  return prisma.governmentOffice.findMany({
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
};

module.exports = {
  getSummary,
  getOfficers,
  getSuperAdmins,
  getContracts,
  getAuditLogs,
  getReports,
  getNotifications,
  getOfficeAdmins,
  getOfficeSummary,
  getOffices,
};
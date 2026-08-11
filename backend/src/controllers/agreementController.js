const prisma = require('../config/database');
const agreementService = require('../services/agreementService');
const { validateRequiredFields } = require('../utils/validation');

const createAgreement = async (req, res) => {
  try {
    const required = [
      'unitId', 'landlordId', 'tenantId', 'paymentFrequencyId',
      'monthlyRent', 'effectiveDate'
    ];
    const validation = validateRequiredFields(req.body, required);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    if (!['ADMIN', 'OFFICER'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only ADMIN or OFFICER can create agreements'
      });
    }

    const agreement = await agreementService.createAgreement(req.body);

    res.status(201).json({
      success: true,
      message: 'Agreement created successfully',
      data: agreement
    });

  } catch (error) {
    const clientErrors = [
      'Invalid landlord',
      'Invalid tenant',
      'Invalid unit',
      'Invalid payment frequency',
      'Rent amount must be greater than 0',
      'Invalid effective date',
      'Invalid termination date',
      'Unit does not belong to the specified landlord',
      'Unit is not available',
      'Unit already has an active or pending agreement',
      'Termination date must be after effective date'
    ];

    if (clientErrors.some(msg => error.message.includes(msg))) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error('Agreement creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during agreement creation'
    });
  }
};

const getAgreement = async (req, res) => {
  try {
    const { id } = req.params;
    const agreement = await agreementService.getAgreementById(Number(id));

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: 'Agreement not found'
      });
    }

    const user = req.user;
    const isLandlord = user.role === 'LANDLORD' && agreement.landlord.userId === user.userId;
    const isTenant = user.role === 'TENANT' && agreement.tenant.userId === user.userId;
    const isAdminOrOfficer = ['ADMIN', 'OFFICER'].includes(user.role);

    if (!isLandlord && !isTenant && !isAdminOrOfficer) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this agreement'
      });
    }

    res.json({
      success: true,
      data: agreement
    });

  } catch (error) {
    console.error('Get agreement error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getMyAgreements = async (req, res) => {
  try {
    const user = req.user;
    let agreements = [];

    if (user.role === 'LANDLORD') {
      const landlord = await prisma.landlord.findUnique({
        where: { userId: user.userId }
      });
      if (landlord) {
        agreements = await prisma.rentalAgreement.findMany({
          where: { landlordId: landlord.landlordId },
          include: {
            unit: true,
            tenant: { include: { user: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
      }
    } else if (user.role === 'TENANT') {
      const tenant = await prisma.tenant.findUnique({
        where: { userId: user.userId }
      });
      if (tenant) {
        agreements = await prisma.rentalAgreement.findMany({
          where: { tenantId: tenant.tenantId },
          include: {
            unit: { include: { property: true } },
            landlord: { include: { user: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
      }
    } else if (['ADMIN', 'OFFICER'].includes(user.role)) {
      agreements = await prisma.rentalAgreement.findMany({
        include: {
          unit: { include: { property: true } },
          landlord: { include: { user: true } },
          tenant: { include: { user: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      return res.status(403).json({
        success: false,
        message: 'No agreements found for your role'
      });
    }

    res.json({
      success: true,
      data: agreements
    });

  } catch (error) {
    console.error('Get agreements error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createAgreement,
  getAgreement,
  getMyAgreements
};
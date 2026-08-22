const prisma = require('../config/db');

// Get all government offices
const getOffices = async (req, res) => {
  try {
    console.log('=== GET OFFICES ===');
    
    const offices = await prisma.governmentOffice.findMany({
      where: {
        status: 'ACTIVE'
      },
      orderBy: {
        officeName: 'asc'
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
        updatedAt: true
      }
    });

    console.log(`Found ${offices.length} offices`);
    
    res.status(200).json({
      success: true,
      message: 'Government offices retrieved successfully',
      data: offices
    });
  } catch (error) {
    console.error('Get offices error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get single office by ID
const getOfficeById = async (req, res) => {
  try {
    console.log('=== GET OFFICE BY ID ===');
    console.log('Office ID:', req.params.id);
    
    const office = await prisma.governmentOffice.findUnique({
      where: {
        officeId: req.params.id
      },
      include: {
        officers: {
          include: {
            user: {
              select: {
                userId: true,
                firstName: true,
                lastName: true,
                username: true,
                email: true,
                phone: true
              }
            }
          }
        },
        officeAdmins: {
          include: {
            user: {
              select: {
                userId: true,
                firstName: true,
                lastName: true,
                username: true,
                email: true,
                phone: true
              }
            }
          }
        }
      }
    });

    if (!office) {
      return res.status(404).json({
        success: false,
        error: 'Government office not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Government office retrieved successfully',
      data: office
    });
  } catch (error) {
    console.error('Get office error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create new government office
const createOffice = async (req, res) => {
  try {
    console.log('=== CREATE OFFICE ===');
    console.log('Office data:', req.body);
    
    const { officeCode, officeName, region, city, subCity, woreda, address } = req.body;

    if (!officeCode || !officeName) {
      return res.status(400).json({
        success: false,
        error: 'Office code and name are required'
      });
    }

    const existingOffice = await prisma.governmentOffice.findUnique({
      where: { officeCode }
    });

    if (existingOffice) {
      return res.status(400).json({
        success: false,
        error: 'Office code already exists'
      });
    }

    const office = await prisma.governmentOffice.create({
      data: {
        officeCode,
        officeName,
        region: region || null,
        city: city || null,
        subCity: subCity || null,
        woreda: woreda || null,
        address: address || null,
        status: 'ACTIVE'
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'CREATE',
        entityType: 'GOVERNMENT_OFFICE',
        entityId: office.officeId,
        description: `Created government office ${office.officeName}`
      }
    });

    res.status(201).json({
      success: true,
      message: 'Government office created successfully',
      data: office
    });
  } catch (error) {
    console.error('Create office error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update government office
const updateOffice = async (req, res) => {
  try {
    console.log('=== UPDATE OFFICE ===');
    console.log('Office ID:', req.params.id);
    console.log('Update data:', req.body);
    
    const { officeCode, officeName, region, city, subCity, woreda, address } = req.body;

    const office = await prisma.governmentOffice.update({
      where: {
        officeId: req.params.id
      },
      data: {
        officeCode: officeCode || undefined,
        officeName: officeName || undefined,
        region: region || null,
        city: city || null,
        subCity: subCity || null,
        woreda: woreda || null,
        address: address || null
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'UPDATE',
        entityType: 'GOVERNMENT_OFFICE',
        entityId: office.officeId,
        description: `Updated government office ${office.officeName}`
      }
    });

    res.status(200).json({
      success: true,
      message: 'Government office updated successfully',
      data: office
    });
  } catch (error) {
    console.error('Update office error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Toggle office status
const toggleOfficeStatus = async (req, res) => {
  try {
    console.log('=== TOGGLE OFFICE STATUS ===');
    console.log('Office ID:', req.params.id);
    
    const office = await prisma.governmentOffice.findUnique({
      where: {
        officeId: req.params.id
      }
    });

    if (!office) {
      return res.status(404).json({
        success: false,
        error: 'Government office not found'
      });
    }

    const newStatus = office.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const updatedOffice = await prisma.governmentOffice.update({
      where: {
        officeId: req.params.id
      },
      data: {
        status: newStatus
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'UPDATE',
        entityType: 'GOVERNMENT_OFFICE',
        entityId: updatedOffice.officeId,
        description: `Changed office status to ${newStatus} for ${updatedOffice.officeName}`
      }
    });

    res.status(200).json({
      success: true,
      message: `Office status updated to ${newStatus}`,
      data: updatedOffice
    });
  } catch (error) {
    console.error('Toggle office status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getOffices,
  getOfficeById,
  createOffice,
  updateOffice,
  toggleOfficeStatus
};
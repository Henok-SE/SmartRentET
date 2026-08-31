const dashboardService = require('../services/dashboardService');

const getSummary = async (req, res) => {
  try {
    const data = await dashboardService.getSummary();

    res.status(200).json({
      success: true,
      message: 'Dashboard summary retrieved successfully',
      data,
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard summary',
    });
  }
};

const getSuperAdmins = async (req, res) => {
  try {
    const data = await dashboardService.getSuperAdmins();

    res.status(200).json({
      success: true,
      message: 'Super Admins retrieved successfully',
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve Super Admins',
    });
  }
};

const getContracts = async (req, res) => {
  try {
    const { referenceNumber, status, subCity, landlord, tenant } = req.query;
    const { role, userId } = req.user;
    let officeId = null;

    // Apply role-based scoping
    if (role === 'OFFICE_ADMIN') {
      const admin = await prisma.officeAdmin.findUnique({
        where: { userId },
        select: { officeId: true }
      });
      officeId = admin?.officeId;
    } else if (role === 'OFFICER') {
      const officer = await prisma.officer.findUnique({
        where: { userId },
        select: { officeId: true }
      });
      officeId = officer?.officeId;
    }

    const data = await dashboardService.getContracts({
      referenceNumber,
      status,
      subCity,
      landlord,
      tenant,
      officeId,
    });

    res.status(200).json({
      success: true,
      message: 'Rental agreements retrieved successfully',
      filters: {
        referenceNumber,
        status,
        subCity,
        landlord,
        tenant,
        officeId,
      },
      data,
    });
  } catch (error) {
    console.error('Dashboard contracts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve Rental Agreements',
    });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const { action, userId, startDate, endDate } = req.query;

    const data = await dashboardService.getAuditLogs({
      action,
      userId,
      startDate,
      endDate,
      user: req.user, 
    });

    res.status(200).json({
      success: true,
      message: 'Audit logs retrieved successfully',
      filters: {
        action,
        userId,
        startDate,
        endDate,
      },
      data,
    });
  } catch (error) {
    console.error('Dashboard audit logs error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs',
    });
  }
};
  
const getReports = async (req, res) => {
  try {
    const { subCity, startDate, endDate } = req.query;

    const data = await dashboardService.getReports({
      subCity,
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      message: 'Dashboard reports retrieved successfully',
      filters: {
        subCity,
        startDate,
        endDate,
      },
      data,
    });
  } catch (error) {
    console.error('Dashboard reports error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard reports',
    });
  }
};

const getNotifications = async (req, res) => {
  try {
    const { userId, isRead } = req.query;

    const data = await dashboardService.getNotifications({
      userId,
      isRead,
    });

    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      filters: {
        userId,
        isRead,
      },
      data,
    });
  } catch (error) {
    console.error('Dashboard notifications error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications',
    });
  }
};

const getOfficers = async (req, res) => {
  try {
    const { subCity, isActive } = req.query;

    const data = await dashboardService.getOfficers({
      subCity,
      isActive,
      user: req.user, 
    });

    res.status(200).json({
      success: true,
      message: 'Officers retrieved successfully',
      filters: {
        subCity,
        isActive,
      },
      data,
    });
  } catch (error) {
    console.error('Dashboard officers error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve Officers',
    });
  }
};

const getOfficeAdmins = async (req, res) => {
  try {
    const { officeId, subCity, isActive, officeCode } = req.query;

    const data = await dashboardService.getOfficeAdmins({
      officeId,
      subCity,
      isActive,
      officeCode,
    });

    res.status(200).json({
      success: true,
      message: 'Office Admins retrieved successfully',
      filters: { officeId, subCity, isActive, officeCode },
      data,
    });
  } catch (error) {
    console.error('Office admins error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve Office Admins',
    });
  }
};

const getOfficeSummary = async (req, res) => {
  try {
    const { officeId, subCity } = req.query;

    const data = await dashboardService.getOfficeSummary({
      officeId,
      subCity,
    });

    res.status(200).json({
      success: true,
      message: 'Office summary retrieved successfully',
      filters: { officeId, subCity },
      data,
    });
  } catch (error) {
    console.error('Office summary error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve office summary',
    });
  }
};

const getOffices = async (req, res) => {
  try {
    const { status, subCity, city } = req.query;

    const data = await dashboardService.getOffices({
      status,
      subCity,
      city,
    });

    res.status(200).json({
      success: true,
      message: 'Government offices retrieved successfully',
      filters: { status, subCity, city },
      data,
    });
  } catch (error) {
    console.error('Offices error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve government offices',
    });
  }
};

// ---- POST: create endpoints ----

const createOffice = async (req, res) => {
  try {
    const { officeName, officeCode, region, city, subCity, woreda, address } = req.body;

    if (!officeName || !officeCode) {
      return res.status(400).json({
        success: false,
        message: 'Office name and office code are required',
      });
    }

    const data = await dashboardService.createOffice({
      officeName, officeCode, region, city, subCity, woreda, address,
    });

    res.status(201).json({
      success: true,
      message: 'Government office created successfully',
      data,
    });
  } catch (error) {
    console.error('Create office error:', error);

    if (error.code === 'OFFICE_CODE_EXISTS') {
      return res.status(409).json({ success: false, message: 'An office with this code already exists' });
    }

    res.status(500).json({ success: false, message: 'Failed to create government office' });
  }
};

const createOfficeAdmin = async (req, res) => {
  try {
    const { firstName, lastName, username, phone, nationalId, employeeId, email, officeId, password } = req.body;

    if (!firstName || !lastName || !username || !phone || !employeeId || !officeId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName, lastName, username, phone, employeeId, officeId, password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const data = await dashboardService.createOfficeAdmin({
      firstName, lastName, username, phone, nationalId, employeeId, email, officeId, password,
    });

    res.status(201).json({
      success: true,
      message: 'Office admin created successfully',
      data,
    });
  } catch (error) {
    console.error('Create office admin error:', error);

    if (error.code === 'OFFICE_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Government office not found' });
    }
    if (error.code === 'DUPLICATE_ADMIN') {
      return res.status(409).json({ success: false, message: 'An admin with these details already exists' });
    }

    res.status(500).json({ success: false, message: 'Failed to create office admin' });
  }
};

const createOfficer = async (req, res) => {
  try {
    const { firstName, lastName, username, phone, nationalId, employeeId, email, officeId, position, assignedArea, password } = req.body;

    if (!firstName || !lastName || !username || !phone || !employeeId || !officeId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName, lastName, username, phone, employeeId, officeId, password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const data = await dashboardService.createOfficer({
      firstName, lastName, username, phone, nationalId, employeeId, email, officeId, position, assignedArea, password,
    });

    res.status(201).json({
      success: true,
      message: 'Officer created successfully',
      data,
    });
  } catch (error) {
    console.error('Create officer error:', error);

    if (error.code === 'OFFICE_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Government office not found' });
    }
    if (error.code === 'DUPLICATE_OFFICER') {
      return res.status(409).json({ success: false, message: 'An officer with these details already exists' });
    }

    res.status(500).json({ success: false, message: 'Failed to create officer' });
  }
};

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
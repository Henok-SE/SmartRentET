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

const getContracts = (req, res) => {
  const { referenceNumber, status, subCity, landlord, tenant } = req.query;

  res.status(200).json({
    success: true,
    message: 'Dashboard contracts retrieved successfully',
    filters: {
      referenceNumber,
      status,
      subCity,
      landlord,
      tenant,
    },
    data: [],
  });
};

const getAuditLogs = (req, res) => {
  const { action, userId, startDate, endDate } = req.query;

  res.status(200).json({
    success: true,
    message: 'Audit logs retrieved successfully',
    filters: {
      action,
      userId,
      startDate,
      endDate,
    },
    data: [],
  });
};
  
const getReports = (req, res) => {
  const { subCity, startDate, endDate } = req.query;

  res.status(200).json({
    success: true,
    message: 'Dashboard reports retrieved successfully',
    filters: {
      subCity,
      startDate,
      endDate,
    },
    data: {
      totalRegisteredAgreements: 0,
      activeAgreements: 0,
      endedAgreements: 0,
      paymentComplianceRate: 0,
      verifiedRentalIncome: 0,
    },
  });
};

const getNotifications = (req, res) => {
  const { userId, isRead } = req.query;

  res.status(200).json({
    success: true,
    message: 'Notifications retrieved successfully',
    filters: {
      userId,
      isRead,
    },
    data: [],
  });
};

const getOfficers = (req, res) => {
  const { subCity, isActive } = req.query;

  res.status(200).json({
    success: true,
    message: 'Officers retrieved successfully',
    filters: {
      subCity,
      isActive,
    },
    data: [],
  });
};

module.exports = {
  getSummary,
  getSuperAdmins,
  getContracts,
  getAuditLogs,
  getReports,
  getNotifications,
  getOfficers,
};
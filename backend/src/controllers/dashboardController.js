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

    const data = await dashboardService.getContracts({
      referenceNumber,
      status,
      subCity,
      landlord,
      tenant,
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
      },
      data,
    });
  } catch (error) {
    console.error('Dashboard contracts error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve rental agreements',
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


module.exports = {
  getSummary,
  getSuperAdmins,
  getOfficers,
  getContracts,
  getAuditLogs,
  getReports,
  getNotifications,
};
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!req.user.role) {
      return res.status(403).json({
        success: false,
        error: 'User role not found'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
};

const requireSuperAdmin = authorizeRoles('SUPER_ADMIN');
const requireOfficeAdmin = authorizeRoles('OFFICE_ADMIN', 'SUPER_ADMIN');
const requireOfficer = authorizeRoles('OFFICER', 'OFFICE_ADMIN', 'SUPER_ADMIN');

module.exports = {
  authorizeRoles,
  requireSuperAdmin,
  requireOfficeAdmin,
  requireOfficer
};
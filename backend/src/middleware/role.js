const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Required roles: ' + allowedRoles.join(', ') + '. Your role: ' + req.user.role
      });
    }

    next();
  };
};

const requireAdmin = requireRole('ADMIN');
const requireOfficer = requireRole('OFFICER');
const requireLandlord = requireRole('LANDLORD');
const requireTenant = requireRole('TENANT');
const requireOfficerOrAdmin = requireRole('OFFICER', 'ADMIN');

module.exports = {
  requireRole,
  requireAdmin,
  requireOfficer,
  requireLandlord,
  requireTenant,
  requireOfficerOrAdmin
};
const express = require('express');
const router = express.Router();
const officeController = require('../controllers/officeController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/role');

// ============================================
// ALL ROUTES - Authentication required
// ============================================
router.use(authenticateToken);

// ============================================
// READ ROUTES - All authenticated users
// ============================================

router.get('/', officeController.getOffices);
router.get('/:id', officeController.getOfficeById);

// ============================================
// WRITE ROUTES - SUPER ADMIN ONLY
// ============================================

router.post('/', authorizeRoles('SUPER_ADMIN'), officeController.createOffice);
router.put('/:id', authorizeRoles('SUPER_ADMIN'), officeController.updateOffice);
router.patch('/:id/status', authorizeRoles('SUPER_ADMIN'), officeController.toggleOfficeStatus);

module.exports = router;
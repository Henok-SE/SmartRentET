const express = require('express');
const router = express.Router();
const officeController = require('../controllers/officeController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Get all government offices
router.get('/', officeController.getOffices);

// Get single office by ID
router.get('/:id', officeController.getOfficeById);

// Create new government office (Super Admin only)
router.post('/', authorizeRoles('SUPER_ADMIN'), officeController.createOffice);

// Update government office (Super Admin only)
router.put('/:id', authorizeRoles('SUPER_ADMIN'), officeController.updateOffice);

// Toggle office status (Super Admin only)
router.patch('/:id/status', authorizeRoles('SUPER_ADMIN'), officeController.toggleOfficeStatus);

module.exports = router;
const express = require('express');
const CollegeDepartmentController = require('../controllers/collegeDepartment.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

const MANAGE_ROLES = [
  'ADMINISTRATOR',
  'ADMIN',
  'DIRECTOR_OF_UNDERGRADUATE_STUDIES',
  'SUPERUSER'
];

// List all active colleges with their departments
router.get('/', authenticate, CollegeDepartmentController.getAllColleges);

// Static department routes MUST be declared before parameterized /:id routes
router.get('/departments', authenticate, CollegeDepartmentController.getAllDepartments);
router.put(
  '/departments/:deptId',
  authenticate,
  authorize(...MANAGE_ROLES),
  CollegeDepartmentController.updateDepartment
);

// Nested college -> departments routes
router.get('/:collegeId/departments', authenticate, CollegeDepartmentController.getDepartmentsByCollege);
router.post(
  '/:collegeId/departments',
  authenticate,
  authorize(...MANAGE_ROLES),
  CollegeDepartmentController.createDepartment
);

// College CRUD by ID
router.get('/:id', authenticate, CollegeDepartmentController.getCollegeById);
router.post(
  '/',
  authenticate,
  authorize(...MANAGE_ROLES),
  CollegeDepartmentController.createCollege
);
router.put(
  '/:id',
  authenticate,
  authorize(...MANAGE_ROLES),
  CollegeDepartmentController.updateCollege
);
router.delete(
  '/:id',
  authenticate,
  authorize(...MANAGE_ROLES),
  CollegeDepartmentController.deleteCollege
);

module.exports = router;

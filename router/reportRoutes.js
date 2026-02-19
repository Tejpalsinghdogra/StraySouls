const express = require('express');
const router = express.Router();
const reportController = require('../controller/reportController');
const upload = require('../middlewares/upload');
const optionalAuth = require('../middlewares/optionalAuth');

router.get('/', reportController.getReports);
router.get('/stats', reportController.getReportStats);
router.get('/:id', reportController.getReportById);
router.put('/:id/status', reportController.updateReportStatus);
router.post('/', optionalAuth, upload.single('image'), reportController.createReport);

module.exports = router;

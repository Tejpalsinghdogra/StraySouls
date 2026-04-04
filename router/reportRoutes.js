const express = require('express');
const router = express.Router();
const reportController = require('../controller/reportController');
const upload = require('../middlewares/upload');
const optionalAuth = require('../middlewares/optionalAuth');
const scopeByRole = require('../middlewares/scopeByRole');

router.get('/', optionalAuth, scopeByRole, reportController.getReports);
router.get('/resolved', reportController.getResolvedReports);
router.get('/stats', reportController.getReportStats);
router.post('/analyze', upload.single('image'), reportController.analyzeImage);
router.get('/:id', reportController.getReportById);
router.put('/:id/status', reportController.updateReportStatus);
router.post('/', optionalAuth, upload.single('image'), reportController.createReport);

module.exports = router;

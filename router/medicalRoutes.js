const express = require('express');
const router = express.Router();
const medicalController = require('../controller/medicalController');
const upload = require('../middlewares/upload');
const optionalAuth = require('../middlewares/optionalAuth');

router.post('/request', optionalAuth, upload.single('image'), medicalController.createMedicalRequest);
router.get('/requests', medicalController.getMedicalRequests);
router.get('/my-requests', require('../middlewares/auth'), medicalController.getUserMedicalRequests);

module.exports = router;

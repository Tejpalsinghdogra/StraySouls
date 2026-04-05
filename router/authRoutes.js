const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const auth = require('../middlewares/auth');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/create-ngo', auth, authController.createNGO);
router.get('/me', auth, authController.getMe);

module.exports = router;

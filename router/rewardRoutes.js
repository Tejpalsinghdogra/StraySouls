const express = require('express');
const router = express.Router();
const rewardController = require('../controller/rewardController');
const auth = require('../middlewares/auth');

// Note: assuming auth middleware populates req.user

// Public/User routes
router.get('/', rewardController.getRewards);
router.post('/redeem', auth, rewardController.redeemReward);
router.get('/my-redemptions', auth, rewardController.getMyRedemptions);

// Admin route
router.post('/', auth, rewardController.createReward);

module.exports = router;

const Reward = require('../models/Reward');
const Redemption = require('../models/Redemption');
const User = require('../models/User');

// Get all active rewards
exports.getRewards = async (req, res) => {
    try {
        const rewards = await Reward.find({ isActive: true }).sort({ cost: 1 });
        res.json(rewards);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Redeem a reward
exports.redeemReward = async (req, res) => {
    try {
        const { rewardId } = req.body;
        const userId = req.user.id;

        // 1. Get Reward
        const reward = await Reward.findById(rewardId);
        if (!reward || !reward.isActive) {
            return res.status(404).json({ error: 'Reward not found or inactive' });
        }

        // 2. Get User
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 3. Check Balance
        if (user.pointsBalance < reward.cost) {
            return res.status(400).json({ 
                error: `Not enough Soul Points. You need ${reward.cost} but have ${user.pointsBalance}.` 
            });
        }

        // 4. Deduct Points & Add Badge (if applicable)
        user.pointsBalance -= reward.cost;
        if (reward.type === 'badge' && !user.badges.includes(reward.title)) {
            user.badges.push(reward.title);
        }
        await user.save();

        // 5. Create Redemption Record
        const status = reward.type === 'badge' ? 'fulfilled' : 'pending_fulfillment';
        
        const redemption = new Redemption({
            userId,
            rewardId,
            status
        });
        await redemption.save();

        res.json({ 
            msg: 'Reward redeemed successfully!', 
            pointsRemaining: user.pointsBalance,
            redemption 
        });

    } catch (err) {
        console.error('Error redeeming reward:', err);
        res.status(500).json({ error: 'Server error while redeeming reward' });
    }
};

// Get a user's redemptions
exports.getMyRedemptions = async (req, res) => {
    try {
        const redemptions = await Redemption.find({ userId: req.user.id })
            .populate('rewardId')
            .sort({ redeemedAt: -1 });
        res.json(redemptions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create a new reward (Admin only)
exports.createReward = async (req, res) => {
    try {
        // Assume req.user.role === 'admin' is checked in middleware
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { title, description, cost, type, imageUrl } = req.body;
        const newReward = new Reward({ title, description, cost, type, imageUrl });
        await newReward.save();
        
        res.status(201).json(newReward);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

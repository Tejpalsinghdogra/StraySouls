const mongoose = require('mongoose');
require('dotenv').config();
const Reward = require('./models/Reward');

async function seed() {
    try {
        await mongoose.connect('mongodb://localhost:27017/straysouls');
        console.log('Connected to MongoDB');

        await Reward.deleteMany({});
        console.log('Cleared existing rewards');

        const rewards = [
            {
                title: 'Guardian Angel Badge',
                description: 'A digital badge on your profile showing your ultimate dedication to stray animals.',
                cost: 150,
                type: 'badge',
                imageUrl: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
            },
            {
                title: '$10 Charity Donation',
                description: 'We will sponsor $10 to a local shelter on your behalf.',
                cost: 500,
                type: 'charity',
                imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
            },
            {
                title: 'StraySouls T-Shirt',
                description: 'Show your support with our official community T-shirt (Shipping included).',
                cost: 800,
                type: 'merch',
                imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
            },
            {
                title: '15% Off "Paws & Claws"',
                description: 'Get a 15% discount coupon for the Paws & Claws pet store.',
                cost: 200,
                type: 'coupon',
                imageUrl: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
            }
        ];

        await Reward.insertMany(rewards);
        console.log('Rewards seeded successfully!');
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();

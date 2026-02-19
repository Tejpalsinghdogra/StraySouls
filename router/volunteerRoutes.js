const express = require('express');
const router = express.Router();
const volunteerController = require('../controller/volunteerController');

const auth = require('../middlewares/auth');

router.post('/register', volunteerController.registerVolunteer);
router.get('/status/:userId', volunteerController.getVolunteerStatus);
router.get('/', auth, volunteerController.getAllVolunteers);
router.put('/:id/status', auth, volunteerController.updateVolunteerStatus);

module.exports = router;

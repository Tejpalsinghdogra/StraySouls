const express = require('express');
const router = express.Router();
const shelterController = require('../controller/shelterController');
const upload = require('../middlewares/upload');

const auth = require('../middlewares/auth');

// @route   POST api/shelters/register
// @desc    Register a new shelter/partner
router.post('/register', upload.single('certification'), shelterController.registerShelter);

// @route   GET api/shelters
// @desc    Get all shelters (Admin use primarily)
router.get('/', auth, shelterController.getAllShelters);

// @route   PUT api/shelters/:id/status
// @desc    Update shelter status
router.put('/:id/status', auth, shelterController.updateShelterStatus);

module.exports = router;

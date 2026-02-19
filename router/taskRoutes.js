const express = require('express');
const router = express.Router();
const taskController = require('../controller/taskController');
const auth = require('../middlewares/auth');

// @route   GET api/tasks
// @desc    Get all open tasks
// @access  Private (Volunteers/Admins)
router.get('/', auth, taskController.getOpenTasks);

// @route   GET api/tasks/my-tasks
// @desc    Get tasks assigned to the logged-in volunteer
// @access  Private (Volunteers)
router.get('/my-tasks', auth, taskController.getMyTasks);

// @route   PUT api/tasks/:id/accept
// @desc    Accept an open task
// @access  Private (Volunteers)
router.put('/:id/accept', auth, taskController.acceptTask);
router.put('/:id/reject', auth, taskController.rejectTask);

// @route   POST api/tasks
// @desc    Create a new task (Admin)
// @access  Private (Admin)
router.post('/', auth, taskController.createTask);

module.exports = router;

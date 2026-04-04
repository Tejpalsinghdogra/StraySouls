const express = require('express');
const router = express.Router();
const taskController = require('../controller/taskController');
const auth = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const scopeByRole = require('../middlewares/scopeByRole');

// @route   POST api/tasks
// @desc    Create a task manually
// @access  Private (Admin)
router.post('/', auth, taskController.createTask);

// @route   GET api/tasks/live
// @desc    Get all non-completed tasks (scoped by role)
// @access  Private
router.get('/live', auth, scopeByRole, taskController.getLiveTasks);

// @route   GET api/tasks/my
// @desc    Get tasks assigned to the logged-in volunteer
// @access  Private (Volunteers)
router.get('/my', auth, scopeByRole, taskController.getMyTasks);

// @route   POST api/tasks/:taskId/accept
// @desc    Accept an open task atomically
// @access  Private (Volunteers)
router.post('/:taskId/accept', auth, scopeByRole, taskController.acceptTask);

// @route   PATCH api/tasks/:taskId/status
// @desc    Update task status (in_progress, completed)
// @access  Private (Volunteers)
router.patch('/:taskId/status', auth, taskController.updateTaskStatus);

// @route   POST api/tasks/:taskId/complete
// @desc    Submit proof image for verification
// @access  Private (Volunteers)
router.post('/:taskId/complete', auth, upload.single('image'), taskController.submitTaskProof);

// @route   PATCH api/tasks/:taskId/verify
// @desc    Admin strictly verify task completion
// @access  Private (Admin)
router.patch('/:taskId/verify', auth, taskController.verifyTask);

// @route   GET api/tasks/pending-verification
// @desc    Admin lists pending verification items
// @access  Private (Admin)
router.get('/pending-verification', auth, taskController.getPendingVerification);

module.exports = router;

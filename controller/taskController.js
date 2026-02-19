const Task = require('../models/Task');
const Report = require('../models/Report');

// Get all open tasks
exports.getOpenTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ status: 'open' }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Accept a task
exports.acceptTask = async (req, res) => {
    try {
        const taskId = req.params.id;
        const userId = req.user.id; // From auth middleware

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        if (task.status !== 'open') {
            return res.status(400).json({ error: 'Task is no longer available' });
        }

        task.status = 'accepted';
        task.assignedTo = userId;
        await task.save();

        // Emit real-time update
        if (req.io) {
            req.io.emit('task-accepted', { taskId, userId });
        }

        res.json({ msg: 'Task accepted successfully', task });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get my assigned tasks
exports.getMyTasks = async (req, res) => {
    try {
        const userId = req.user.id;
        const tasks = await Task.find({ assignedTo: userId }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create a task (Admin only - for testing and full functionality)
exports.createTask = async (req, res) => {
    try {
        const { title, description, location, urgency, reportId, assignedTo } = req.body;
        
        const newTask = new Task({
            title,
            description,
            location,
            urgency,
            reportId,
            assignedTo,
            status: assignedTo ? 'accepted' : 'open'
        });

        await newTask.save();

        if (reportId) {
            await Report.findByIdAndUpdate(reportId, { status: 'in progress' });
        }

        if (req.io) {
            req.io.emit('new-task', newTask);
        }

        res.status(201).json(newTask);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// Decline/Reject a task
exports.rejectTask = async (req, res) => {
    try {
        const taskId = req.params.id;
        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Only allow rejection if it was accepted by the user OR if it's open (mark as invalid)
        if (task.status === 'accepted' && task.assignedTo.toString() === req.user.id) {
            // Un-accept the task
            task.status = 'open';
            task.assignedTo = undefined;
        } else {
            // Mark as cancelled/declined
            task.status = 'cancelled';
        }

        await task.save();

        if (req.io) {
            req.io.emit('task-rejected', { taskId });
        }

        res.json({ msg: 'Task updated successfully', task });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

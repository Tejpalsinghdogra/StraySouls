const Task = require('../models/Task');
const Report = require('../models/Report');
const Volunteer = require('../models/Volunteer');
// Create a task manually
exports.createTask = async (req, res) => {
    try {
        const { title, description, location, urgency, reportId, assignedTo, routedTo } = req.body;
        
        // Determine routedTo - from request body, or by looking up the report
        let taskRoutedTo = routedTo;
        if (!taskRoutedTo && reportId) {
            const report = await Report.findById(reportId);
            if (report) {
                taskRoutedTo = report.routedTo || 'volunteers';
            }
        }
        taskRoutedTo = taskRoutedTo || 'volunteers';
        
        const newTask = new Task({
            title, description, location, urgency, reportId, 
            assignedTo: assignedTo || null,
            status: assignedTo ? 'accepted' : 'open',
            autoAssigned: false,
            routedTo: taskRoutedTo
        });
        await newTask.save();
        
        if (reportId) {
            await Report.findByIdAndUpdate(reportId, { status: assignedTo ? 'accepted' : 'open' });
        }
        
        if (assignedTo) {
            const volunteer = await Volunteer.findOne({ userId: assignedTo });
            if (volunteer) {
                volunteer.assignedTasks.push(newTask._id);
                await volunteer.save();
            }
        }
        
        if (req.io && !assignedTo) {
            // Broadcast to appropriate room based on routing
            if (taskRoutedTo === 'volunteers') {
                req.io.to('volunteers_room').emit('newTaskBroadcast', { 
                    taskId: newTask._id, reportId, location, description, urgency, animalType: 'Animal', broadcastedAt: new Date(), routedTo: taskRoutedTo
                });
            } else {
                req.io.to('shelters_room').emit('new_report_shelters', { 
                    taskId: newTask._id, reportId, location, description, urgency, animalType: 'Animal', message: 'New shelter task created', routedTo: taskRoutedTo
                });
            }
        }
        
        res.status(201).json(newTask);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get live tasks (non-completed)
exports.getLiveTasks = async (req, res) => {
    try {
        const query = { status: { $ne: 'completed' } };
        
        // Scope by role if user is authenticated
        if (req.user && req.routeScope) {
            query.routedTo = req.routeScope;
        } else if (req.user && req.user.role === 'volunteer') {
            query.routedTo = 'volunteers';
        } else if (req.user && (req.user.role === 'shelter' || req.user.role === 'ngo')) {
            query.routedTo = 'shelters';
        }
        
        const tasks = await Task.find(query)
            .populate('assignedTo')
            .populate('reportId')
            .sort({ broadcastedAt: -1, createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Accept a task
exports.acceptTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user.id;

        // Find the task first to check routedTo
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Security check: volunteers can only accept volunteer tasks, shelters/NGOs can only accept shelter tasks
        if (req.user.role === 'volunteer' && task.routedTo !== 'volunteers') {
            return res.status(403).json({ message: 'This task is routed to NGOs/Shelters only' });
        }
        if ((req.user.role === 'shelter' || req.user.role === 'ngo') && task.routedTo !== 'shelters') {
            return res.status(403).json({ message: 'This task is routed to Volunteers only' });
        }

        const isOrganization = req.user.role === 'shelter' || req.user.role === 'ngo';
        const assignedToModel = isOrganization ? 'Shelter' : 'User';

        const updatedTask = await Task.findOneAndUpdate(
            { _id: taskId, assignedTo: null, status: 'open' },
            { 
                $set: { 
                    assignedTo: userId, 
                    assignedToModel: assignedToModel,
                    status: 'accepted',
                    assignedAt: new Date()
                } 
            },
            { new: true }
        );

        if (!updatedTask) {
            return res.status(409).json({ message: 'Task already accepted by another volunteer or not available' });
        }

        if (isOrganization) {
            const shelter = await Shelter.findOne({ userId });
            if (shelter) {
                shelter.assignedTasks.push(updatedTask._id);
                await shelter.save();
            }

            if (req.io) {
                req.io.to('shelters_room').emit('taskAccepted', { 
                    taskId: updatedTask._id, 
                    shelterId: userId,
                    shelterName: shelter ? shelter.organizationName : 'An NGO',
                    reportId: updatedTask.reportId
                });
            }
        } else {
            const volunteer = await Volunteer.findOne({ userId });
            if (volunteer) {
                volunteer.assignedTasks.push(updatedTask._id);
                await volunteer.save();
            }

            // Emit real-time update
            if (req.io) {
                req.io.to('volunteers_room').emit('taskAccepted', { 
                    taskId: updatedTask._id, 
                    volunteerId: userId,
                    volunteerName: volunteer ? volunteer.name : 'A Volunteer',
                    reportId: updatedTask.reportId
                });
            }
        }

        res.json({ msg: 'Task accepted successfully', task: updatedTask });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get my assigned tasks
exports.getMyTasks = async (req, res) => {
    try {
        const userId = req.user.id;
        const assignedToModel = req.user.role === 'shelter' ? 'Shelter' : 'User';
        const query = { assignedTo: userId, assignedToModel };
        
        // Filter by routedTo for non-admin users
        if (req.user.role === 'volunteer') {
            query.routedTo = 'volunteers';
        } else if (req.user.role === 'shelter' || req.user.role === 'ngo') {
            query.routedTo = 'shelters';
        }
        
        const tasks = await Task.find(query)
            .populate('reportId')
            .sort({ assignedAt: -1, createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update Task Status
exports.updateTaskStatus = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;

        const task = await Task.findByIdAndUpdate(taskId, { status }, { new: true });
        
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        if (status === 'completed' && task.assignedTo) {
            await Volunteer.findOneAndUpdate({ userId: task.assignedTo }, { isAvailable: true });
        }

        if (req.io) {
            req.io.emit('taskStatusUpdated', { taskId: task._id, status });
        }

        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- NEW VERIFICATION WORKFLOW ENDPOINTS ---

exports.submitTaskProof = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { note } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'Proof image is required' });
        }

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });
        
        if (task.assignedTo.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized: You are not assigned to this task' });
        }
        
        if (task.status !== 'in_progress' && task.status !== 'rejected') {
            return res.status(400).json({ error: 'Task must be in progress to submit proof, or you already submitted proof.' });
        }

        // Setup the proof object
        task.status = 'pending_verification';
        task.completionProof = {
            imageUrl: req.file.path,
            cloudinaryPublicId: req.file.filename,
            note: note || '',
            submittedAt: Date.now()
        };
        task.verification.status = 'pending';
        
        await task.save();

        let submitterName = 'Unknown';
        let submitterType = task.assignedToModel === 'Shelter' ? 'shelter' : 'volunteer';
        
        if (task.assignedToModel === 'Shelter') {
            const shelter = await Shelter.findOne({ userId: req.user.id });
            if (shelter) submitterName = shelter.organizationName;
        } else {
            const volunteer = await Volunteer.findOne({ userId: req.user.id });
            if (volunteer) submitterName = volunteer.name;
        }

        if (req.io) {
            req.io.emit('proofSubmitted', {
                taskId: task._id,
                reportId: task.reportId,
                submittedByName: submitterName,
                submittedByType: submitterType,
                proofImageUrl: task.completionProof.imageUrl,
                note: task.completionProof.note,
                submittedAt: task.completionProof.submittedAt
            });
        }

        res.json({ msg: 'Proof submitted successfully', task });
    } catch (err) {
        console.error('Error submitting proof:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.verifyTask = async (req, res) => {
    try {
        // Must be admin (Optional strict check depending on how Auth drops user payload, assuming role === 'admin')
        const { taskId } = req.params;
        const { action, rejectionReason } = req.body;

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });
        if (task.status !== 'pending_verification') {
            return res.status(400).json({ error: 'Task is not pending verification' });
        }

        if (action === 'reject' && (!rejectionReason || rejectionReason.trim() === '')) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        let assigneeId = task.assignedTo;
        let eventName = '';
        let eventPayload = { taskId: task._id, reportId: task.reportId };
        
        const isShelterTask = task.assignedToModel === 'Shelter';
        let assigneeDocument = null;
        
        if (isShelterTask) {
            assigneeDocument = await Shelter.findOne({ userId: assigneeId });
            eventPayload.shelterId = assigneeId;
        } else {
            assigneeDocument = await Volunteer.findOne({ userId: assigneeId });
            eventPayload.volunteerId = assigneeId;
        }

        if (action === 'verify') {
            task.status = 'completed';
            task.verification.status = 'verified';
            task.verification.reviewedBy = req.user.id;
            task.verification.reviewedAt = Date.now();
            
            if (assigneeDocument) {
                assigneeDocument.isAvailable = true;
                assigneeDocument.notifications.push({
                    message: "Your task completion proof was approved!",
                    taskId: task._id,
                    type: 'verified'
                });
                await assigneeDocument.save();
            }

            // AUTO-MARK REPORT AS RESOLVED
            if (task.reportId) {
                const updatedReport = await Report.findByIdAndUpdate(task.reportId, {
                    status: 'resolved',
                    resolvedAt: Date.now(),
                    resolvedBy: !isShelterTask && assigneeDocument ? assigneeDocument._id : null
                }, { new: true });

                if (req.io && updatedReport) {
                    req.io.emit('reportResolved', {
                        reportId: updatedReport._id,
                        taskId: task._id,
                        resolvedAt: updatedReport.resolvedAt,
                        volunteerName: assigneeDocument ? (isShelterTask ? assigneeDocument.organizationName : assigneeDocument.name) : 'System',
                        animalType: updatedReport.animalType,
                        urgency: updatedReport.urgency
                    });
                }
            }

            eventName = 'taskVerified';
            eventPayload.message = 'Your task has been verified!';

        } else if (action === 'reject') {
            task.status = 'in_progress';
            task.verification.status = 'rejected';
            task.verification.reviewedBy = req.user.id;
            task.verification.reviewedAt = Date.now();
            task.verification.rejectionReason = rejectionReason;
            
            // clear proof
            task.completionProof = { imageUrl: '', cloudinaryPublicId: '', note: '', submittedAt: null };

            if (assigneeDocument) {
                assigneeDocument.notifications.push({
                    message: `Your proof was rejected: ${rejectionReason}`,
                    taskId: task._id,
                    type: 'rejected'
                });
                await assigneeDocument.save();
            }

            eventName = 'taskRejected';
            eventPayload.rejectionReason = rejectionReason;
        } else {
            return res.status(400).json({ error: 'Invalid action. Must be verify or reject' });
        }

        await task.save();

        if (req.io) {
            const targetRoom = isShelterTask ? 'shelters_room' : 'volunteers_room';
            req.io.to(targetRoom).emit(eventName, eventPayload);
            if (req.user.role === 'admin') {
                // Ensure admins get the update to auto-remove card
                req.io.to('admin_room').emit(eventName, eventPayload);
            } else {
                req.io.emit(eventName, eventPayload);
            }
        }

        res.json({ msg: `Task successfully ${action}ed`, task });
    } catch (err) {
        console.error('Error verifying task:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getPendingVerification = async (req, res) => {
    try {
        const tasks = await Task.find({ status: 'pending_verification' })
            .populate({ path: 'assignedTo', select: 'name email organizationName contactEmail' })
            .populate({ path: 'reportId', select: 'animalType urgency location image' })
            .sort({ 'completionProof.submittedAt': 1 }); // Oldest first
            
        res.json(tasks);
    } catch (err) {
        console.error('Error getting pending verification:', err);
        res.status(500).json({ error: err.message });
    }
};

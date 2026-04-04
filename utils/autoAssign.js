const Task = require('../models/Task');
const Report = require('../models/Report');
const Volunteer = require('../models/Volunteer');

const autoAssignTask = async (report, io) => {
    try {
        console.log(`[AutoAssign] Starting auto-assign process for Report ${report._id}`);
        
        // 2. Create a new Task document
        const newTask = new Task({
            title: `Rescue: ${report.animalType || 'Animal'}`,
            description: report.description || 'Auto-generated rescue requested',
            location: report.location,
            urgency: report.urgency || 'medium',
            reportId: report._id,
            assignedTo: null,
            status: 'open',
            autoAssigned: true,
            broadcastedAt: new Date()
        });
        await newTask.save();
        console.log(`[AutoAssign] Created Task ${newTask._id}`);

        // 3. Update Report status to 'open'
        await Report.findByIdAndUpdate(report._id, { status: 'open' });

        // 4. Broadcast to ALL connected clients (volunteers and admin rooms)
        if (io) {
            const payload = {
                taskId: newTask._id,
                reportId: report._id,
                animalType: report.animalType,
                urgency: report.urgency,
                description: report.description,
                reportImage: report.image,
                location: report.location,
                broadcastedAt: newTask.broadcastedAt
            };
            io.emit('newTaskBroadcast', payload);
            console.log(`[AutoAssign] Task ${newTask._id} broadcasted.`);
        }

        // 5. Fetch volunteers to check if anyone is available to see it
        const volunteersCount = await Volunteer.countDocuments({}); 
        
        // 6. If no volunteers exist, warn the admin panel
        if (volunteersCount === 0) {
            console.log(`[AutoAssign] No volunteers registered in the system for Task ${newTask._id}`);
            if (io) io.emit('noVolunteersAvailable', { reportId: report._id, taskId: newTask._id });
        }
    } catch (err) {
        console.error('[AutoAssign] Error during auto-assignment:', err);
    }
};

module.exports = { autoAssignTask };

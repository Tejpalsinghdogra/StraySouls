const Task = require('../models/Task');
const Report = require('../models/Report');
const Volunteer = require('../models/Volunteer');

const autoAssignTask = async (report, io) => {
    try {
        console.log(`[AutoAssign] Starting auto-assign process for Report ${report._id}`);
        
        // Determine routing
        const routedTo = report.routedTo || (report.numberOfStrays <= 2 ? 'volunteers' : 'shelters');
        
        // 2. Create a new Task document
        const taskDescription = (report.description && report.description.trim() !== "") 
            ? report.description 
            : (report.aiAnalysis && report.aiAnalysis.aiDescription) 
                ? `AI Analysis: ${report.aiAnalysis.aiDescription}`
                : 'Emergency rescue requested. No detailed description available.';

        const newTask = new Task({
            title: `Rescue: ${report.animalType ? report.animalType.toUpperCase() : 'Animal'}`,
            description: taskDescription,
            location: report.location,
            urgency: report.urgency || 'medium',
            reportId: report._id,
            assignedTo: null,
            status: 'open',
            autoAssigned: true,
            broadcastedAt: new Date(),
            routedTo
        });
        await newTask.save();
        console.log(`[AutoAssign] Created Task ${newTask._id} with routedTo: ${routedTo}`);

        // 3. Update Report status to 'open'
        await Report.findByIdAndUpdate(report._id, { status: 'open' });

        // 4. Broadcast to appropriate room based on routing
        if (io) {
            const payload = {
                taskId: newTask._id,
                reportId: report._id,
                animalType: report.animalType,
                urgency: report.urgency,
                description: report.description,
                reportImage: report.image,
                location: report.location,
                numberOfStrays: report.numberOfStrays,
                routedTo,
                broadcastedAt: newTask.broadcastedAt
            };
            
            if (routedTo === 'volunteers') {
                io.to('volunteers_room').emit('new_report_volunteers', {
                    ...payload,
                    message: `New report: ${report.numberOfStrays || 1} stray(s) need volunteer assistance`
                });
                io.to('volunteers_room').emit('newTaskBroadcast', payload);
            } else {
                io.to('shelters_room').emit('new_report_shelters', {
                    ...payload,
                    message: `New report: ${report.numberOfStrays || 1} strays require NGO/Shelter response`
                });
            }
            console.log(`[AutoAssign] Task ${newTask._id} broadcasted to ${routedTo} room.`);
        }

        // 5. Fetch volunteers to check if anyone is available to see it
        const volunteersCount = await Volunteer.countDocuments({}); 
        
        // 6. If no volunteers exist, warn the admin panel
        if (volunteersCount === 0 && routedTo === 'volunteers') {
            console.log(`[AutoAssign] No volunteers registered in the system for Task ${newTask._id}`);
            if (io) io.emit('noVolunteersAvailable', { reportId: report._id, taskId: newTask._id });
        }
    } catch (err) {
        console.error('[AutoAssign] Error during auto-assignment:', err);
    }
};

module.exports = { autoAssignTask };

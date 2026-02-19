const Appointment = require('../models/Appointment');
const Report = require('../models/Report');

exports.bookAppointment = async (req, res) => {
    try {
        const { reportId, date, message } = req.body;
        
        // req.user is set by auth middleware
        const userId = req.user.id;

        // Verify report exists
        const report = await Report.findById(reportId);
        if (!report) {
            return res.status(404).json({ error: 'Animal report not found' });
        }

        const newAppointment = new Appointment({
            user: userId,
            report: reportId,
            date,
            message
        });

        await newAppointment.save();

        res.status(201).json({ 
            message: 'Appointment booked successfully', 
            appointment: newAppointment 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error booking appointment' });
    }
};

exports.getUserAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find({ user: req.user.id })
            .populate('report')
            .sort({ date: 1 });
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ error: 'Server error fetching appointments' });
    }
};

exports.cancelAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        // Check ownership
        if (appointment.user.toString() !== req.user.id) {
            return res.status(401).json({ error: 'User not authorized to cancel this appointment' });
        }

        // Only allow cancellation if pending or confirmed
        if (appointment.status === 'completed') {
            return res.status(400).json({ error: 'Cannot cancel a completed appointment' });
        }

        appointment.status = 'cancelled';
        await appointment.save();

        res.json({ message: 'Appointment cancelled successfully', appointment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error cancelling appointment' });
    }
};

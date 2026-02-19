require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./database/db');
const reportRoutes = require('./router/reportRoutes');
const authRoutes = require('./router/authRoutes');
const appointmentRoutes = require('./router/appointmentRoutes');
const volunteerRoutes = require('./router/volunteerRoutes');
const shelterRoutes = require('./router/shelterRoutes');
const medicalRoutes = require('./router/medicalRoutes');
const taskRoutes = require('./router/taskRoutes');

// Initialize Express and HTTP Server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Connect to Database
connectDB();

// Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Make io available in routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/shelters', shelterRoutes);
app.use('/api/medical', medicalRoutes);
app.use('/api/tasks', taskRoutes);

// Socket.io Connection
io.on('connection', (socket) => {
    // ...
});

// 404/405 Handler for debugging
app.use((req, res, next) => {
    console.log(`Unmatched request: ${req.method} ${req.url}`);
    if (req.method !== 'GET' && req.method !== 'POST') {
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    } else {
        next();
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('GLOBAL ERROR:', err);
    res.status(500).json({ 
        success: false,
        error: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

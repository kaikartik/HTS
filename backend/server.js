const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes'); // Import ticket routes
const agentRoutes = require('./routes/agentRoutes'); // Agent workspace routes

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes); // Mount ticket routes
app.use('/api/agent', agentRoutes); // Mount agent workspace routes

app.get('/', (req, res) => {
    res.json({ message: 'HTS Backend API is running successfully!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
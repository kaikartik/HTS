require('dotenv').config()
const express = require('express')
const cors = require('cors')
const db = require('./config/db')
const authRoutes = require('./routes/authRoutes')
const ticketRoutes = require('./routes/ticketRoutes')
const metaRoutes = require('./routes/metaRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const { startSlaJob } = require('./jobs/slaJob')
const agentRoutes = require('./routes/agentRoutes')

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/tickets', ticketRoutes)
app.use('/api/meta', metaRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/agent', agentRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'HTS Backend API is running successfully!' })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
  startSlaJob()
})

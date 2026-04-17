const express = require('express')
const cors = require('cors')

const boardRoutes = require('./routes/boardRoutes')

// Create the Express application instance.
const app = express()

// Enable cross-origin requests and JSON request bodies.
app.use(cors())
app.use(express.json())

// Mount the board API under a single route group.
app.use('/api/boards', boardRoutes)

// Simple health check route for local verification.
app.get('/', (req, res) => {
  res.send('API is running...')
})

// Start the server on the configured port.
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
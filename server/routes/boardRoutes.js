const express = require('express')

// Router for all board-related API endpoints.
const router = express.Router()

const {
	getBoards,
	createTask,
	moveTask,
	deleteTask,
	updateTask,
} = require('../controllers/boardController')

router.get('/', getBoards)
router.post('/task', createTask)
router.post('/move', moveTask)
router.post('/delete', deleteTask)
router.post('/update', updateTask)

module.exports = router
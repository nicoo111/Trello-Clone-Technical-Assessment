const { readData, writeData } = require('../utils/fileHandler')
const { v4: uuidv4 } = require('uuid')

// These are the only board columns the app expects to manage.
const COLUMN_KEYS = ['backlog', 'todo', 'inprogress', 'completed']

// Normalize a due date to the end of the selected day.
const toDateEnd = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(23, 59, 59, 999)
  return date
}

// A task is overdue when its due date has passed.
const isOverdue = (task) => {
  const dueDate = toDateEnd(task.dueDate)
  if (!dueDate) return false
  return Date.now() > dueDate.getTime()
}

// Ensure the board always has the expected structure and drop the templates column.
const normalizeBoard = (board) => {
  let changed = false

  if (!board.columns || typeof board.columns !== 'object') {
    board.columns = {}
    changed = true
  }

  for (const key of COLUMN_KEYS) {
    if (!Array.isArray(board.columns[key])) {
      board.columns[key] = []
      changed = true
    }
  }

  if (Array.isArray(board.columns.templates) && board.columns.templates.length) {
    board.columns.backlog.push(...board.columns.templates)
    changed = true
  }

  if (Object.prototype.hasOwnProperty.call(board.columns, 'templates')) {
    changed = true
  }
  delete board.columns.templates

  return changed
}

// Move overdue work into backlog before data is returned or saved.
const applyBacklogRules = (data) => {
  let changed = false

  for (const board of data.boards || []) {
    if (normalizeBoard(board)) {
      changed = true
    }

    for (const column of COLUMN_KEYS) {
      if (column === 'backlog' || column === 'completed') continue

      const staying = []
      for (const task of board.columns[column]) {
        if (isOverdue(task)) {
          board.columns.backlog.push(task)
          changed = true
        } else {
          staying.push(task)
        }
      }

      if (staying.length !== board.columns[column].length) {
        board.columns[column] = staying
      }
    }
  }

  return changed
}

// Read the database, normalize it, and persist any schema cleanup.
const loadData = async () => {
  const data = await readData()
  const changed = applyBacklogRules(data)
  if (changed) {
    await writeData(data)
  }
  return data
}

// Return all boards to the frontend.
const getBoards = async (req, res) => {
  try {
    const data = await loadData()
    res.json(data.boards)
  } catch (error) {
    res.status(500).json({ message: 'Error reading data' })
  }
}

// Create a new task or work item in a selected column.
const createTask = async (req, res) => {
  try {
    const {
      title,
      column,
      description,
      priority,
      tags,
      issueType,
      dueDate,
    } = req.body

    if (!title || !column) {
      return res.status(400).json({ message: 'Title and column are required' })
    }

    const data = await loadData()
    const targetBoard = data.boards[0]

    if (!targetBoard || !targetBoard.columns[column]) {
      return res.status(400).json({ message: 'Invalid board column' })
    }

    const newTask = {
      id: uuidv4(),
      title,
      description: description || '',
      priority: priority || 'low',
      tags: tags || [],
      issueType: issueType || 'task',
      dueDate: dueDate || '',
      createdAt: new Date().toISOString(),
    }

    targetBoard.columns[column].push(newTask)

    applyBacklogRules(data)

    await writeData(data)

    res.json(newTask)
  } catch (error) {
    res.status(500).json({ message: 'Error creating task' })
  }
}

// Move a task from one column to another.
const moveTask = async (req, res) => {
  try {
    const { taskId, sourceCol, targetCol } = req.body

    if (!taskId || !sourceCol || !targetCol) {
      return res.status(400).json({ message: 'Task and columns are required' })
    }

    const data = await loadData()
    const sourceTasks = data.boards[0].columns[sourceCol]

    if (!sourceTasks || !data.boards[0].columns[targetCol]) {
      return res.status(400).json({ message: 'Invalid board column' })
    }

    const taskIndex = sourceTasks.findIndex((task) => task.id === taskId)

    if (taskIndex === -1) {
      return res.status(404).json({ message: 'Task not found' })
    }

    const task = sourceTasks[taskIndex]

    sourceTasks.splice(taskIndex, 1)
    data.boards[0].columns[targetCol].push(task)

    applyBacklogRules(data)

    await writeData(data)

    res.json({ message: 'Task moved' })
  } catch (error) {
    res.status(500).json({ message: 'Error moving task' })
  }
}

// Remove a task from its column.
const deleteTask = async (req, res) => {
  try {
    const { taskId, column } = req.body

    if (!taskId || !column) {
      return res.status(400).json({ message: 'Task and column are required' })
    }

    const data = await loadData()
    const tasks = data.boards[0].columns[column]

    if (!tasks) {
      return res.status(400).json({ message: 'Invalid board column' })
    }

    data.boards[0].columns[column] = tasks.filter((task) => task.id !== taskId)

    await writeData(data)

    res.json({ message: 'Task deleted' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task' })
  }
}

// Merge edited task fields back into the stored item.
const updateTask = async (req, res) => {
  try {
    const { taskId, column, updatedTask } = req.body

    if (!taskId || !column || !updatedTask) {
      return res.status(400).json({ message: 'Task, column, and update payload are required' })
    }

    const data = await loadData()
    const tasks = data.boards[0].columns[column]

    if (!tasks) {
      return res.status(400).json({ message: 'Invalid board column' })
    }

    const index = tasks.findIndex((task) => task.id === taskId)

    if (index === -1) {
      return res.status(404).json({ message: 'Task not found' })
    }

    const { id, column: ignoredColumn, createdAt, ...safeUpdates } = updatedTask
    tasks[index] = { ...tasks[index], ...safeUpdates }

    applyBacklogRules(data)

    await writeData(data)

    res.json(tasks[index])
  } catch (error) {
    res.status(500).json({ message: 'Error updating task' })
  }
}

module.exports = { getBoards, createTask, moveTask, deleteTask, updateTask }
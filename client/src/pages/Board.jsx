import { DndContext, closestCenter, useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useMemo, useState } from 'react'
import API from '../services/api'
import './Board.css'

// Column order is kept stable so the board renders consistently.
const COLUMN_ORDER = ['backlog', 'todo', 'inprogress', 'completed']
// Supported item types for tasks, bugs, updates, and features.
const TASK_TYPES = ['task', 'bug', 'update', 'feature']

// Derive a simple due-date state for labels and filtering.
const dueState = (task) => {
  if (!task.dueDate) return 'none'
  const due = new Date(task.dueDate)
  if (Number.isNaN(due.getTime())) return 'none'

  due.setHours(23, 59, 59, 999)
  const now = Date.now()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (due.getTime() < now) return 'overdue'
  if (due.getTime() >= today.getTime() && due.getTime() <= today.getTime() + 86400000 - 1) {
    return 'today'
  }
  return 'upcoming'
}

// Format a date for display inside the task card and modal.
const formatDate = (value) => {
  if (!value) return 'No due date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No due date'
  return date.toLocaleDateString()
}

const Board = () => {
  // Board data fetched from the backend.
  const [board, setBoard] = useState(null)
  // Draft values are tracked per column so each composer is independent.
  const [newTask, setNewTask] = useState({})
  // Which column currently owns the create modal.
  const [createTaskColumn, setCreateTaskColumn] = useState(null)
  // Global search text across title, description, and type.
  const [search, setSearch] = useState('')
  // Board filters for task priority, type, and due date state.
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dueFilter, setDueFilter] = useState('all')
  // Optional due-date range filters.
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  // Selected task powers the edit modal.
  const [selectedTask, setSelectedTask] = useState(null)

  // Reset every filter back to its default state.
  const handleResetFilters = () => {
    // Clear search text.
    setSearch('')
    // Reset all drop-down filters.
    setPriorityFilter('all')
    setTypeFilter('all')
    setDueFilter('all')
    // Remove the date range values.
    setFromDate('')
    setToDate('')
  }

  // Fetch the board from the API.
  const fetchBoard = async () => {
    // Get the first board from the server.
    const res = await API.get('/api/boards')
    setBoard(res.data[0])
  }

  // Load initial data once the page mounts.
  useEffect(() => {
    fetchBoard()
  }, [])

  // Create a task in the chosen column and close the create modal.
  const handleCreateTask = async (column) => {
    // Read the draft data for this column.
    const taskData = newTask[column]
    // Use trimmed text so blank spaces do not count as a title.
    const title = taskData?.title?.trim()

    // Stop if the task has no title.
    if (!title) return

    // Send the new task to the backend so it gets saved.
    const res = await API.post('/api/boards/task', {
      ...taskData,
      title,
      column,
    })

    // Update the UI right away so the task appears without reloading.
    const updatedBoard = structuredClone(board)
    updatedBoard.columns[column].push(res.data)

    // Clear the draft for that column and close the modal.
    setBoard(updatedBoard)
    setNewTask({
      ...newTask,
      [column]: {
        title: '',
        description: '',
        priority: 'low',
        issueType: 'task',
        dueDate: '',
      },
    })
    setCreateTaskColumn(null)
  }

  // Move a task between columns and persist the change.
  const handleDragEnd = async (event) => {
    // dnd-kit gives us the dragged item and the target item.
    const { active, over } = event

    // If the user did not drop on a target, do nothing.
    if (!over) return

    // Figure out where the task started and where it landed.
    const sourceCol = active.data.current.column
    const targetCol = over.data.current?.column || over.id

    // If the task stayed in the same column, we can exit early.
    if (sourceCol === targetCol) return

    // Clone the board so we can update the screen immediately.
    const updatedBoard = structuredClone(board)

    // Find the task inside the source column.
    const taskIndex = updatedBoard.columns[sourceCol].findIndex(
      (task) => task.id === active.id,
    )

    // If the task is missing, stop to avoid errors.
    if (taskIndex === -1) return

    // Remove the task from the source column and place it in the target column.
    const task = updatedBoard.columns[sourceCol][taskIndex]

    updatedBoard.columns[sourceCol].splice(taskIndex, 1)
    updatedBoard.columns[targetCol].push(task)

    setBoard(updatedBoard)

    // Tell the backend that the task moved.
    await API.post('/api/boards/move', {
      taskId: task.id,
      sourceCol,
      targetCol,
    })
  }

  // Save edits made in the modal and refresh the board from the server.
  const handleUpdateTask = async () => {
    // Do nothing if no task is selected.
    if (!selectedTask) return

    // Send the edited values to the backend.
    await API.post('/api/boards/update', {
      taskId: selectedTask.id,
      column: selectedTask.column,
      updatedTask: {
        title: selectedTask.title?.trim(),
        description: selectedTask.description || '',
        priority: selectedTask.priority || 'low',
        issueType: selectedTask.issueType || 'task',
        dueDate: selectedTask.dueDate || '',
        tags: selectedTask.tags || [],
      },
    })

    // Reload the board so the saved changes show on screen.
    await fetchBoard()
    setSelectedTask(null)
  }

  // Delete the selected task and refresh the board.
  const handleDeleteTask = async () => {
    // Do nothing if there is no selected task.
    if (!selectedTask) return

    // Ask the backend to remove the task from storage.
    await API.post('/api/boards/delete', {
      taskId: selectedTask.id,
      column: selectedTask.column,
    })

    // Reload the board so the deleted item disappears.
    await fetchBoard()
    setSelectedTask(null)
  }

  // Combine search, type, priority, and due-date filters.
  const matchesFilters = (task) => {
    // Turn the search text into lowercase so matching is easier.
    const q = search.trim().toLowerCase()
    // Check whether the task matches the selected priority.
    const priorityOk = priorityFilter === 'all' || task.priority === priorityFilter
    // Check whether the task matches the selected issue type.
    const typeOk = typeFilter === 'all' || (task.issueType || 'task') === typeFilter

    // Work out whether the task matches the due-status filter.
    let dueOk = true
    const due = dueState(task)
    if (dueFilter === 'overdue') dueOk = due === 'overdue'
    if (dueFilter === 'today') dueOk = due === 'today'
    if (dueFilter === 'upcoming') dueOk = due === 'upcoming'
    if (dueFilter === 'none') dueOk = due === 'none'

    // If the user picked a date range, the task must fall inside it.
    let rangeOk = true
    if (fromDate || toDate) {
      if (!task.dueDate) {
        rangeOk = false
      } else {
        const dueDate = new Date(task.dueDate)
        if (Number.isNaN(dueDate.getTime())) {
          rangeOk = false
        } else {
          dueDate.setHours(0, 0, 0, 0)
          if (fromDate) {
            const from = new Date(fromDate)
            from.setHours(0, 0, 0, 0)
            if (dueDate.getTime() < from.getTime()) rangeOk = false
          }
          if (toDate) {
            const to = new Date(toDate)
            to.setHours(23, 59, 59, 999)
            if (dueDate.getTime() > to.getTime()) rangeOk = false
          }
        }
      }
    }

    // Check the search text against the task title, description, and type.
    const textOk =
      !q ||
      task.title?.toLowerCase().includes(q) ||
      task.description?.toLowerCase().includes(q) ||
      task.issueType?.toLowerCase().includes(q)

    return priorityOk && typeOk && dueOk && rangeOk && textOk
  }

  // Only render columns that exist in the data model.
  const visibleColumns = useMemo(() => {
    // If the board has not loaded yet, do not try to render columns.
    if (!board?.columns) return []
    return COLUMN_ORDER.filter((key) => Array.isArray(board.columns[key]))
  }, [board])

  // Show a loading state until the board data arrives.
  if (!board) return <p className='loading'>Loading board...</p>

  return (
    <div className='spotify-board'>
      {/* Title area at the top of the board page. */}
      <header className='board-header'>
        <div>
          <p className='eyebrow'>Project Workspace</p>
          <h1>{board.name}</h1>
        </div>
      </header>

      {/* Global search and filter controls. */}
      <section className='filters'>
        {/* The first row holds the main text and drop-down filters. */}
        <div className='filter-row filter-row-primary'>
          <input
            type='text'
            placeholder='Search by title, description, or type'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value='all'>All priorities</option>
            <option value='high'>High</option>
            <option value='medium'>Medium</option>
            <option value='low'>Low</option>
          </select>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value='all'>All issue types</option>
            {TASK_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select value={dueFilter} onChange={(e) => setDueFilter(e.target.value)}>
            <option value='all'>Any due status</option>
            <option value='overdue'>Overdue</option>
            <option value='today'>Due today</option>
            <option value='upcoming'>Upcoming</option>
            <option value='none'>No due date</option>
          </select>
        </div>

        {/* The second row holds the date range and reset button. */}
        <div className='filter-row filter-row-secondary'>
          {/* Start and end date used for the range filter. */}
          <div className='date-range'>
            <label>
              <span>From</span>
              <input
                type='date'
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>

            <label>
              <span>To</span>
              <input type='date' value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </label>
          </div>

          {/* Clear every filter and go back to the full board view. */}
          <button className='reset-button' type='button' onClick={handleResetFilters}>
            Reset filters
          </button>
        </div>
      </section>

      {/* Drag-and-drop board columns. */}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {/* Render one column for each board status. */}
        <section className='columns'>
          {visibleColumns.map((key) => (
            <Column
              key={key}
              columnKey={key}
              tasks={board.columns[key]}
              matchesFilters={matchesFilters}
              setSelectedTask={setSelectedTask}
              onAddClick={() =>
                setCreateTaskColumn((current) => {
                  if (!newTask[key]) {
                    setNewTask((prev) => ({
                      ...prev,
                      [key]: {
                        title: '',
                        description: '',
                        priority: 'low',
                        issueType: 'task',
                        dueDate: '',
                      },
                    }))
                  }

                  return key
                })
              }
            />
          ))}
        </section>
      </DndContext>

      {/* Create modal uses the same workflow style as edit. */}
      {createTaskColumn && (
        <div className='modal-backdrop'>
          <div className='modal'>
            {/* Form for creating a new task inside the selected column. */}
            <h2>Create Item</h2>

            <label>Title</label>
            <input
              value={newTask[createTaskColumn]?.title || ''}
              onChange={(e) =>
                setNewTask((prev) => ({
                  ...prev,
                  [createTaskColumn]: {
                    ...prev[createTaskColumn],
                    title: e.target.value,
                  },
                }))
              }
            />

            <label>Description</label>
            <textarea
              rows={3}
              value={newTask[createTaskColumn]?.description || ''}
              onChange={(e) =>
                setNewTask((prev) => ({
                  ...prev,
                  [createTaskColumn]: {
                    ...prev[createTaskColumn],
                    description: e.target.value,
                  },
                }))
              }
            />

            <label>Type</label>
            <select
              value={newTask[createTaskColumn]?.issueType || 'task'}
              onChange={(e) =>
                setNewTask((prev) => ({
                  ...prev,
                  [createTaskColumn]: {
                    ...prev[createTaskColumn],
                    issueType: e.target.value,
                  },
                }))
              }
            >
              {TASK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <label>Priority</label>
            <select
              value={newTask[createTaskColumn]?.priority || 'low'}
              onChange={(e) =>
                setNewTask((prev) => ({
                  ...prev,
                  [createTaskColumn]: {
                    ...prev[createTaskColumn],
                    priority: e.target.value,
                  },
                }))
              }
            >
              <option value='high'>High</option>
              <option value='medium'>Medium</option>
              <option value='low'>Low</option>
            </select>

            <label>Due Date</label>
            <input
              type='date'
              value={newTask[createTaskColumn]?.dueDate || ''}
              onChange={(e) =>
                setNewTask((prev) => ({
                  ...prev,
                  [createTaskColumn]: {
                    ...prev[createTaskColumn],
                    dueDate: e.target.value,
                  },
                }))
              }
            />

            <div className='modal-actions'>
              <button className='primary' onClick={() => handleCreateTask(createTaskColumn)}>
                Save
              </button>
              <button onClick={() => setCreateTaskColumn(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal for updating or deleting an existing item. */}
      {selectedTask && (
        <div className='modal-backdrop'>
          <div className='modal'>
            {/* Form for changing a task after it has been created. */}
            <h2>Edit Item</h2>

            <label>Title</label>
            <input
              value={selectedTask.title || ''}
              onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
            />

            <label>Description</label>
            <textarea
              rows={3}
              value={selectedTask.description || ''}
              onChange={(e) =>
                setSelectedTask({ ...selectedTask, description: e.target.value })
              }
            />

            <label>Type</label>
            <select
              value={selectedTask.issueType || 'task'}
              onChange={(e) =>
                setSelectedTask({ ...selectedTask, issueType: e.target.value })
              }
            >
              {TASK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <label>Priority</label>
            <select
              value={selectedTask.priority || 'low'}
              onChange={(e) => setSelectedTask({ ...selectedTask, priority: e.target.value })}
            >
              <option value='high'>High</option>
              <option value='medium'>Medium</option>
              <option value='low'>Low</option>
            </select>

            <label>Due Date</label>
            <input
              type='date'
              value={selectedTask.dueDate || ''}
              onChange={(e) => setSelectedTask({ ...selectedTask, dueDate: e.target.value })}
            />

            <div className='modal-actions'>
              <button className='primary' onClick={handleUpdateTask}>Save</button>
              <button className='danger' onClick={handleDeleteTask}>Delete</button>
              <button onClick={() => setSelectedTask(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const Column = ({
  columnKey,
  tasks,
  matchesFilters,
  setSelectedTask,
  onAddClick,
}) => {
  // Register each column as a drop target.
  const { setNodeRef } = useDroppable({
    id: columnKey,
    data: { column: columnKey },
  })

  const filteredTasks = tasks.filter(matchesFilters)

  return (
    <article className='column' ref={setNodeRef}>
      {/* Column title and task count. */}
      <div className='column-head'>
        <h3>{columnKey}</h3>
        <span>{filteredTasks.length}</span>
      </div>

      {columnKey !== 'completed' && (
        <button className='primary' onClick={onAddClick} type='button'>
          Add item
        </button>
      )}

      {/* Sortable task list inside the column. */}
      <SortableContext
        items={filteredTasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className='task-list'>
          {filteredTasks.map((task) => (
            <Task
              key={task.id}
              task={task}
              column={columnKey}
              setSelectedTask={setSelectedTask}
            />
          ))}
        </div>
      </SortableContext>
    </article>
  )
}

const Task = ({ task, column, setSelectedTask }) => {
  // Make each task card draggable within the board.
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
    data: { column },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priorityClass = `priority-${task.priority || 'low'}`

  return (
    <div ref={setNodeRef} style={style} className='task-card'>
      {/* Clicking the body opens the edit modal. */}
      <button
        className='task-body'
        onClick={() => setSelectedTask({ ...task, column })}
        type='button'
      >
        <div className='task-top'>
          <span className='task-type'>{task.issueType || 'task'}</span>
          <span className={`badge ${priorityClass}`}>{task.priority || 'low'}</span>
        </div>
        <h4>{task.title}</h4>
        {task.description && <p>{task.description}</p>}
        <small className={`due ${dueState(task)}`}>Due: {formatDate(task.dueDate)}</small>
      </button>

      {/* Drag handle keeps click and drag behaviors separate. */}
      <button type='button' className='drag-handle' {...attributes} {...listeners}>
        Drag
      </button>
    </div>
  )
}

export default Board

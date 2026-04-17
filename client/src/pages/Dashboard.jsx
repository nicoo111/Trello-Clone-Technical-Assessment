import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import API from '../services/api'
import './Dashboard.css'

const Dashboard = () => {
  // This keeps the board data that the dashboard reads and displays.
  const [board, setBoard] = useState(null)

  // Ask the backend for the latest board data.
  const fetchBoard = async () => {
    // Call the API endpoint that returns the saved board.
    const res = await API.get('/api/boards')
    // Store the first board from the response.
    setBoard(res.data[0])
  }

  // Load the dashboard data once when the page opens.
  useEffect(() => {
    fetchBoard()
  }, [])

  // Flatten all columns into one list so we can count and export tasks.
  const tasks = useMemo(() => {
    // If the board has no columns yet, return an empty list.
    if (!board?.columns) return []

    // Convert each column into task rows and keep the column name with each task.
    return Object.entries(board.columns).flatMap(([column, columnTasks]) =>
      columnTasks.map((task) => ({
        ...task,
        column,
      })),
    )
  }, [board])

  // Count tasks by type and by priority for the summary cards.
  const totals = useMemo(() => {
    // Start all counters at zero.
    const byType = { task: 0, bug: 0, update: 0, feature: 0 }
    const byPriority = { high: 0, medium: 0, low: 0 }

    // Look at each task and increase the matching counters.
    tasks.forEach((task) => {
      const type = task.issueType || 'task'
      const priority = task.priority || 'low'

      if (byType[type] !== undefined) byType[type] += 1
      if (byPriority[priority] !== undefined) byPriority[priority] += 1
    })

    return {
      // Total number of tasks across the board.
      total: tasks.length,
      // Count per column for the dashboard cards.
      backlog: board?.columns?.backlog?.length || 0,
      todo: board?.columns?.todo?.length || 0,
      inprogress: board?.columns?.inprogress?.length || 0,
      completed: board?.columns?.completed?.length || 0,
      byType,
      byPriority,
    }
  }, [board, tasks])

  // Create an Excel file from the dashboard data.
  const exportToExcel = () => {
    // If the board has not loaded, there is nothing to export.
    if (!board) return

    // Build the summary sheet with high-level board numbers.
    const summarySheet = XLSX.utils.json_to_sheet([
      { Metric: 'Board Name', Value: board.name },
      { Metric: 'Total Tasks', Value: totals.total },
      { Metric: 'Backlog', Value: totals.backlog },
      { Metric: 'Todo', Value: totals.todo },
      { Metric: 'In Progress', Value: totals.inprogress },
      { Metric: 'Completed', Value: totals.completed },
      { Metric: 'High Priority', Value: totals.byPriority.high },
      { Metric: 'Medium Priority', Value: totals.byPriority.medium },
      { Metric: 'Low Priority', Value: totals.byPriority.low },
    ])

    // Build the tasks sheet with one row per task.
    const tasksSheet = XLSX.utils.json_to_sheet(
      tasks.map((task) => ({
        Column: task.column,
        Title: task.title,
        Description: task.description || '',
        Type: task.issueType || 'task',
        Priority: task.priority || 'low',
        DueDate: task.dueDate || '',
        CreatedAt: task.createdAt || '',
      })),
    )

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
    XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Tasks')

    // Save the workbook as a file on the user's computer.
    XLSX.writeFile(workbook, `${board.name.replace(/\s+/g, '_').toLowerCase()}_dashboard.xlsx`)
  }

  // Show a loading message until the board data is ready.
  if (!board) return <p className='dashboard-loading'>Loading dashboard...</p>

  return (
    <main className='dashboard-page'>
      <section className='dashboard-hero'>
        <div>
          <p className='dashboard-kicker'>Overview</p>
          <h2>{board.name} Dashboard</h2>
          <p className='dashboard-copy'>Track totals, status, and export everything to Excel.</p>
        </div>

        <button className='dashboard-export' onClick={exportToExcel} type='button'>
          Export to Excel
        </button>
      </section>

      <section className='dashboard-grid'>
        {/* These cards show the main board totals quickly. */}
        <article className='dashboard-card accent'>
          <span>Total Tasks</span>
          <strong>{totals.total}</strong>
        </article>
        <article className='dashboard-card'>
          <span>Backlog</span>
          <strong>{totals.backlog}</strong>
        </article>
        <article className='dashboard-card'>
          <span>Todo</span>
          <strong>{totals.todo}</strong>
        </article>
        <article className='dashboard-card'>
          <span>In Progress</span>
          <strong>{totals.inprogress}</strong>
        </article>
        <article className='dashboard-card'>
          <span>Completed</span>
          <strong>{totals.completed}</strong>
        </article>
      </section>

      <section className='dashboard-table-wrap'>
        <div className='dashboard-section-head'>
          <h3>Task Breakdown</h3>
          <span>By type and priority</span>
        </div>

        {/* These panels break the tasks into useful groups. */}
        <div className='dashboard-table-grid'>
          <div className='dashboard-table-card'>
            <h4>By Type</h4>
            {Object.entries(totals.byType).map(([key, value]) => (
              <div key={key} className='dashboard-row'>
                <span>{key}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <div className='dashboard-table-card'>
            <h4>By Priority</h4>
            {Object.entries(totals.byPriority).map(([key, value]) => (
              <div key={key} className='dashboard-row'>
                <span>{key}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export default Dashboard
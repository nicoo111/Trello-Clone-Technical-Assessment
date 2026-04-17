import { Link, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import Board from './pages/Board'
import Dashboard from './pages/Dashboard'

// App renders the shared shell and routes between the dashboard and board pages.
function App() {
  return (
    <div className='app-shell'>
      {/* Top bar with the app name and navigation links. */}
      <header className='app-topbar'>
        <div>
          {/* Small label that tells the user what this app is for. */}
          <p className='app-eyebrow'>Project Workspace</p>
          {/* Main app title shown in the header. */}
          <h1 className='app-title'>Trello Clone</h1>
        </div>

        {/* Simple navigation so the user can switch pages. */}
        <nav className='app-nav'>
          {/* Go to the dashboard overview page. */}
          <Link to='/dashboard'>Dashboard</Link>
          {/* Go to the board page where tasks are managed. */}
          <Link to='/board'>Board</Link>
        </nav>
      </header>

      {/* Route the URL to the matching page. */}
      <Routes>
        {/* Default route sends the user to the dashboard. */}
        <Route path='/' element={<Navigate to='/dashboard' replace />} />
        {/* Dashboard page route. */}
        <Route path='/dashboard' element={<Dashboard />} />
        {/* Board page route. */}
        <Route path='/board' element={<Board />} />
      </Routes>
    </div>
  )
}

export default App

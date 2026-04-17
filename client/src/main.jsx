import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// Mount the React application into the root DOM node.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BrowserRouter lets the app use normal page-like routes. */}
    {/* StrictMode helps React warn about possible problems during development. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

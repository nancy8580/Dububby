import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import AdminModels from './pages/AdminModels'
import './index.css'
import axios from 'axios'

axios.defaults.withCredentials = true

function App(){
  return (
    <BrowserRouter>
      <div className="app-container">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Low-Code CRUD Admin</h1>
              <p className="text-sm muted">Publish models, manage data and permissions</p>
            </div>
            <nav className="space-x-3">
              <Link to="/" className="text-sm text-gray-700 hover:text-gray-900">Models</Link>
            </nav>
          </div>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<AdminModels/>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(<App />)

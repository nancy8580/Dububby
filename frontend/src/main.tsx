import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom'
import AdminModels from './pages/AdminModels'
import './index.css'
import { api } from './utils/api'

// Ensure cookies are sent for session-backed APIs (proxied via Vite)
api.defaults.withCredentials = true

function App(){
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-emerald-500" />
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Low‑Code CRUD Admin</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Publish models, manage data and permissions</p>
              </div>
            </div>
            <nav className="flex items-center gap-4 text-sm">
              <NavLink to="/" className={({isActive})=>`transition-colors hover:text-gray-900 ${isActive?'text-gray-900 font-medium':'text-gray-600'}`}>Models</NavLink>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<AdminModels/>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(<App />)

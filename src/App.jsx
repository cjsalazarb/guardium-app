import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Unauthorized from './pages/Unauthorized'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* SuperAdmin */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['superadmin']}>
            <Dashboard />
          </ProtectedRoute>
        } />

        {/* Admin por contrato */}
        <Route path="/contrato/:contractId/dashboard" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Dashboard />
          </ProtectedRoute>
        } />

        {/* Guardia - tablet */}
        <Route path="/tablet" element={
          <ProtectedRoute allowedRoles={['guardia']}>
            <div style={{ padding: 32, fontFamily: "'Nunito', sans-serif" }}>
              <h1>Portal Guardia</h1>
              <p>Modulo tablet en construccion...</p>
            </div>
          </ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

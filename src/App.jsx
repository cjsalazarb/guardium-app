import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminDashboardLegacy from './pages/AdminDashboard'
import AdminDashboard from './modules/admin/AdminDashboard'
import AdminContratoDetalle from './modules/admin/AdminContratoDetalle'
import AdminContratosList from './modules/admin/AdminContratosList'
import AdminContratoDashboard from './modules/admin/AdminContratoDashboard'
import Unauthorized from './pages/Unauthorized'
import ProtectedRoute from './components/ProtectedRoute'

import ContratosList from './modules/contratos/ContratosList'
import ContratoForm from './modules/contratos/ContratoForm'
import ContratoDetail from './modules/contratos/ContratoDetail'

import GuardiasList from './modules/guardias/GuardiasList'
import GuardiaForm from './modules/guardias/GuardiaForm'
import GuardiaDetail from './modules/guardias/GuardiaDetail'

import TurnosList from './modules/turnos/TurnosList'
import TabletPortal from './modules/tablet/TabletPortal'

import VisitantesList from './modules/visitantes/VisitantesList'
import VehiculosList from './modules/vehiculos/VehiculosList'
import PaquetesList from './modules/paquetes/PaquetesList'
import IncidentesList from './modules/incidentes/IncidentesList'
import NovedadesList from './modules/novedades/NovedadesList'
import ContratistasList from './modules/contratistas/ContratistasList'

import FacturacionList from './modules/facturacion/FacturacionList'

import PropuestasList from './modules/propuestas/PropuestasList'
import PropuestaForm from './modules/propuestas/PropuestaForm'
import PropuestaDashboard from './modules/propuestas/PropuestaDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* SuperAdmin Dashboard */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['superadmin']}>
            <Dashboard />
          </ProtectedRoute>
        } />

        {/* Admin — new flow */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/contratos/:id" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <AdminContratoDetalle />
          </ProtectedRoute>
        } />

        {/* Admin — DOMIA flow */}
        <Route path="/admin/contratos" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <AdminContratosList />
          </ProtectedRoute>
        } />
        <Route path="/admin/contratos/:id/dashboard" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <AdminContratoDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/contratos/:id/guardias" element={<ProtectedRoute allowedRoles={['superadmin', 'admin']}><GuardiasList /></ProtectedRoute>} />
        <Route path="/admin/contratos/:id/turnos" element={<ProtectedRoute allowedRoles={['superadmin', 'admin']}><TurnosList /></ProtectedRoute>} />
        <Route path="/admin/contratos/:id/novedades" element={<ProtectedRoute allowedRoles={['superadmin', 'admin']}><NovedadesList /></ProtectedRoute>} />
        <Route path="/admin/contratos/:id/visitantes" element={<ProtectedRoute allowedRoles={['superadmin', 'admin']}><VisitantesList /></ProtectedRoute>} />
        <Route path="/admin/contratos/:id/contratistas" element={<ProtectedRoute allowedRoles={['superadmin', 'admin']}><ContratistasList /></ProtectedRoute>} />
        <Route path="/admin/contratos/:id/vehiculos" element={<ProtectedRoute allowedRoles={['superadmin', 'admin']}><VehiculosList /></ProtectedRoute>} />
        <Route path="/admin/contratos/:id/paquetes" element={<ProtectedRoute allowedRoles={['superadmin', 'admin']}><PaquetesList /></ProtectedRoute>} />
        <Route path="/admin/contratos/:id/incidentes" element={<ProtectedRoute allowedRoles={['superadmin', 'admin']}><IncidentesList /></ProtectedRoute>} />
        <Route path="/admin/contratos/:id/facturacion" element={<ProtectedRoute allowedRoles={['superadmin', 'admin']}><FacturacionList /></ProtectedRoute>} />

        {/* Admin Dashboard (legacy) */}
        <Route path="/contrato/:contractId/dashboard" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboardLegacy />
          </ProtectedRoute>
        } />

        {/* Contratos */}
        <Route path="/contratos" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <ContratosList />
          </ProtectedRoute>
        } />
        <Route path="/contratos/nuevo" element={
          <ProtectedRoute allowedRoles={['superadmin']}>
            <ContratoForm />
          </ProtectedRoute>
        } />
        <Route path="/contratos/:id" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <ContratoDetail />
          </ProtectedRoute>
        } />
        <Route path="/contratos/:id/editar" element={
          <ProtectedRoute allowedRoles={['superadmin']}>
            <ContratoForm />
          </ProtectedRoute>
        } />

        {/* Guardias */}
        <Route path="/guardias" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <GuardiasList />
          </ProtectedRoute>
        } />
        <Route path="/guardias/nuevo" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <GuardiaForm />
          </ProtectedRoute>
        } />
        <Route path="/guardias/:id" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <GuardiaDetail />
          </ProtectedRoute>
        } />
        <Route path="/guardias/:id/editar" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <GuardiaForm />
          </ProtectedRoute>
        } />

        {/* Turnos */}
        <Route path="/turnos" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <TurnosList />
          </ProtectedRoute>
        } />

        {/* Portal Tablet */}
        <Route path="/tablet" element={
          <ProtectedRoute allowedRoles={['guardia']}>
            <TabletPortal />
          </ProtectedRoute>
        } />

        {/* F2 Modules */}
        <Route path="/visitantes" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin', 'guardia']}>
            <VisitantesList />
          </ProtectedRoute>
        } />
        <Route path="/vehiculos" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin', 'guardia']}>
            <VehiculosList />
          </ProtectedRoute>
        } />
        <Route path="/paquetes" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin', 'guardia']}>
            <PaquetesList />
          </ProtectedRoute>
        } />
        <Route path="/incidentes" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin', 'guardia']}>
            <IncidentesList />
          </ProtectedRoute>
        } />
        <Route path="/novedades" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <NovedadesList />
          </ProtectedRoute>
        } />
        <Route path="/contratistas" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin', 'guardia']}>
            <ContratistasList />
          </ProtectedRoute>
        } />

        {/* Facturacion */}
        <Route path="/facturacion" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <FacturacionList />
          </ProtectedRoute>
        } />

        {/* Propuestas */}
        <Route path="/propuestas" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <PropuestasList />
          </ProtectedRoute>
        } />
        <Route path="/propuestas/dashboard" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <PropuestaDashboard />
          </ProtectedRoute>
        } />
        <Route path="/propuestas/nueva" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <PropuestaForm />
          </ProtectedRoute>
        } />
        <Route path="/propuestas/:id" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <PropuestaForm />
          </ProtectedRoute>
        } />
        <Route path="/propuestas/:id/editar" element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <PropuestaForm />
          </ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

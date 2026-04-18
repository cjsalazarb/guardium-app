import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { T } from '../styles/tokens'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth()
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:T.BLACK,color:T.WHITE,fontFamily:T.FONT_BODY}}>Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/unauthorized" replace />
  return children
}

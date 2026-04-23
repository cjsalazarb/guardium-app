import { useLocation, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import AdminContratoSidebar from './AdminContratoSidebar'
import { supabase } from '../lib/supabase'
import { T } from '../styles/tokens'

export default function Layout({ children }) {
  const location = useLocation()
  const { id: routeContractId } = useParams()
  const isAdminContrato = location.pathname.startsWith('/admin/contratos/') && routeContractId
  const [contractName, setContractName] = useState('')

  useEffect(() => {
    if (isAdminContrato && routeContractId) {
      supabase.from('contracts').select('client_name').eq('id', routeContractId).single()
        .then(({ data }) => { if (data) setContractName(data.client_name) })
    }
  }, [routeContractId, isAdminContrato])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.BG }}>
      {isAdminContrato
        ? <AdminContratoSidebar contractId={routeContractId} contractName={contractName} />
        : <Sidebar />
      }
      <div style={{ marginLeft: 220, flex: 1, padding: 32, fontFamily: T.FONT_BODY }}>
        {children}
      </div>
    </div>
  )
}

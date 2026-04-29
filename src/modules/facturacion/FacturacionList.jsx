import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import Layout from '../../components/Layout'
import Toast from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { T } from '../../styles/tokens'

const STATUS_CHIP = {
  pendiente: { bg: T.WARN_BG, color: T.WARN, label: 'Pendiente' },
  pagado:    { bg: T.SUCCESS_BG, color: T.SUCCESS, label: 'Pagado' },
  vencido:   { bg: T.DANGER_BG, color: T.DANGER, label: 'Vencido' },
}

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function chipStyle(status) {
  const s = STATUS_CHIP[status] || STATUS_CHIP.pendiente
  return {
    display: 'inline-block', padding: '4px 12px', borderRadius: 999,
    fontSize: 12, fontWeight: 700, fontFamily: T.FONT_BODY,
    background: s.bg, color: s.color,
  }
}

function daysOverdue(dueDate) {
  if (!dueDate) return 0
  const diff = Math.floor((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

export default function FacturacionList() {
  const { role } = useAuth()
  const { id: routeContractId } = useParams()
  const location = useLocation()
  const isAdminContrato = location.pathname.startsWith('/admin/contratos/')
  const effectiveContractId = (isAdminContrato && routeContractId) ? routeContractId : null
  const [invoices, setInvoices] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Filters
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterContract, setFilterContract] = useState('')

  // Form
  const [form, setForm] = useState({
    contract_id: effectiveContractId || '', amount: '', period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(), due_date: '', notes: '',
  })

  useEffect(() => { loadContracts() }, [])
  useEffect(() => { loadInvoices() }, [filterMonth, filterYear, filterStatus, filterContract, effectiveContractId])

  async function loadContracts() {
    const { data, error: dbErr } = await supabase.from('contracts').select('id, client_name, monthly_amount').order('client_name')
    if (dbErr) { setError('Error al cargar contratos. Intente de nuevo.'); return }
    setContracts(data || [])
  }

  async function loadInvoices() {
    let q = supabase.from('invoices').select('*, contract:contracts(client_name, monthly_amount)').order('created_at', { ascending: false })
    if (filterMonth) q = q.eq('period_month', Number(filterMonth))
    if (filterYear) q = q.eq('period_year', Number(filterYear))
    if (filterStatus) q = q.eq('status', filterStatus)
    if (effectiveContractId) q = q.eq('contract_id', effectiveContractId)
    else if (filterContract) q = q.eq('contract_id', filterContract)
    const { data, error: dbErr } = await q
    if (dbErr) { setError('Error al cargar facturas. Intente de nuevo.'); setLoading(false); return }
    setInvoices(data || [])
    setLoading(false)
  }

  function handleContractSelect(contractId) {
    const c = contracts.find(c => c.id === contractId)
    setForm(prev => ({
      ...prev,
      contract_id: contractId,
      amount: c?.monthly_amount ? String(c.monthly_amount) : prev.amount,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.contract_id || !form.amount || !form.due_date) return
    setSaving(true)
    const { error: dbErr } = await supabase.from('invoices').insert({
      contract_id: form.contract_id,
      amount: Number(form.amount),
      period_month: Number(form.period_month),
      period_year: Number(form.period_year),
      due_date: form.due_date,
      notes: form.notes || null,
      status: 'pendiente',
    })
    if (dbErr) { setError('Error al crear factura. Intente de nuevo.'); setSaving(false); return }
    setShowForm(false)
    setForm({ contract_id: effectiveContractId || '', amount: '', period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear(), due_date: '', notes: '' })
    loadInvoices()
    setSaving(false)
  }

  async function markAsPaid(id) {
    const { error: dbErr } = await supabase.from('invoices').update({ status: 'pagado', paid_at: new Date().toISOString() }).eq('id', id)
    if (dbErr) { setError('Error al actualizar factura. Intente de nuevo.'); return }
    loadInvoices()
  }

  // Summary
  const totalPending = invoices.filter(i => i.status === 'pendiente').reduce((s, i) => s + Number(i.amount || 0), 0)
  const totalOverdue = invoices.filter(i => i.status === 'vencido').length
  const totalPaid = invoices.filter(i => i.status === 'pagado').reduce((s, i) => s + Number(i.amount || 0), 0)

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: T.RADIUS_SM,
    border: `1px solid ${T.BORDER}`, fontFamily: T.FONT_BODY, fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { fontFamily: T.FONT_BODY, fontSize: 13, fontWeight: 600, color: T.TEXT, marginBottom: 4, display: 'block' }
  const thStyle = { padding: '12px 16px', textAlign: 'left', fontFamily: T.FONT_BODY, fontSize: 12, fontWeight: 700, color: T.TEXT_MUTED, borderBottom: `2px solid ${T.BORDER}`, whiteSpace: 'nowrap' }
  const tdStyle = { padding: '12px 16px', fontFamily: T.FONT_BODY, fontSize: 14, color: T.TEXT, borderBottom: `1px solid ${T.BORDER}` }

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: 0 }}>FACTURACION</h1>
          <p style={{ fontFamily: T.FONT_BODY, fontSize: 14, color: T.TEXT_MUTED, margin: '4px 0 0' }}>Gestion de facturas y pagos de contratos</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: T.RED, color: T.WHITE, border: 'none', borderRadius: T.RADIUS_SM,
            padding: '12px 24px', fontFamily: T.FONT_BODY, fontSize: 14, fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {showForm ? 'Cancelar' : '+ Nueva factura'}
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, padding: 20, boxShadow: T.SHADOW }}>
          <div style={{ fontSize: 28, fontFamily: T.FONT_DISPLAY, color: T.WARN, marginBottom: 4 }}>Bs. {totalPending.toLocaleString()}</div>
          <div style={{ fontSize: 13, fontFamily: T.FONT_BODY, color: T.TEXT_MUTED }}>Monto pendiente</div>
        </div>
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, padding: 20, boxShadow: T.SHADOW }}>
          <div style={{ fontSize: 28, fontFamily: T.FONT_DISPLAY, color: T.DANGER, marginBottom: 4 }}>{totalOverdue}</div>
          <div style={{ fontSize: 13, fontFamily: T.FONT_BODY, color: T.TEXT_MUTED }}>Facturas vencidas</div>
        </div>
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, padding: 20, boxShadow: T.SHADOW }}>
          <div style={{ fontSize: 28, fontFamily: T.FONT_DISPLAY, color: T.SUCCESS, marginBottom: 4 }}>Bs. {totalPaid.toLocaleString()}</div>
          <div style={{ fontSize: 13, fontFamily: T.FONT_BODY, color: T.TEXT_MUTED }}>Total cobrado</div>
        </div>
      </div>

      {/* Overdue Alert */}
      {totalOverdue > 0 && (
        <div style={{ background: T.DANGER_BG, borderRadius: T.RADIUS_SM, padding: '12px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, fontFamily: T.FONT_BODY }}>
          <span style={{ fontSize: 18 }}>{'\u26A0\uFE0F'}</span>
          <span style={{ color: T.DANGER, fontSize: 14, fontWeight: 600 }}>
            Hay {totalOverdue} factura{totalOverdue > 1 ? 's' : ''} vencida{totalOverdue > 1 ? 's' : ''} que requieren atencion.
          </span>
        </div>
      )}

      {/* Create Invoice Form */}
      {showForm && (
        <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, padding: 28, boxShadow: T.SHADOW, marginBottom: 24 }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, color: T.TEXT, margin: '0 0 20px', fontSize: 20 }}>NUEVA FACTURA</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {!isAdminContrato ? (
                <div>
                  <label style={labelStyle}>Contrato *</label>
                  <select
                    value={form.contract_id}
                    onChange={e => handleContractSelect(e.target.value)}
                    style={inputStyle}
                    required
                  >
                    <option value="">Seleccionar contrato</option>
                    {contracts.map(c => (
                      <option key={c.id} value={c.id}>{c.client_name}</option>
                    ))}
                  </select>
                </div>
              ) : <div />}
              <div>
                <label style={labelStyle}>Monto (Bs.) *</label>
                <input
                  type="number" step="0.01" value={form.amount}
                  onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  style={inputStyle} placeholder="0.00" required
                />
              </div>
              <div>
                <label style={labelStyle}>Mes</label>
                <select value={form.period_month} onChange={e => setForm(prev => ({ ...prev, period_month: e.target.value }))} style={inputStyle}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Ano</label>
                <select value={form.period_year} onChange={e => setForm(prev => ({ ...prev, period_year: e.target.value }))} style={inputStyle}>
                  {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fecha de vencimiento *</label>
                <input
                  type="date" value={form.due_date}
                  onChange={e => setForm(prev => ({ ...prev, due_date: e.target.value }))}
                  style={inputStyle} required
                />
              </div>
              <div>
                <label style={labelStyle}>Notas</label>
                <input
                  type="text" value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  style={inputStyle} placeholder="Notas opcionales"
                />
              </div>
            </div>
            <button
              type="submit" disabled={saving}
              style={{
                background: T.RED, color: T.WHITE, border: 'none', borderRadius: T.RADIUS_SM,
                padding: '12px 32px', fontFamily: T.FONT_BODY, fontSize: 14, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Guardando...' : 'Crear factura'}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {!isAdminContrato && (
          <select value={filterContract} onChange={e => setFilterContract(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 180 }}>
            <option value="">Todos los contratos</option>
            {contracts.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
          </select>
        )}
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 140 }}>
          <option value="">Todos los meses</option>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 110 }}>
          <option value="">Todos los anos</option>
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 140 }}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagado">Pagado</option>
          <option value="vencido">Vencido</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', fontFamily: T.FONT_BODY, color: T.TEXT_MUTED }}>Cargando facturas...</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', fontFamily: T.FONT_BODY, color: T.TEXT_MUTED }}>No se encontraron facturas</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.BG }}>
                <th style={thStyle}>Contrato</th>
                <th style={thStyle}>Periodo</th>
                <th style={thStyle}>Monto (Bs.)</th>
                <th style={thStyle}>Vencimiento</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Pagado</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const overdue = inv.status === 'pendiente' && inv.due_date && new Date(inv.due_date) < new Date()
                const displayStatus = overdue ? 'vencido' : inv.status
                const days = daysOverdue(inv.due_date)
                return (
                  <tr key={inv.id}>
                    <td style={tdStyle}>{inv.contract?.client_name || '—'}</td>
                    <td style={tdStyle}>{MONTHS[(inv.period_month || 1) - 1]} {inv.period_year}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>Bs. {Number(inv.amount || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
                    <td style={tdStyle}>
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString('es-BO') : '—'}
                      {overdue && <span style={{ display: 'block', fontSize: 11, color: T.DANGER, fontWeight: 600 }}>{days} dias vencido</span>}
                    </td>
                    <td style={tdStyle}><span style={chipStyle(displayStatus)}>{STATUS_CHIP[displayStatus]?.label || displayStatus}</span></td>
                    <td style={tdStyle}>{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('es-BO') : '—'}</td>
                    <td style={tdStyle}>
                      {inv.status !== 'pagado' && (
                        <button
                          onClick={() => markAsPaid(inv.id)}
                          style={{
                            background: T.SUCCESS_BG, color: T.SUCCESS, border: `1px solid ${T.SUCCESS}`,
                            borderRadius: T.RADIUS_SM, padding: '6px 14px', fontFamily: T.FONT_BODY,
                            fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          Marcar pagado
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <Toast message={error} onClose={() => setError(null)} />
    </Layout>
  )
}

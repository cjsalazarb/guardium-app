import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../../components/Layout'
import Toast from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { T } from '../../styles/tokens'

const defaultForm = {
  client_name: '', client_contact: '', client_email: '', client_phone: '', client_address: '',
  title: '', valid_until: '', notes: '', status: 'borrador',
  num_guards: 1, monthly_salary: 2500,
  cell_enabled: false, cell_qty: 0, cell_cost: 0,
  tablet_enabled: false, tablet_qty: 0, tablet_cost: 0,
  uniform_cost_per_set: 350, uniform_changes_per_year: 2,
  implementos: [],
  otros: [],
  admin_margin_pct: 15, manual_adjustment: 0,
}

export default function PropuestaForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ ...defaultForm })

  useEffect(() => {
    if (isEdit) {
      supabase.from('proposals').select('*').eq('id', id).single().then(({ data }) => {
        if (data) {
          setForm({
            client_name: data.client_name || '',
            client_contact: data.client_contact || '',
            client_email: data.client_email || '',
            client_phone: data.client_phone || '',
            client_address: data.client_address || '',
            title: data.title || '',
            valid_until: data.valid_until || '',
            notes: data.notes || '',
            status: data.status || 'borrador',
            num_guards: data.cost_data?.num_guards ?? 1,
            monthly_salary: data.cost_data?.monthly_salary ?? 2500,
            cell_enabled: data.cost_data?.cell_enabled ?? false,
            cell_qty: data.cost_data?.cell_qty ?? 0,
            cell_cost: data.cost_data?.cell_cost ?? 0,
            tablet_enabled: data.cost_data?.tablet_enabled ?? false,
            tablet_qty: data.cost_data?.tablet_qty ?? 0,
            tablet_cost: data.cost_data?.tablet_cost ?? 0,
            uniform_cost_per_set: data.cost_data?.uniform_cost_per_set ?? 350,
            uniform_changes_per_year: data.cost_data?.uniform_changes_per_year ?? 2,
            implementos: data.cost_data?.implementos ?? [],
            otros: data.cost_data?.otros ?? [],
            admin_margin_pct: data.cost_data?.admin_margin_pct ?? 15,
            manual_adjustment: data.cost_data?.manual_adjustment ?? 0,
          })
        }
      })
    }
  }, [id, isEdit])

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  /* ---------- CALCULATIONS ---------- */
  const calcs = useMemo(() => {
    const guards = Number(form.num_guards) || 0
    const salary = Number(form.monthly_salary) || 0
    const personalMonthly = guards * salary
    const personalAnnual = personalMonthly * 12

    const cellTotal = form.cell_enabled ? (Number(form.cell_qty) || 0) * (Number(form.cell_cost) || 0) : 0
    const tabletTotal = form.tablet_enabled ? (Number(form.tablet_qty) || 0) * (Number(form.tablet_cost) || 0) : 0
    const equipMonthly = (cellTotal + tabletTotal) / 12

    const uniformTotal = guards * (Number(form.uniform_cost_per_set) || 0) * (Number(form.uniform_changes_per_year) || 0)
    const uniformMonthly = uniformTotal / 12

    const implementoTotal = form.implementos.reduce((s, it) => s + (Number(it.global_price) || 0), 0)
    const implementoMonthly = implementoTotal / 12

    const otrosMonthly = form.otros.reduce((s, it) => {
      const amt = Number(it.amount) || 0
      if (it.frequency === 'mensual') return s + amt
      if (it.frequency === 'anual') return s + amt / 12
      return s + amt / 12 // unico prorated
    }, 0)

    const subtotal = personalMonthly + equipMonthly + uniformMonthly + implementoMonthly + otrosMonthly
    const marginPct = Number(form.admin_margin_pct) || 0
    const marginAmount = subtotal * (marginPct / 100)
    const adjustment = Number(form.manual_adjustment) || 0
    const totalMonthly = subtotal + marginAmount + adjustment
    const totalAnnual = totalMonthly * 12

    return {
      personalMonthly, personalAnnual,
      cellTotal, tabletTotal, equipMonthly,
      uniformTotal, uniformMonthly,
      implementoTotal, implementoMonthly,
      otrosMonthly,
      subtotal, marginAmount, totalMonthly, totalAnnual,
    }
  }, [form])

  /* ---------- SAVE ---------- */
  async function handleSave(newStatus) {
    setSaving(true)
    const cost_data = {
      num_guards: Number(form.num_guards), monthly_salary: Number(form.monthly_salary),
      cell_enabled: form.cell_enabled, cell_qty: Number(form.cell_qty), cell_cost: Number(form.cell_cost),
      tablet_enabled: form.tablet_enabled, tablet_qty: Number(form.tablet_qty), tablet_cost: Number(form.tablet_cost),
      uniform_cost_per_set: Number(form.uniform_cost_per_set), uniform_changes_per_year: Number(form.uniform_changes_per_year),
      implementos: form.implementos, otros: form.otros,
      admin_margin_pct: Number(form.admin_margin_pct), manual_adjustment: Number(form.manual_adjustment),
    }
    const payload = {
      client_name: form.client_name, client_contact: form.client_contact,
      client_email: form.client_email, client_phone: form.client_phone,
      client_address: form.client_address, title: form.title,
      valid_until: form.valid_until || null, notes: form.notes,
      status: newStatus || form.status,
      cost_data,
      total_amount: calcs.totalMonthly,
    }
    try {
      let dbErr
      if (isEdit) {
        const r = await supabase.from('proposals').update(payload).eq('id', id)
        dbErr = r.error
      } else {
        const r = await supabase.from('proposals').insert(payload)
        dbErr = r.error
      }
      if (dbErr) throw dbErr
      navigate('/propuestas')
    } catch (err) {
      console.error('Error guardando propuesta:', err)
      setError('Error al guardar propuesta: ' + (err.message || 'Intente de nuevo.'))
    } finally {
      setSaving(false)
    }
  }

  /* ---------- DYNAMIC LISTS ---------- */
  function addImplemento() {
    setForm(prev => ({ ...prev, implementos: [...prev.implementos, { description: '', global_price: 0 }] }))
  }
  function updateImplemento(idx, field, value) {
    setForm(prev => {
      const list = [...prev.implementos]
      list[idx] = { ...list[idx], [field]: value }
      return { ...prev, implementos: list }
    })
  }
  function removeImplemento(idx) {
    setForm(prev => ({ ...prev, implementos: prev.implementos.filter((_, i) => i !== idx) }))
  }

  function addOtro() {
    setForm(prev => ({ ...prev, otros: [...prev.otros, { description: '', amount: 0, frequency: 'mensual' }] }))
  }
  function updateOtro(idx, field, value) {
    setForm(prev => {
      const list = [...prev.otros]
      list[idx] = { ...list[idx], [field]: value }
      return { ...prev, otros: list }
    })
  }
  function removeOtro(idx) {
    setForm(prev => ({ ...prev, otros: prev.otros.filter((_, i) => i !== idx) }))
  }

  /* ---------- STYLES ---------- */
  const inputStyle = {
    width: '100%', padding: '10px 14px', border: `1px solid ${T.BORDER}`,
    borderRadius: T.RADIUS_SM, fontSize: 15, fontFamily: T.FONT_BODY,
    outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }
  const sectionTitle = {
    fontFamily: T.FONT_DISPLAY, fontSize: 22, color: T.PRIMARY, margin: '0 0 16px',
    paddingBottom: 8, borderBottom: `2px solid ${T.BORDER}`, letterSpacing: '0.04em',
  }
  const cardStyle = {
    background: T.WHITE, borderRadius: T.CARD_RADIUS, boxShadow: T.SHADOW, padding: 32, marginBottom: 24,
  }
  const readOnlyStyle = {
    ...inputStyle, background: T.BG, color: T.TEXT_MUTED, cursor: 'default',
  }
  const smallBtnStyle = {
    padding: '6px 14px', background: T.BG, border: `1px solid ${T.BORDER}`,
    borderRadius: 6, cursor: 'pointer', fontSize: 13, color: T.TEXT, fontFamily: T.FONT_BODY,
  }

  const fmt = (n) => Number(n).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <Layout>
      <h1 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 36, color: T.TEXT, margin: '0 0 24px' }}>
        {isEdit ? 'EDITAR PROPUESTA' : 'NUEVA PROPUESTA'}
      </h1>

      {/* ==================== SECTION 1: CLIENT DATA ==================== */}
      <div style={cardStyle}>
        <h2 style={sectionTitle}>DATOS DEL CLIENTE</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Nombre del cliente *</label>
            <input style={inputStyle} value={form.client_name} onChange={e => handleChange('client_name', e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>Persona de contacto</label>
            <input style={inputStyle} value={form.client_contact} onChange={e => handleChange('client_contact', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" style={inputStyle} value={form.client_email} onChange={e => handleChange('client_email', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Telefono</label>
            <input style={inputStyle} value={form.client_phone} onChange={e => handleChange('client_phone', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Direccion</label>
            <input style={inputStyle} value={form.client_address} onChange={e => handleChange('client_address', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Titulo de la propuesta *</label>
            <input style={inputStyle} value={form.title} onChange={e => handleChange('title', e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>Valida hasta</label>
            <input type="date" style={inputStyle} value={form.valid_until} onChange={e => handleChange('valid_until', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Notas</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.notes} onChange={e => handleChange('notes', e.target.value)} />
          </div>
        </div>
      </div>

      {/* ==================== SECTION 2: COST CALCULATOR ==================== */}
      <div style={cardStyle}>
        <h2 style={sectionTitle}>CALCULADORA DE COSTOS</h2>

        {/* --- a) PERSONAL DE SEGURIDAD --- */}
        <div style={{ marginBottom: 28, padding: 20, background: T.BG, borderRadius: T.RADIUS_SM }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 18, color: T.TEXT, margin: '0 0 12px', letterSpacing: '0.04em' }}>PERSONAL DE SEGURIDAD</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Nro. guardias</label>
              <input type="number" min="0" style={inputStyle} value={form.num_guards} onChange={e => handleChange('num_guards', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Salario mensual (Bs.)</label>
              <input type="number" min="0" step="0.01" style={inputStyle} value={form.monthly_salary} onChange={e => handleChange('monthly_salary', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Costo mensual (Bs.)</label>
              <input style={readOnlyStyle} value={`Bs. ${fmt(calcs.personalMonthly)}`} readOnly />
            </div>
            <div>
              <label style={labelStyle}>Costo anual (Bs.)</label>
              <input style={readOnlyStyle} value={`Bs. ${fmt(calcs.personalAnnual)}`} readOnly />
            </div>
          </div>
        </div>

        {/* --- b) EQUIPAMIENTO --- */}
        <div style={{ marginBottom: 28, padding: 20, background: T.BG, borderRadius: T.RADIUS_SM }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 18, color: T.TEXT, margin: '0 0 12px', letterSpacing: '0.04em' }}>EQUIPAMIENTO</h3>
          {/* Celular */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <label style={{ ...labelStyle, marginBottom: 0, minWidth: 90 }}>Celulares</label>
            <button
              type="button"
              onClick={() => handleChange('cell_enabled', !form.cell_enabled)}
              style={{
                padding: '6px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                background: form.cell_enabled ? T.SUCCESS_BG : T.MUTED_BG,
                color: form.cell_enabled ? T.SUCCESS : T.MUTED,
              }}
            >
              {form.cell_enabled ? 'ON' : 'OFF'}
            </button>
            {form.cell_enabled && (
              <>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 2 }}>Cantidad</label>
                  <input type="number" min="0" style={{ ...inputStyle, width: 80 }} value={form.cell_qty} onChange={e => handleChange('cell_qty', e.target.value)} />
                </div>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 2 }}>Costo unitario (Bs.)</label>
                  <input type="number" min="0" step="0.01" style={{ ...inputStyle, width: 120 }} value={form.cell_cost} onChange={e => handleChange('cell_cost', e.target.value)} />
                </div>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 2 }}>Total</label>
                  <span style={{ fontWeight: 600, fontFamily: T.FONT_BODY }}>Bs. {fmt(calcs.cellTotal)}</span>
                </div>
              </>
            )}
          </div>
          {/* Tablet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <label style={{ ...labelStyle, marginBottom: 0, minWidth: 90 }}>Tablets</label>
            <button
              type="button"
              onClick={() => handleChange('tablet_enabled', !form.tablet_enabled)}
              style={{
                padding: '6px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                background: form.tablet_enabled ? T.SUCCESS_BG : T.MUTED_BG,
                color: form.tablet_enabled ? T.SUCCESS : T.MUTED,
              }}
            >
              {form.tablet_enabled ? 'ON' : 'OFF'}
            </button>
            {form.tablet_enabled && (
              <>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 2 }}>Cantidad</label>
                  <input type="number" min="0" style={{ ...inputStyle, width: 80 }} value={form.tablet_qty} onChange={e => handleChange('tablet_qty', e.target.value)} />
                </div>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 2 }}>Costo unitario (Bs.)</label>
                  <input type="number" min="0" step="0.01" style={{ ...inputStyle, width: 120 }} value={form.tablet_cost} onChange={e => handleChange('tablet_cost', e.target.value)} />
                </div>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 2 }}>Total</label>
                  <span style={{ fontWeight: 600, fontFamily: T.FONT_BODY }}>Bs. {fmt(calcs.tabletTotal)}</span>
                </div>
              </>
            )}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>
            Prorrateo mensual equipamiento: <strong>Bs. {fmt(calcs.equipMonthly)}</strong>
          </div>
        </div>

        {/* --- c) UNIFORMES --- */}
        <div style={{ marginBottom: 28, padding: 20, background: T.BG, borderRadius: T.RADIUS_SM }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 18, color: T.TEXT, margin: '0 0 12px', letterSpacing: '0.04em' }}>UNIFORMES</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Nro. guardias</label>
              <input type="number" style={readOnlyStyle} value={form.num_guards} readOnly />
            </div>
            <div>
              <label style={labelStyle}>Costo por juego (Bs.)</label>
              <input type="number" min="0" step="0.01" style={inputStyle} value={form.uniform_cost_per_set} onChange={e => handleChange('uniform_cost_per_set', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Cambios/ano</label>
              <input type="number" min="0" style={inputStyle} value={form.uniform_changes_per_year} onChange={e => handleChange('uniform_changes_per_year', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Total anual (Bs.)</label>
              <input style={readOnlyStyle} value={`Bs. ${fmt(calcs.uniformTotal)}`} readOnly />
            </div>
            <div>
              <label style={labelStyle}>Mensual (Bs.)</label>
              <input style={readOnlyStyle} value={`Bs. ${fmt(calcs.uniformMonthly)}`} readOnly />
            </div>
          </div>
        </div>

        {/* --- d) IMPLEMENTOS --- */}
        <div style={{ marginBottom: 28, padding: 20, background: T.BG, borderRadius: T.RADIUS_SM }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 18, color: T.TEXT, margin: '0 0 8px', letterSpacing: '0.04em' }}>IMPLEMENTOS</h3>
          <p style={{ fontSize: 12, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY, margin: '0 0 12px' }}>Precio global prorrateado mensualmente (/ 12)</p>
          {form.implementos.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 2 }}>
                <label style={labelStyle}>Descripcion</label>
                <input style={inputStyle} value={item.description} onChange={e => updateImplemento(idx, 'description', e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Precio global (Bs.)</label>
                <input type="number" min="0" step="0.01" style={inputStyle} value={item.global_price} onChange={e => updateImplemento(idx, 'global_price', e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Mensual</label>
                <input style={readOnlyStyle} value={`Bs. ${fmt((Number(item.global_price) || 0) / 12)}`} readOnly />
              </div>
              <button type="button" onClick={() => removeImplemento(idx)} style={{ ...smallBtnStyle, color: T.DANGER, borderColor: T.DANGER, marginBottom: 2 }}>X</button>
            </div>
          ))}
          <button type="button" onClick={addImplemento} style={{ ...smallBtnStyle, background: T.PRIMARY, color: T.WHITE, border: 'none', marginTop: 4 }}>+ Agregar implemento</button>
          <div style={{ marginTop: 12, fontSize: 13, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>
            Total implementos: Bs. {fmt(calcs.implementoTotal)} | Mensual: <strong>Bs. {fmt(calcs.implementoMonthly)}</strong>
          </div>
        </div>

        {/* --- e) OTROS --- */}
        <div style={{ marginBottom: 12, padding: 20, background: T.BG, borderRadius: T.RADIUS_SM }}>
          <h3 style={{ fontFamily: T.FONT_DISPLAY, fontSize: 18, color: T.TEXT, margin: '0 0 12px', letterSpacing: '0.04em' }}>OTROS COSTOS</h3>
          {form.otros.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 2 }}>
                <label style={labelStyle}>Descripcion</label>
                <input style={inputStyle} value={item.description} onChange={e => updateOtro(idx, 'description', e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Monto (Bs.)</label>
                <input type="number" min="0" step="0.01" style={inputStyle} value={item.amount} onChange={e => updateOtro(idx, 'amount', e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Frecuencia</label>
                <select style={inputStyle} value={item.frequency} onChange={e => updateOtro(idx, 'frequency', e.target.value)}>
                  <option value="mensual">Mensual</option>
                  <option value="anual">Anual</option>
                  <option value="unico">Unico</option>
                </select>
              </div>
              <button type="button" onClick={() => removeOtro(idx)} style={{ ...smallBtnStyle, color: T.DANGER, borderColor: T.DANGER, marginBottom: 2 }}>X</button>
            </div>
          ))}
          <button type="button" onClick={addOtro} style={{ ...smallBtnStyle, background: T.PRIMARY, color: T.WHITE, border: 'none', marginTop: 4 }}>+ Agregar otro costo</button>
          <div style={{ marginTop: 12, fontSize: 13, color: T.TEXT_MUTED, fontFamily: T.FONT_BODY }}>
            Mensual otros: <strong>Bs. {fmt(calcs.otrosMonthly)}</strong>
          </div>
        </div>
      </div>

      {/* ==================== SECTION 3: MARGIN & TOTALS ==================== */}
      <div style={cardStyle}>
        <h2 style={sectionTitle}>MARGEN Y TOTALES</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={labelStyle}>Subtotal mensual (Bs.)</label>
            <input style={readOnlyStyle} value={`Bs. ${fmt(calcs.subtotal)}`} readOnly />
          </div>
          <div>
            <label style={labelStyle}>Margen administrativo (%)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="range" min="0" max="50" step="1"
                value={form.admin_margin_pct}
                onChange={e => handleChange('admin_margin_pct', e.target.value)}
                style={{ flex: 1 }}
              />
              <input
                type="number" min="0" max="100" step="1"
                style={{ ...inputStyle, width: 70, textAlign: 'center' }}
                value={form.admin_margin_pct}
                onChange={e => handleChange('admin_margin_pct', e.target.value)}
              />
              <span style={{ fontSize: 13, color: T.TEXT_MUTED }}>= Bs. {fmt(calcs.marginAmount)}</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Ajuste manual (Bs.)</label>
            <input type="number" step="0.01" style={inputStyle} value={form.manual_adjustment} onChange={e => handleChange('manual_adjustment', e.target.value)} />
          </div>
        </div>

        {/* TOTAL PROMINENT */}
        <div style={{
          display: 'flex', gap: 24, padding: 24, borderRadius: T.RADIUS_SM,
          background: `linear-gradient(135deg, ${T.PRIMARY}, #2A4F8F)`,
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: T.FONT_DISPLAY, fontSize: 16, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em' }}>TOTAL MENSUAL</div>
            <div style={{ fontFamily: T.FONT_DISPLAY, fontSize: 42, color: T.WHITE, lineHeight: 1.1, marginTop: 4 }}>
              Bs. {fmt(calcs.totalMonthly)}
            </div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: T.FONT_DISPLAY, fontSize: 16, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em' }}>TOTAL ANUAL</div>
            <div style={{ fontFamily: T.FONT_DISPLAY, fontSize: 42, color: T.ACCENT, lineHeight: 1.1, marginTop: 4 }}>
              Bs. {fmt(calcs.totalAnnual)}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== ACTION BUTTONS ==================== */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
        <button
          type="button" disabled={saving}
          onClick={() => handleSave('borrador')}
          style={{
            padding: '12px 32px', background: T.WHITE, color: T.TEXT,
            border: `1px solid ${T.BORDER}`, borderRadius: T.RADIUS_SM,
            cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 16, letterSpacing: '0.04em',
          }}
        >
          {saving ? 'GUARDANDO...' : 'GUARDAR BORRADOR'}
        </button>
        <button
          type="button" disabled={saving}
          onClick={() => { /* placeholder: PDF generation */ alert('Funcion de PDF en desarrollo') }}
          style={{
            padding: '12px 32px', background: T.PRIMARY, color: T.WHITE,
            border: 'none', borderRadius: T.RADIUS_SM,
            cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 16, letterSpacing: '0.04em',
          }}
        >
          GENERAR PDF
        </button>
        <button
          type="button" disabled={saving}
          onClick={() => handleSave('enviada')}
          style={{
            padding: '12px 32px', background: T.RED, color: T.WHITE,
            border: 'none', borderRadius: T.RADIUS_SM,
            cursor: 'pointer', fontFamily: T.FONT_DISPLAY, fontSize: 16, letterSpacing: '0.04em',
          }}
        >
          MARCAR COMO ENVIADA
        </button>
        <button
          type="button"
          onClick={() => navigate('/propuestas')}
          style={{
            padding: '12px 32px', background: T.BG, color: T.TEXT,
            border: `1px solid ${T.BORDER}`, borderRadius: T.RADIUS_SM,
            cursor: 'pointer', fontFamily: T.FONT_BODY, fontSize: 15,
          }}
        >
          Cancelar
        </button>
      </div>
      <Toast message={error} onClose={() => setError(null)} />
    </Layout>
  )
}

import jsPDF from 'jspdf'
import 'jspdf-autotable'

function addHeader(doc, title, contractName, period) {
  const PRIMARY = '#1B3A6B'
  const pageW = doc.internal.pageSize.getWidth()
  doc.setFillColor(PRIMARY)
  doc.rect(0, 0, pageW, 30, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor('#FFFFFF')
  doc.text('GUARDIUM', 14, 15)
  doc.setFontSize(10)
  doc.text(title, 14, 23)
  if (contractName) {
    doc.setFontSize(9)
    doc.setTextColor('#CCCCCC')
    doc.text(contractName, pageW - 14, 15, { align: 'right' })
  }
  if (period) {
    doc.text(period, pageW - 14, 23, { align: 'right' })
  }
}

function addFooter(doc, user) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFontSize(7)
  doc.setTextColor('#999999')
  doc.text(`Generado: ${new Date().toLocaleString()} | ${user || 'GUARDIUM'}`, 14, pageH - 7)
  doc.text(`Pagina ${doc.internal.getNumberOfPages()}`, pageW - 25, pageH - 7)
}

export function generateShiftsReport(shifts, contractName, period, user) {
  const doc = new jsPDF()
  addHeader(doc, 'REPORTE DE TURNOS', contractName, period)
  doc.autoTable({
    startY: 38,
    head: [['Guardia', 'Fecha', 'Inicio', 'Fin', 'Estado']],
    body: shifts.map(s => [
      s.guard?.full_name || '—',
      new Date(s.start_time).toLocaleDateString(),
      new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      s.status,
    ]),
    theme: 'striped',
    headStyles: { fillColor: '#1B3A6B' },
  })
  const total = shifts.length
  const completed = shifts.filter(s => s.status === 'completado').length
  const absent = shifts.filter(s => s.status === 'ausente').length
  const finalY = doc.lastAutoTable.finalY + 10
  doc.setFontSize(10)
  doc.setTextColor('#333333')
  doc.text(`Total: ${total} | Completados: ${completed} | Ausentes: ${absent} | Asistencia: ${total > 0 ? Math.round((completed/total)*100) : 0}%`, 14, finalY)
  addFooter(doc, user)
  doc.save(`GUARDIUM_Turnos_${contractName || 'Reporte'}_${new Date().toISOString().split('T')[0]}.pdf`)
}

export function generateNovedadesReport(novedades, contractName, period, user) {
  const doc = new jsPDF()
  addHeader(doc, 'LIBRO DE NOVEDADES', contractName, period)
  doc.autoTable({
    startY: 38,
    head: [['Fecha/Hora', 'Guardia', 'Contenido']],
    body: novedades.map(n => [
      new Date(n.created_at).toLocaleString(),
      n.guard?.full_name || '—',
      n.content || '',
    ]),
    theme: 'striped',
    headStyles: { fillColor: '#1B3A6B' },
    columnStyles: { 2: { cellWidth: 90 } },
  })
  addFooter(doc, user)
  doc.save(`GUARDIUM_Novedades_${contractName || 'Reporte'}_${new Date().toISOString().split('T')[0]}.pdf`)
}

export function generateIncidentsReport(incidents, contractName, period, user) {
  const doc = new jsPDF()
  addHeader(doc, 'REGISTRO DE INCIDENTES', contractName, period)
  doc.autoTable({
    startY: 38,
    head: [['Fecha', 'Titulo', 'Severidad', 'Estado', 'Guardia']],
    body: incidents.map(i => [
      new Date(i.created_at).toLocaleDateString(),
      i.title,
      i.severity,
      i.status,
      i.guard?.full_name || '—',
    ]),
    theme: 'striped',
    headStyles: { fillColor: '#1B3A6B' },
  })
  addFooter(doc, user)
  doc.save(`GUARDIUM_Incidentes_${contractName || 'Reporte'}_${new Date().toISOString().split('T')[0]}.pdf`)
}

export function generateVisitorsReport(visitors, contractName, period, user) {
  const doc = new jsPDF()
  addHeader(doc, 'REGISTRO DE VISITANTES', contractName, period)
  doc.autoTable({
    startY: 38,
    head: [['Nombre', 'CI', 'Motivo', 'Anfitrion', 'Entrada', 'Salida']],
    body: visitors.map(v => [
      v.full_name,
      v.ci || '—',
      v.reason || '—',
      v.host_name || '—',
      v.entry_time ? new Date(v.entry_time).toLocaleString() : '—',
      v.exit_time ? new Date(v.exit_time).toLocaleString() : 'Dentro',
    ]),
    theme: 'striped',
    headStyles: { fillColor: '#1B3A6B' },
  })
  addFooter(doc, user)
  doc.save(`GUARDIUM_Visitantes_${contractName || 'Reporte'}_${new Date().toISOString().split('T')[0]}.pdf`)
}

export function generateVehiclesReport(vehicles, contractName, period, user) {
  const doc = new jsPDF()
  addHeader(doc, 'REGISTRO DE VEHICULOS', contractName, period)
  doc.autoTable({
    startY: 38,
    head: [['Placa', 'Tipo', 'Marca', 'Propietario', 'Entrada', 'Salida']],
    body: vehicles.map(v => [
      v.plate,
      v.type || '—',
      v.brand || '—',
      v.owner_name || '—',
      v.entry_time ? new Date(v.entry_time).toLocaleString() : '—',
      v.exit_time ? new Date(v.exit_time).toLocaleString() : 'Dentro',
    ]),
    theme: 'striped',
    headStyles: { fillColor: '#1B3A6B' },
  })
  addFooter(doc, user)
  doc.save(`GUARDIUM_Vehiculos_${contractName || 'Reporte'}_${new Date().toISOString().split('T')[0]}.pdf`)
}

export function generateInvoicesReport(invoices, contractName, period, user) {
  const doc = new jsPDF()
  addHeader(doc, 'REPORTE DE FACTURACION', contractName, period)
  doc.autoTable({
    startY: 38,
    head: [['Periodo', 'Monto (Bs.)', 'Vencimiento', 'Estado', 'Fecha Pago']],
    body: invoices.map(i => [
      `${i.period_month}/${i.period_year}`,
      Number(i.amount).toLocaleString(),
      i.due_date ? new Date(i.due_date).toLocaleDateString() : '—',
      i.status,
      i.paid_at ? new Date(i.paid_at).toLocaleDateString() : '—',
    ]),
    theme: 'striped',
    headStyles: { fillColor: '#1B3A6B' },
  })
  const total = invoices.reduce((s, i) => s + Number(i.amount || 0), 0)
  const paid = invoices.filter(i => i.status === 'pagado').reduce((s, i) => s + Number(i.amount || 0), 0)
  const finalY = doc.lastAutoTable.finalY + 10
  doc.setFontSize(10)
  doc.setTextColor('#333333')
  doc.text(`Total facturado: Bs. ${total.toLocaleString()} | Cobrado: Bs. ${paid.toLocaleString()} | Pendiente: Bs. ${(total - paid).toLocaleString()}`, 14, finalY)
  addFooter(doc, user)
  doc.save(`GUARDIUM_Facturacion_${contractName || 'Reporte'}_${new Date().toISOString().split('T')[0]}.pdf`)
}

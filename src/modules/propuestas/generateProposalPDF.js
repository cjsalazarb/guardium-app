import jsPDF from 'jspdf'
import 'jspdf-autotable'

export function generateProposalPDF(proposal, costData, settings = {}) {
  const doc = new jsPDF()
  const PRIMARY = settings.pdf_primary_color || '#1B3A6B'
  const ACCENT = '#F59E0B'
  const companyName = settings.company_name || 'GUARDIUM'
  const pageW = doc.internal.pageSize.getWidth()

  // === PAGE 1: COVER ===
  doc.setFillColor(PRIMARY)
  doc.rect(0, 0, pageW, 120, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(36)
  doc.setTextColor('#FFFFFF')
  doc.text(companyName, pageW / 2, 45, { align: 'center' })

  if (settings.company_tagline) {
    doc.setFontSize(12)
    doc.text(settings.company_tagline, pageW / 2, 58, { align: 'center' })
  }

  doc.setFontSize(16)
  doc.text(proposal.title || 'Propuesta Economica', pageW / 2, 80, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor('#333333')
  doc.text('PROPUESTA ECONOMICA', pageW / 2, 140, { align: 'center' })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(proposal.client_name || '', pageW / 2, 155, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor('#666666')
  const today = new Date().toLocaleDateString()
  doc.text(`Fecha de emision: ${today}`, pageW / 2, 170, { align: 'center' })
  if (proposal.valid_until) {
    doc.text(`Valida hasta: ${new Date(proposal.valid_until).toLocaleDateString()}`, pageW / 2, 178, { align: 'center' })
  }

  addFooter(doc, companyName, settings, proposal)

  // === PAGE 2: SUMMARY ===
  doc.addPage()
  addHeader(doc, companyName, settings)

  doc.setFillColor(ACCENT)
  doc.rect(14, 35, pageW - 28, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor('#000000')
  doc.text('RESUMEN DE LA PROPUESTA', pageW / 2, 42, { align: 'center' })

  const categories = ['personal', 'equipamiento', 'uniformes', 'implementos', 'otros']
  const catLabels = { personal: 'Personal de Seguridad', equipamiento: 'Equipamiento', uniformes: 'Uniformes', implementos: 'Implementos', otros: 'Otros Costos' }
  const summaryRows = []
  let subtotalMonthly = 0
  let subtotalAnnual = 0

  categories.forEach(cat => {
    const monthly = costData?.[cat]?.monthly || 0
    const annual = costData?.[cat]?.annual || 0
    subtotalMonthly += monthly
    subtotalAnnual += annual
    summaryRows.push([catLabels[cat], `Bs. ${monthly.toLocaleString()}`, `Bs. ${annual.toLocaleString()}`])
  })

  const marginPct = costData?.margin_pct || 0
  const marginMonthly = subtotalMonthly * marginPct / 100
  const marginAnnual = subtotalAnnual * marginPct / 100
  const adjustment = costData?.adjustment || 0
  const totalMonthly = subtotalMonthly + marginMonthly + adjustment
  const totalAnnual = subtotalAnnual + marginAnnual + adjustment * 12

  summaryRows.push(['SUBTOTAL COSTOS', `Bs. ${subtotalMonthly.toLocaleString()}`, `Bs. ${subtotalAnnual.toLocaleString()}`])
  summaryRows.push([`Administracion (${marginPct}%)`, `Bs. ${marginMonthly.toLocaleString()}`, `Bs. ${marginAnnual.toLocaleString()}`])

  doc.autoTable({
    startY: 52,
    head: [['Categoria', 'Costo Mensual', 'Costo Anual']],
    body: summaryRows,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 10 },
    headStyles: { fillColor: PRIMARY, textColor: '#FFFFFF' },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
  })

  const finalY = doc.lastAutoTable.finalY + 10
  doc.setFillColor('#F0F4F8')
  doc.roundedRect(14, finalY, pageW - 28, 30, 3, 3, 'F')
  doc.setDrawColor(PRIMARY)
  doc.roundedRect(14, finalY, pageW - 28, 30, 3, 3, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(PRIMARY)
  doc.text(`PRECIO MENSUAL TOTAL: Bs. ${totalMonthly.toLocaleString()}`, pageW / 2, finalY + 13, { align: 'center' })
  doc.setFontSize(11)
  doc.text(`PRECIO ANUAL TOTAL: Bs. ${totalAnnual.toLocaleString()}`, pageW / 2, finalY + 24, { align: 'center' })

  addFooter(doc, companyName, settings, proposal)

  // === PAGE 3: DETAIL ===
  doc.addPage()
  addHeader(doc, companyName, settings)

  doc.setFillColor(ACCENT)
  doc.rect(14, 35, pageW - 28, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor('#000000')
  doc.text('DETALLE DE COSTOS', pageW / 2, 42, { align: 'center' })

  let detailY = 55
  categories.forEach(cat => {
    const items = costData?.[cat]?.items || []
    if (items.length === 0) return
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(PRIMARY)
    doc.text(catLabels[cat], 14, detailY)
    detailY += 4

    doc.autoTable({
      startY: detailY,
      head: [['Descripcion', 'Cant.', 'P.Unit (Bs.)', 'Frecuencia', 'Total (Bs.)']],
      body: items.map(i => [
        i.description || '',
        i.quantity || 1,
        Number(i.unit_price || 0).toLocaleString(),
        i.frequency || 'mensual',
        Number(i.total || 0).toLocaleString(),
      ]),
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: '#333333' },
      margin: { left: 14, right: 14 },
    })
    detailY = doc.lastAutoTable.finalY + 10
  })

  addFooter(doc, companyName, settings, proposal)

  const fileName = `GUARDIUM_Propuesta_${(proposal.client_name || 'Cliente').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

function addHeader(doc, companyName, settings) {
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#333333')
  doc.text(companyName, 14, 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor('#666666')
  const info = [settings.company_phone, settings.company_email, settings.company_nit ? `NIT: ${settings.company_nit}` : ''].filter(Boolean).join(' | ')
  doc.text(info, 14, 21)
  doc.setDrawColor('#DDDDDD')
  doc.line(14, 25, doc.internal.pageSize.getWidth() - 14, 25)
}

function addFooter(doc, companyName, settings, proposal) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFontSize(7)
  doc.setTextColor('#999999')
  doc.text(`${companyName} | ${settings.company_phone || ''} | ${settings.company_email || ''}`, 14, pageH - 12)
  if (proposal.valid_until) {
    doc.text(`Propuesta confidencial — valida hasta ${new Date(proposal.valid_until).toLocaleDateString()}`, 14, pageH - 7)
  }
  doc.text(`Pagina ${doc.internal.getNumberOfPages()}`, pageW - 25, pageH - 12)
}

import { jsPDF } from 'jspdf'
import logoUrl from '../../logo.png'

// Colores corporativos PDF — rojo/negro GUARDIUM
const C = {
  TEXT: '#1A1A1A',
  SUBTLE: '#4A4A4A',
  CARD_BG: [245, 224, 225],   // rojo suave
  BLACK: [26, 26, 26],        // negro GUARDIUM
  RED: [192, 32, 42],         // rojo GUARDIUM
  BORDER: '#E2E8F0',
  LINE_RGB: [192, 32, 42],    // linea footer roja
  WHITE: '#FFFFFF',
}

const MARGIN = 20
const TABLE_W = 170
const fmt = n => Number(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function pageW(doc) { return doc.internal.pageSize.getWidth() }
function pageH(doc) { return doc.internal.pageSize.getHeight() }
function contentW() { return TABLE_W }

function drawTable(doc, headers, rows, startY, options = {}) {
  const { colWidths, rowHeight = 8, headerBg = C.BLACK, fontSize = 9 } = options
  const widths = colWidths || headers.map(() => TABLE_W / headers.length)
  let y = startY

  // Header row
  doc.setFillColor(...headerBg)
  doc.rect(MARGIN, y, TABLE_W, rowHeight, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(fontSize)
  doc.setFont('helvetica', 'bold')
  let x = MARGIN
  headers.forEach((h, i) => {
    doc.text(String(h), x + 2, y + 5.5)
    x += widths[i]
  })
  y += rowHeight

  // Data rows
  doc.setFontSize(fontSize)
  rows.forEach((row, rowIndex) => {
    const bg = rowIndex % 2 === 0 ? [255, 255, 255] : [250, 245, 245]
    doc.setFillColor(...bg)
    doc.rect(MARGIN, y, TABLE_W, rowHeight, 'F')
    doc.setDrawColor(226, 232, 240)
    doc.rect(MARGIN, y, TABLE_W, rowHeight, 'S')
    doc.setTextColor(26, 26, 26)
    doc.setFont('helvetica', 'normal')
    x = MARGIN
    row.forEach((cell, i) => {
      doc.text(String(cell ?? ''), x + 2, y + 5.5, { maxWidth: widths[i] - 4 })
      x += widths[i]
    })
    y += rowHeight
  })
  return y
}

function addHeader(doc) {
  // Logo pequeño
  doc.addImage(logoUrl, 'PNG', MARGIN, 4, 16, 16)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(C.TEXT)
  doc.text('GUARDIUM', MARGIN + 18, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(C.SUBTLE)
  doc.text('Seguridad Privada', MARGIN + 18, 17)
  doc.setDrawColor(...C.LINE_RGB)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, 22, pageW(doc) - MARGIN, 22)
  doc.setLineWidth(0.2)
}

function addFooter(doc, proposalNum) {
  const w = pageW(doc)
  const h = pageH(doc)
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...C.RED)
    doc.setLineWidth(0.5)
    doc.line(MARGIN, h - 16, w - MARGIN, h - 16)
    doc.setLineWidth(0.2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(C.SUBTLE)
    doc.text(`GUARDIUM Seguridad Privada | Confidencial | ${proposalNum}`, MARGIN, h - 10)
    doc.text(`Pagina ${i} de ${totalPages}`, w - MARGIN, h - 10, { align: 'right' })
  }
}

function sectionHeader(doc, y, num, title) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...C.RED)
  doc.text(`SECCION ${num}`, MARGIN, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(C.TEXT)
  doc.text(title, MARGIN, y + 10)
  doc.setDrawColor(...C.RED)
  doc.setLineWidth(0.8)
  doc.line(MARGIN, y + 14, MARGIN + 40, y + 14)
  doc.setLineWidth(0.2)
  return y + 22
}

// ═══════════════════════════════════════
// PAGE 1: PORTADA
// ═══════════════════════════════════════
function renderPortada(doc, proposal) {
  const w = pageW(doc)
  const h = pageH(doc)
  const splitX = w * 0.6

  // Right column: dark background with logo
  doc.setFillColor(...C.BLACK)
  doc.rect(splitX, 0, w - splitX, h, 'F')
  const logoCx = splitX + (w - splitX) / 2
  doc.addImage(logoUrl, 'PNG', logoCx - 25, h * 0.35, 50, 50)

  // Title
  const titleY = 110
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(C.TEXT)
  const titleLines = doc.splitTextToSize(proposal.title || 'Propuesta Comercial', splitX - MARGIN - 15)
  doc.text(titleLines, MARGIN, titleY)

  const afterTitle = titleY + titleLines.length * 12
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(13)
  doc.setTextColor(C.SUBTLE)
  doc.text('Propuesta Comercial de Servicios', MARGIN, afterTitle + 5)

  doc.setDrawColor(...C.RED)
  doc.setLineWidth(1)
  doc.line(MARGIN, afterTitle + 12, MARGIN + 50, afterTitle + 12)
  doc.setLineWidth(0.2)

  const clientY = afterTitle + 28
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(C.SUBTLE)
  doc.text('Preparado para:', MARGIN, clientY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(C.TEXT)
  doc.text(proposal.client_name || '', MARGIN, clientY + 10)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(C.SUBTLE)
  if (proposal.client_address) {
    doc.text(proposal.client_address, MARGIN, clientY + 18)
  }

  const dateY = h - 50
  const today = new Date().toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' })
  doc.setFontSize(10)
  doc.setTextColor(C.SUBTLE)
  doc.text(`Fecha de emision: ${today}`, MARGIN, dateY)
  doc.text('Vigencia: 15 dias', MARGIN, dateY + 7)
}

// ═══════════════════════════════════════
// PAGE 2: PRESENTACIÓN
// ═══════════════════════════════════════
function renderPresentacion(doc) {
  addHeader(doc)
  let y = sectionHeader(doc, 30, '1', 'Presentacion de GUARDIUM')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(C.TEXT)

  const p1 = 'GUARDIUM Seguridad Privada es una empresa boliviana especializada en servicios de seguridad privada. Nos distinguimos por ofrecer un modelo unico que integra guardias profesionales, tecnologia de control y gestion digital en una sola mensualidad.'
  const p2 = 'Nuestra propuesta de valor se centra en la transparencia operativa. Cada turno de guardia queda documentado digitalmente mediante fotografias y reportes en tiempo real. El cliente tiene visibilidad total desde cualquier dispositivo.'

  const lines1 = doc.splitTextToSize(p1, contentW())
  doc.text(lines1, MARGIN, y)
  y += lines1.length * 5 + 6

  const lines2 = doc.splitTextToSize(p2, contentW())
  doc.text(lines2, MARGIN, y)
  y += lines2.length * 5 + 14

  const cards = [
    { icon: 'S', title: 'Guardias Profesionales', desc: 'Personal capacitado y certificado para brindar seguridad integral' },
    { icon: 'C', title: 'Control Digital', desc: 'Registro fotografico y reportes en tiempo real de cada turno' },
    { icon: 'G', title: 'Gestion Digital', desc: 'Control total del servicio desde su dispositivo movil' },
    { icon: '$', title: 'Una Mensualidad', desc: 'Sin costos ocultos, sin inversion inicial. Todo incluido' },
  ]

  const cardW = (contentW() - 8) / 2
  const cardH = 38

  cards.forEach((card, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const cx = MARGIN + col * (cardW + 8)
    const cy = y + row * (cardH + 8)

    doc.setFillColor(...C.CARD_BG)
    doc.roundedRect(cx, cy, cardW, cardH, 3, 3, 'F')

    doc.setFillColor(...C.BLACK)
    doc.circle(cx + 12, cy + 12, 6, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(C.WHITE)
    doc.text(card.icon, cx + 12, cy + 13.5, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(C.TEXT)
    doc.text(card.title, cx + 22, cy + 13)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(C.SUBTLE)
    const descLines = doc.splitTextToSize(card.desc, cardW - 26)
    doc.text(descLines, cx + 22, cy + 21)
  })
}

// ═══════════════════════════════════════
// PAGE 3: DETALLE DEL SERVICIO (sin precios)
// ═══════════════════════════════════════
function renderDetalleServicio(doc, costData) {
  addHeader(doc)
  let y = sectionHeader(doc, 30, '2', 'Detalle del Servicio Contratado')

  const sections = []

  const guards = Number(costData.num_guards) || 0
  if (guards > 0) {
    sections.push({
      title: 'Personal de Seguridad',
      items: [
        `${guards} guardia${guards > 1 ? 's' : ''} de seguridad profesionales`,
        'Turnos de 12 horas con cobertura los 30 dias del mes',
        'Relevos garantizados sin interrupcion del servicio',
        'Reporte digital con fotografia al inicio y fin de cada turno',
      ],
    })
  }

  const equipItems = []
  if (costData.cell_enabled) {
    const qty = Number(costData.cell_qty) || 0
    if (qty > 0) equipItems.push(`${qty} celular${qty > 1 ? 'es' : ''} para comunicacion operativa`)
  }
  if (costData.tablet_enabled) {
    const qty = Number(costData.tablet_qty) || 0
    if (qty > 0) equipItems.push(`${qty} tablet${qty > 1 ? 's' : ''} para registro digital de turnos`)
  }
  if (equipItems.length > 0) {
    sections.push({ title: 'Equipamiento Tecnologico', items: equipItems })
  }

  const uniformChanges = Number(costData.uniform_changes_per_year) || 0
  if ((Number(costData.uniform_cost_per_set) || 0) > 0 && guards > 0) {
    sections.push({
      title: 'Uniformes',
      items: [
        'Uniformes completos para cada guardia',
        `${uniformChanges} cambio${uniformChanges > 1 ? 's' : ''} de uniforme por ano`,
      ],
    })
  }

  const implementos = costData.implementos || []
  if (implementos.length > 0) {
    sections.push({
      title: 'Implementos',
      items: implementos.map(it => it.description || 'Item de seguridad'),
    })
  }

  const otros = costData.otros || []
  if (otros.length > 0) {
    sections.push({
      title: 'Otros Servicios',
      items: otros.map(it => it.description || 'Servicio adicional'),
    })
  }

  sections.forEach((sec, idx) => {
    if (y > 250) { doc.addPage(); addHeader(doc); y = 30 }

    doc.setFillColor(...C.BLACK)
    doc.circle(MARGIN + 5, y + 1, 5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(C.WHITE)
    doc.text(`${idx + 1}`, MARGIN + 5, y + 2.5, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(C.TEXT)
    doc.text(sec.title, MARGIN + 14, y + 3)
    y += 10

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(C.SUBTLE)
    sec.items.forEach(item => {
      const lines = doc.splitTextToSize(item, contentW() - 18)
      doc.text('\u2022', MARGIN + 6, y)
      doc.text(lines, MARGIN + 12, y)
      y += lines.length * 5 + 2
    })
    y += 6
  })
}

// ═══════════════════════════════════════
// PAGE 4: PROPUESTA ECONÓMICA
// ═══════════════════════════════════════
function renderPropuestaEconomica(doc, proposal, costData, calcs) {
  addHeader(doc)
  let y = sectionHeader(doc, 30, '3', 'Propuesta Economica')

  // Data box
  doc.setFillColor(...C.CARD_BG)
  doc.roundedRect(MARGIN, y, TABLE_W, 36, 3, 3, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(C.SUBTLE)

  const proposalNum = `GUARD-${new Date().getFullYear()}-${String(proposal.version || 1).padStart(3, '0')}`
  const today = new Date().toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' })

  const infoLeft = [
    `Cliente: ${proposal.client_name || ''}`,
    `Direccion: ${proposal.client_address || ''}`,
  ]
  const infoRight = [
    `Fecha: ${today}`,
    `Valida hasta: ${proposal.valid_until ? new Date(proposal.valid_until).toLocaleDateString('es-BO') : '15 dias'}`,
    `N. Propuesta: ${proposalNum}`,
  ]

  infoLeft.forEach((line, i) => doc.text(line, MARGIN + 6, y + 8 + i * 6))
  infoRight.forEach((line, i) => doc.text(line, MARGIN + TABLE_W / 2, y + 8 + i * 6))

  y += 42

  // Single row: precio unitario todo incluido por guardia
  const totalMonthly = calcs.totalMonthly
  const totalAnnual = calcs.totalAnnual
  const numGuardias = Number(costData.num_guards) || 1
  const precioUnitario = totalMonthly / numGuardias

  const colWidths = [12, 78, 17, 32, 31]
  const itemRows = [[
    '1',
    'Servicio de Guardia de Seguridad Integral (Incluye: personal, uniformes, implementos y gestion digital)',
    String(numGuardias),
    `Bs. ${fmt(precioUnitario)}`,
    `Bs. ${fmt(totalMonthly)}`,
  ]]
  y = drawTable(doc, ['N.', 'Descripcion del Servicio', 'Cant.', 'Precio Unit. Bs.', 'Total Mensual Bs.'], itemRows, y, { colWidths })

  // TOTAL MENSUAL — negro GUARDIUM
  doc.setFillColor(...C.BLACK)
  doc.rect(MARGIN, y, TABLE_W, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('TOTAL MENSUAL', MARGIN + 4, y + 7)
  doc.text(`Bs. ${fmt(totalMonthly)}`, MARGIN + TABLE_W - 4, y + 7, { align: 'right' })
  y += 10

  // TOTAL ANUAL — rojo GUARDIUM
  doc.setFillColor(...C.RED)
  doc.rect(MARGIN, y, TABLE_W, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL ANUAL', MARGIN + 4, y + 7)
  doc.text(`Bs. ${fmt(totalAnnual)}`, MARGIN + TABLE_W - 4, y + 7, { align: 'right' })
  y += 16

  // Validity note
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(C.SUBTLE)
  const note = 'Esta propuesta tiene vigencia de 15 dias calendario a partir de la fecha de emision. Todos los precios estan expresados en Bolivianos (Bs.)'
  const noteLines = doc.splitTextToSize(note, contentW())
  doc.text(noteLines, MARGIN, y)
}

// ═══════════════════════════════════════
// PAGE 5: TÉRMINOS Y CONDICIONES
// ═══════════════════════════════════════
function renderTerminos(doc, proposal) {
  addHeader(doc)
  let y = sectionHeader(doc, 30, '4', 'Terminos y Condiciones')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(C.TEXT)
  const intro = 'Los siguientes terminos regulan la relacion contractual entre GUARDIUM Seguridad Privada y el cliente.'
  const introLines = doc.splitTextToSize(intro, contentW())
  doc.text(introLines, MARGIN, y)
  y += introLines.length * 5 + 8

  const clauses = [
    { title: 'Duracion del Contrato', text: 'El contrato tendra duracion de doce (12) meses calendario a partir de la fecha de inicio del servicio.' },
    { title: 'Renovacion Automatica', text: 'Al vencimiento, el contrato se renueva automaticamente por periodos iguales de 12 meses, salvo notificacion en contrario.' },
    { title: 'Forma de Pago', text: 'El pago se realizara los primeros 5 dias habiles de cada mes mediante transferencia bancaria o cheque.' },
    { title: 'Rescision Anticipada', text: 'Cualquier parte puede rescindir el contrato con 30 dias de anticipacion por escrito, sin penalidad.' },
    { title: 'Condiciones del Servicio', text: 'GUARDIUM garantiza la cobertura ininterrumpida del servicio en los horarios acordados, incluyendo relevos por vacaciones o permisos.' },
  ]

  clauses.forEach((clause, i) => {
    if (y > 230) { doc.addPage(); addHeader(doc); y = 30 }

    doc.setFillColor(...C.CARD_BG)
    doc.roundedRect(MARGIN, y, contentW(), 18, 2, 2, 'F')

    doc.setFillColor(...C.RED)
    doc.circle(MARGIN + 8, y + 6, 4, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(C.WHITE)
    doc.text(`${i + 1}`, MARGIN + 8, y + 7.5, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(C.TEXT)
    doc.text(clause.title, MARGIN + 16, y + 7)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(C.SUBTLE)
    const clauseLines = doc.splitTextToSize(clause.text, contentW() - 20)
    doc.text(clauseLines, MARGIN + 16, y + 13)

    y += 22
  })

  y += 6

  // Responsibilities table
  if (y > 200) { doc.addPage(); addHeader(doc); y = 30 }

  y = drawTable(doc,
    ['Responsabilidades GUARDIUM', 'Responsabilidades del Cliente'],
    [
      ['Proveer personal en horarios acordados', 'Realizar pagos en fecha acordada'],
      ['Garantizar relevos por vacaciones o permisos', 'Facilitar acceso al personal de seguridad'],
      ['Mantener equipos operativos', 'No alterar equipos instalados'],
      ['Reportes digitales en tiempo real', 'Brindar condiciones minimas de trabajo'],
    ],
    y,
    { colWidths: [85, 85] }
  )

  y += 12

  // Signatures
  if (y > 230) { doc.addPage(); addHeader(doc); y = 30 }

  const sigW = (contentW() - 20) / 2

  doc.setDrawColor(C.TEXT)
  doc.line(MARGIN, y + 20, MARGIN + sigW, y + 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(C.TEXT)
  doc.text('Por GUARDIUM', MARGIN, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(C.SUBTLE)
  doc.text('Administradora General', MARGIN, y + 26)
  doc.text('GUARDIUM Seguridad Privada', MARGIN, y + 32)

  const rightX = MARGIN + sigW + 20
  doc.line(rightX, y + 20, rightX + sigW, y + 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(C.TEXT)
  doc.text('Por el Cliente', rightX, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(C.SUBTLE)
  doc.text(proposal.client_contact || '', rightX, y + 26)
  doc.text(proposal.client_name || '', rightX, y + 32)
}

// ═══════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════
export function generateProposalPDF(proposal, costData, calcs) {
  const doc = new jsPDF('p', 'mm', 'a4')

  renderPortada(doc, proposal)

  doc.addPage()
  renderPresentacion(doc)

  doc.addPage()
  renderDetalleServicio(doc, costData)

  doc.addPage()
  renderPropuestaEconomica(doc, proposal, costData, calcs)

  doc.addPage()
  renderTerminos(doc, proposal)

  const proposalNum = `GUARD-${new Date().getFullYear()}-${String(proposal.version || 1).padStart(3, '0')}`
  addFooter(doc, proposalNum)

  const clientSlug = (proposal.client_name || 'Cliente').replace(/\s+/g, '_')
  const fecha = new Date().toISOString().split('T')[0]
  doc.save(`GUARDIUM_Propuesta_${clientSlug}_v${proposal.version || 1}_${fecha}.pdf`)
}

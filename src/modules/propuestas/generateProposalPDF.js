import { jsPDF } from 'jspdf'

// Colores corporativos PDF
const C = {
  TEXT: '#1A202C',
  SUBTLE: '#4A5568',
  CARD_BG: '#F7FAFC',
  HEADER_BG: '#2D3748',
  RED: '#C0202A',
  BORDER: '#E2E8F0',
  LINE: '#CBD5E0',
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
  const { colWidths, rowHeight = 8, headerBg = [45, 55, 72], fontSize = 9 } = options
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
    const bg = rowIndex % 2 === 0 ? [255, 255, 255] : [247, 250, 252]
    doc.setFillColor(...bg)
    doc.rect(MARGIN, y, TABLE_W, rowHeight, 'F')
    doc.setDrawColor(226, 232, 240)
    doc.rect(MARGIN, y, TABLE_W, rowHeight, 'S')
    doc.setTextColor(26, 32, 44)
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
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(C.TEXT)
  doc.text('GUARDIUM', MARGIN, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(C.SUBTLE)
  doc.text('Seguridad Privada', MARGIN + 28, 14)
  doc.setDrawColor(C.LINE)
  doc.line(MARGIN, 18, pageW(doc) - MARGIN, 18)
}

function addFooter(doc, proposalNum) {
  const w = pageW(doc)
  const h = pageH(doc)
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(C.LINE)
    doc.line(MARGIN, h - 16, w - MARGIN, h - 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(C.SUBTLE)
    doc.text(`GUARDIUM Seguridad Privada | Confidencial | ${proposalNum}`, MARGIN, h - 10)
    doc.text(`Pagina ${i} de ${totalPages}`, w - MARGIN, h - 10, { align: 'right' })
  }
}

function sectionHeader(doc, y, num, title) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(C.SUBTLE)
  doc.text(`SECCION ${num}`, MARGIN, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(C.TEXT)
  doc.text(title, MARGIN, y + 10)
  doc.setDrawColor(C.RED)
  doc.setLineWidth(0.8)
  doc.line(MARGIN, y + 14, MARGIN + 40, y + 14)
  doc.setLineWidth(0.2)
  return y + 22
}

function drawShield(doc, cx, cy, size) {
  doc.setFillColor(C.WHITE)
  doc.setDrawColor(C.WHITE)
  const s = size
  doc.roundedRect(cx - s / 2, cy - s / 2, s, s * 0.7, 3, 3, 'F')
  // Bottom point via small rect (triangle not always available)
  doc.roundedRect(cx - s / 4, cy + s * 0.1, s / 2, s * 0.3, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(size * 0.6)
  doc.setTextColor(C.HEADER_BG)
  doc.text('G', cx, cy + 2, { align: 'center' })
}

// ═══════════════════════════════════════
// PAGE 1: PORTADA
// ═══════════════════════════════════════
function renderPortada(doc, proposal) {
  const w = pageW(doc)
  const h = pageH(doc)
  const splitX = w * 0.6

  // Right column: dark background with shield
  doc.setFillColor(C.HEADER_BG)
  doc.rect(splitX, 0, w - splitX, h, 'F')
  drawShield(doc, splitX + (w - splitX) / 2, h * 0.4, 50)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(C.WHITE)
  doc.text('GUARDIUM', splitX + (w - splitX) / 2, h * 0.4 + 40, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Seguridad Privada', splitX + (w - splitX) / 2, h * 0.4 + 48, { align: 'center' })

  // Left column
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(C.TEXT)
  doc.text('GUARDIUM', MARGIN, 35)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(C.SUBTLE)
  doc.text('Seguridad Privada', MARGIN, 42)

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

  doc.setDrawColor(C.RED)
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
  let y = sectionHeader(doc, 28, '1', 'Presentacion de GUARDIUM')

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

    doc.setFillColor(C.CARD_BG)
    doc.roundedRect(cx, cy, cardW, cardH, 3, 3, 'F')

    doc.setFillColor(C.HEADER_BG)
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
// PAGE 3: DETALLE DEL SERVICIO
// ═══════════════════════════════════════
function renderDetalleServicio(doc, costData) {
  addHeader(doc)
  let y = sectionHeader(doc, 28, '2', 'Detalle del Servicio Contratado')

  const sections = []

  const guards = Number(costData.num_guards) || 0
  const salary = Number(costData.monthly_salary) || 0
  if (guards > 0) {
    sections.push({
      title: 'Personal de Seguridad',
      items: [
        `${guards} guardia${guards > 1 ? 's' : ''} de seguridad`,
        `Salario mensual por guardia: Bs. ${fmt(salary)}`,
        `Costo mensual total personal: Bs. ${fmt(guards * salary)}`,
      ],
    })
  }

  const equipItems = []
  if (costData.cell_enabled) {
    const qty = Number(costData.cell_qty) || 0
    const cost = Number(costData.cell_cost) || 0
    if (qty > 0) equipItems.push(`${qty} celular${qty > 1 ? 'es' : ''} - Bs. ${fmt(cost)} c/u (Total: Bs. ${fmt(qty * cost)})`)
  }
  if (costData.tablet_enabled) {
    const qty = Number(costData.tablet_qty) || 0
    const cost = Number(costData.tablet_cost) || 0
    if (qty > 0) equipItems.push(`${qty} tablet${qty > 1 ? 's' : ''} - Bs. ${fmt(cost)} c/u (Total: Bs. ${fmt(qty * cost)})`)
  }
  if (equipItems.length > 0) {
    sections.push({ title: 'Equipamiento Tecnologico', items: equipItems })
  }

  const uniformCost = Number(costData.uniform_cost_per_set) || 0
  const uniformChanges = Number(costData.uniform_changes_per_year) || 0
  if (uniformCost > 0 && guards > 0) {
    sections.push({
      title: 'Uniformes',
      items: [
        `${guards} juego${guards > 1 ? 's' : ''} de uniforme`,
        `Costo por juego: Bs. ${fmt(uniformCost)}`,
        `${uniformChanges} cambio${uniformChanges > 1 ? 's' : ''} por ano`,
        `Total anual: Bs. ${fmt(guards * uniformCost * uniformChanges)} (mensual: Bs. ${fmt(guards * uniformCost * uniformChanges / 12)})`,
      ],
    })
  }

  const implementos = costData.implementos || []
  if (implementos.length > 0) {
    sections.push({
      title: 'Implementos',
      items: implementos.map(it => `${it.description || 'Item'} - Bs. ${fmt(it.global_price)} (mensual: Bs. ${fmt(Number(it.global_price || 0) / 12)})`),
    })
  }

  const otros = costData.otros || []
  if (otros.length > 0) {
    sections.push({
      title: 'Otros Costos',
      items: otros.map(it => `${it.description || 'Item'} - Bs. ${fmt(it.amount)} (${it.frequency || 'mensual'})`),
    })
  }

  sections.forEach((sec, idx) => {
    if (y > 250) { doc.addPage(); addHeader(doc); y = 28 }

    doc.setFillColor(C.HEADER_BG)
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
  let y = sectionHeader(doc, 28, '3', 'Propuesta Economica')

  // Data box
  doc.setFillColor(C.CARD_BG)
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

  // Build table rows from cost_data
  const rows = []
  let rowNum = 0
  const guards = Number(costData.num_guards) || 0
  const salary = Number(costData.monthly_salary) || 0

  if (guards > 0) {
    rowNum++
    rows.push([String(rowNum), 'Personal de seguridad', String(guards), `Bs. ${fmt(salary)}`, `Bs. ${fmt(guards * salary)}`])
  }

  const cellTotal = costData.cell_enabled ? (Number(costData.cell_qty) || 0) * (Number(costData.cell_cost) || 0) : 0
  const tabletTotal = costData.tablet_enabled ? (Number(costData.tablet_qty) || 0) * (Number(costData.tablet_cost) || 0) : 0
  const equipMonthly = (cellTotal + tabletTotal) / 12
  if (equipMonthly > 0) {
    rowNum++
    rows.push([String(rowNum), 'Equipamiento tecnologico', '-', '-', `Bs. ${fmt(equipMonthly)}`])
  }

  const uniformMonthly = guards * (Number(costData.uniform_cost_per_set) || 0) * (Number(costData.uniform_changes_per_year) || 0) / 12
  if (uniformMonthly > 0) {
    rowNum++
    rows.push([String(rowNum), 'Uniformes', String(guards), `Bs. ${fmt(Number(costData.uniform_cost_per_set) || 0)}`, `Bs. ${fmt(uniformMonthly)}`])
  }

  const implementos = costData.implementos || []
  const implementoMonthly = implementos.reduce((s, it) => s + (Number(it.global_price) || 0), 0) / 12
  if (implementoMonthly > 0) {
    rowNum++
    rows.push([String(rowNum), 'Implementos', String(implementos.length), '-', `Bs. ${fmt(implementoMonthly)}`])
  }

  const otros = costData.otros || []
  const otrosMonthly = otros.reduce((s, it) => {
    const amt = Number(it.amount) || 0
    if (it.frequency === 'mensual') return s + amt
    return s + amt / 12
  }, 0)
  if (otrosMonthly > 0) {
    rowNum++
    rows.push([String(rowNum), 'Otros costos', String(otros.length), '-', `Bs. ${fmt(otrosMonthly)}`])
  }

  // Draw quotation table
  const colWidths = [12, 78, 17, 32, 31]
  y = drawTable(doc, ['N.', 'Descripcion del Servicio', 'Cant.', 'Precio Unit. Bs.', 'Total Mensual Bs.'], rows, y, { colWidths })

  // Totals
  const subtotal = calcs.subtotal
  const marginPct = Number(costData.admin_margin_pct) || 0
  const marginAmt = calcs.marginAmount
  const totalMonthly = calcs.totalMonthly
  const totalAnnual = calcs.totalAnnual

  // Subtotal row
  doc.setFillColor(241, 245, 249)
  doc.rect(MARGIN, y, TABLE_W, 8, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.rect(MARGIN, y, TABLE_W, 8, 'S')
  doc.setTextColor(26, 32, 44)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Subtotal costos directos', MARGIN + 2, y + 5.5)
  doc.text(`Bs. ${fmt(subtotal)}`, MARGIN + TABLE_W - 2, y + 5.5, { align: 'right' })
  y += 8

  // Margin row
  doc.setFillColor(241, 245, 249)
  doc.rect(MARGIN, y, TABLE_W, 8, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.rect(MARGIN, y, TABLE_W, 8, 'S')
  doc.setFont('helvetica', 'normal')
  doc.text(`Margen administrativo (${marginPct}%)`, MARGIN + 2, y + 5.5)
  doc.text(`Bs. ${fmt(marginAmt)}`, MARGIN + TABLE_W - 2, y + 5.5, { align: 'right' })
  y += 8

  // TOTAL MENSUAL — dark
  doc.setFillColor(45, 55, 72)
  doc.rect(MARGIN, y, TABLE_W, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('TOTAL MENSUAL', MARGIN + 4, y + 7)
  doc.text(`Bs. ${fmt(totalMonthly)}`, MARGIN + TABLE_W - 4, y + 7, { align: 'right' })
  y += 10

  // TOTAL ANUAL — red
  doc.setFillColor(192, 32, 42)
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
  let y = sectionHeader(doc, 28, '4', 'Terminos y Condiciones')

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
    if (y > 230) { doc.addPage(); addHeader(doc); y = 28 }

    doc.setFillColor(C.CARD_BG)
    doc.roundedRect(MARGIN, y, contentW(), 18, 2, 2, 'F')

    doc.setFillColor(C.HEADER_BG)
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

  // Responsibilities table (manual)
  if (y > 200) { doc.addPage(); addHeader(doc); y = 28 }

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
  if (y > 230) { doc.addPage(); addHeader(doc); y = 28 }

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

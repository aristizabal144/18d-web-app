<script setup lang="ts">
import { useCarteraStore } from '@/views/apps/cartera/useCarteraStore'
import type { CarteraCliente, CarteraPedido, CarteraStats } from '@/views/apps/cartera/useCarteraStore'

const carteraStore = useCarteraStore()

// ── Filtros ──────────────────────────────────
const selectedCliente = ref<string | null>(null)
const clientes = ref<{ id: string; nombre: string; apellido: string }[]>([])

const fechaInicio = ref<string | null>(null)
const fechaFin = ref<string | null>(null)

// ── Estado ───────────────────────────────────
const isLoadingStats = ref(false)
const isLoadingClientes = ref(false)
const isLoadingDetalle = ref(false)

const stats = ref<CarteraStats>({
  total_facturado: 0,
  total_recaudado: 0,
  total_efectivo_mes: 0,
  total_transferencia_mes: 0,
  total_pendiente: 0,
  clientes_con_saldo: 0,
})

const carteraClientes = ref<CarteraCliente[]>([])
const detalleCliente = ref<CarteraPedido[]>([])
const clienteSeleccionadoInfo = ref<CarteraCliente | null>(null)
const detalleDialogOpen = ref(false)
const snackbar = ref({ show: false, message: '', color: 'error' })
const isGeneratingReport = ref<Record<string, boolean>>({})

// ── Helpers ───────────────────────────────────
const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)

const formatDate = (d: string | null | undefined) => {
  if (!d) return '-'
  const dt = d.includes('T') ? new Date(d) : new Date(`${d}T12:00:00`)
  return dt.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
}

const porcentajeCobrado = (cliente: CarteraCliente) => {
  if (!cliente.total_pedidos) return 0
  return Math.min(100, Math.round((cliente.total_abonado / cliente.total_pedidos) * 100))
}

// ── Fetch ─────────────────────────────────────
const loadStats = async () => {
  isLoadingStats.value = true
  try {
    stats.value = await carteraStore.fetchCarteraStats(fechaInicio.value, fechaFin.value)
  } catch (e: any) {
    snackbar.value = { show: true, message: e.message || 'Error al cargar estadísticas', color: 'error' }
  } finally {
    isLoadingStats.value = false
  }
}

const loadCartera = async () => {
  isLoadingClientes.value = true
  try {
    carteraClientes.value = await carteraStore.fetchCarteraByCliente(fechaInicio.value, fechaFin.value, selectedCliente.value)
  } catch (e: any) {
    snackbar.value = { show: true, message: e.message || 'Error al cargar cartera', color: 'error' }
  } finally {
    isLoadingClientes.value = false
  }
}

const loadAll = () => {
  loadStats()
  loadCartera()
}

const openDetalle = async (cliente: CarteraCliente) => {
  clienteSeleccionadoInfo.value = cliente
  detalleDialogOpen.value = true
  isLoadingDetalle.value = true
  try {
    detalleCliente.value = await carteraStore.fetchPedidosByCliente(cliente.cliente_id, fechaInicio.value, fechaFin.value)
  } catch (e: any) {
    snackbar.value = { show: true, message: e.message || 'Error al cargar detalle', color: 'error' }
  } finally {
    isLoadingDetalle.value = false
  }
}

const printReporte = () => {
  const filas = carteraClientes.value.map((c, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${c.nombre} ${c.apellido}</td>
      <td>${c.pedidos_count}</td>
      <td style="text-align:right">${formatCurrency(c.total_pedidos)}</td>
      <td style="text-align:right;color:#2e7d32">${formatCurrency(c.total_abonado)}</td>
      <td style="text-align:right;color:#1565c0">${formatCurrency(c.total_efectivo)}</td>
      <td style="text-align:right;color:#7b1fa2">${formatCurrency(c.total_transferencia)}</td>
      <td style="text-align:right;font-weight:bold;color:${c.saldo_pendiente > 0 ? '#c62828' : '#2e7d32'}">${formatCurrency(c.saldo_pendiente)}</td>
    </tr>`).join('')

  const rango = `${fechaInicio.value ? formatDate(fechaInicio.value) : 'Inicio'} al ${fechaFin.value ? formatDate(fechaFin.value) : 'Hoy'}`

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Cartera 18D Joyeros</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:12px;padding:20px;color:#111}
      h1{color:#8b6b15;margin:0;font-size:20px} .sub{color:#666;font-size:12px;margin-bottom:16px}
      .cards{display:flex;gap:12px;margin-bottom:20px}
      .card{flex:1;border:1px solid #ddd;border-radius:6px;padding:10px 14px;text-align:center}
      .card .lbl{font-size:10px;text-transform:uppercase;color:#666;font-weight:700}
      .card .val{font-size:16px;font-weight:bold;margin-top:4px}
      table{width:100%;border-collapse:collapse}
      th{background:#1e1b16;color:#f5d77f;padding:7px 9px;font-size:10px;text-transform:uppercase}
      td{padding:7px 9px;border-bottom:1px solid #eee;font-size:11px}
      tr:nth-child(even){background:#fafafa}
      .foot{margin-top:20px;border-top:1px solid #ddd;padding-top:8px;display:flex;justify-content:space-between;font-size:10px;color:#888}
    </style></head><body>
    <div style="display:flex;justify-content:space-between;border-bottom:2px solid #8b6b15;padding-bottom:12px;margin-bottom:16px">
      <div><h1>18D JOYEROS</h1><div class="sub">Informe de Cartera — ${rango}</div></div>
      <div style="text-align:right;font-size:11px;color:#444">
        <div>Impreso: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}</div>
        <div>Clientes: ${carteraClientes.value.length}</div>
      </div>
    </div>
    <div class="cards">
      <div class="card"><div class="lbl">Total Facturado</div><div class="val" style="color:#8b6b15">${formatCurrency(stats.value.total_facturado)}</div></div>
      <div class="card"><div class="lbl">Total Recaudado</div><div class="val" style="color:#2e7d32">${formatCurrency(stats.value.total_recaudado)}</div></div>
      <div class="card"><div class="lbl">Efectivo</div><div class="val" style="color:#1565c0">${formatCurrency(stats.value.total_efectivo_mes)}</div></div>
      <div class="card"><div class="lbl">Transferencia</div><div class="val" style="color:#7b1fa2">${formatCurrency(stats.value.total_transferencia_mes)}</div></div>
      <div class="card"><div class="lbl">Saldo Pendiente</div><div class="val" style="color:#c62828">${formatCurrency(stats.value.total_pendiente)}</div></div>
    </div>
    <table><thead><tr><th>#</th><th>Cliente</th><th>Pedidos</th><th>Facturado</th><th>Abonado</th><th>Efectivo</th><th>Transferencia</th><th>Saldo</th></tr></thead>
    <tbody>${filas || '<tr><td colspan="8" style="text-align:center;color:#888;padding:16px">Sin registros</td></tr>'}</tbody></table>
    <div class="foot"><div>18D Joyeros — Informe de Cartera</div><div>Generado automáticamente</div></div>
    <script>window.onload=()=>window.print()<\/script></body></html>`

  const w = window.open('', '_blank', 'width=1000,height=750')
  if (!w) return
  w.document.write(html)
  w.document.close()
}

// ── Reporte PDF por Cliente (Facturas Adeudadas) ──────────────
const generarReporteClientePdf = async (cliente: CarteraCliente) => {
  isGeneratingReport.value[cliente.cliente_id] = true
  try {
    const pedidosAdeudados = await carteraStore.fetchPedidosAdeudadosDetallados(cliente.cliente_id)

    if (!pedidosAdeudados || pedidosAdeudados.length === 0) {
      snackbar.value = {
        show: true,
        message: `El cliente ${cliente.nombre} ${cliente.apellido} no tiene facturas ni saldos adeudados pendientes.`,
        color: 'success',
      }
      return
    }

    const totalFacturadoAdeudado = pedidosAdeudados.reduce((sum, p) => sum + (p.total_pedido || 0), 0)
    const totalAbonadoAdeudado = pedidosAdeudados.reduce((sum, p) => sum + (p.total_abonado || 0), 0)
    const totalSaldoAdeudado = pedidosAdeudados.reduce((sum, p) => sum + (p.saldo_pendiente || 0), 0)

    const fechaEmisionActual = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // ── Páginas 2+: Generar cada factura adeudada con el diseño exacto de FacturaPedidoDialog ──
    const facturasPagesHtml = pedidosAdeudados.map(pedido => {
      let estadoChip = { label: 'ABONADO (PENDIENTE SALDO)', color: '#01579b', bg: '#e1f5fe', border: '#0288d1' }
      if (pedido.total_abonado === 0) {
        estadoChip = { label: 'SIN ABONOS', color: '#c62828', bg: '#ffebee', border: '#d32f2f' }
      }

      const abonosRowsHtml = (pedido.abonos && pedido.abonos.length > 0)
        ? pedido.abonos.map((a: any, i: number) => `
            <tr>
              <td class="text-center font-weight-bold" style="width: 40px;">${i + 1}</td>
              <td class="text-left">${formatDate(a.fecha)}</td>
              <td class="text-left text-capitalize">
                <span class="font-weight-medium" style="color: ${a.tipo_pago === 'efectivo' ? '#1565c0' : '#7b1fa2'};">
                  ${a.tipo_pago || 'efectivo'}
                </span>
              </td>
              <td class="text-left text-xs">${a.notas || 'Abono a pedido'}</td>
              <td class="text-right font-weight-bold font-mono" style="color: #1b5e20;">${formatCurrency(a.valor)}</td>
            </tr>
          `).join('')
        : ''

      return `
        <div class="invoice-page">
          <!-- Encabezado de la factura -->
          <div class="d-flex justify-space-between align-start mb-6 invoice-header">
            <div class="d-flex flex-column align-start">
              <div class="brand-logo-text">18D JOYEROS</div>
              <div class="company-details text-xs">
                <strong class="company-name text-body-2 font-weight-bold d-block">18D JOYEROS S.A.S</strong>
                <span>NIT: 901.482.930-1</span><br>
                <span>Joyería Fina & Diseños Personalizados 18k</span><br>
                <span>Medellín, Colombia</span><br>
                <span>Contacto: +57 (300) 18D-JOYA | info@18djoyeros.com</span>
              </div>
            </div>

            <div class="text-right invoice-meta">
              <div class="invoice-title text-h5 font-weight-bold mb-1">
                COMPROBANTE DE PEDIDO
              </div>
              <div class="invoice-number font-mono text-subtitle-1 font-weight-bold mb-1">
                ${pedido.referencia}
              </div>
              <div class="text-xs invoice-subtext mb-2">
                Fecha de Emisión: <strong>${fechaEmisionActual}</strong>
              </div>
              <div class="invoice-status-chip d-inline-block px-3 py-1 rounded text-xs font-weight-bold"
                   style="color: ${estadoChip.color}; background-color: ${estadoChip.bg}; border: 1px solid ${estadoChip.border};">
                ${estadoChip.label}
              </div>
            </div>
          </div>

          <hr class="invoice-divider mb-6" />

          <!-- Datos del cliente y tiempos -->
          <div class="invoice-info-grid mb-6">
            <div class="info-box pa-4 rounded-lg">
              <div class="info-box__title text-xs font-weight-bold text-uppercase mb-2">
                👤 Datos del Cliente
              </div>
              <div class="text-sm font-weight-bold text-capitalize info-box__main">
                ${cliente.nombre} ${cliente.apellido}
              </div>
              <div class="text-xs info-box__sub mt-1">
                Cliente de Cartera — 18D Joyeros
              </div>
            </div>

            <div class="info-box pa-4 rounded-lg">
              <div class="info-box__title text-xs font-weight-bold text-uppercase mb-2">
                📅 Tiempos del Trabajo
              </div>
              <div class="d-flex justify-space-between text-xs mb-1">
                <span class="info-box__sub">Fecha de Ingreso:</span>
                <strong class="info-box__main">${formatDate(pedido.fecha_inicio)}</strong>
              </div>
              <div class="d-flex justify-space-between text-xs mb-1">
                <span class="info-box__sub">Fecha Estimada Entrega:</span>
                <strong class="info-box__highlight">${formatDate(pedido.fecha_fin)}</strong>
              </div>
              <div class="d-flex justify-space-between text-xs">
                <span class="info-box__sub">Fecha Real de Entrega:</span>
                <strong style="color: #1b5e20;">${formatDate(pedido.fecha_entregado)}</strong>
              </div>
            </div>
          </div>

          <!-- Tabla de Especificaciones del Pedido -->
          <div class="table-section mb-6">
            <div class="section-title text-xs font-weight-bold text-uppercase mb-2">
              Detalle del Pedido & Especificaciones
            </div>

            <table class="invoice-table w-100">
              <thead>
                <tr>
                  <th class="text-left">DESCRIPCIÓN DE LA JOYA</th>
                  <th class="text-center">COLOR ORO</th>
                  <th class="text-center">TALLA</th>
                  <th class="text-center">PESO</th>
                  <th class="text-center">VALOR GRAMO</th>
                  <th class="text-right">VALOR TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div class="font-weight-bold text-body-2 item-title">
                      ${pedido.titulo}
                    </div>
                    ${pedido.descripcion ? `<div class="text-xs item-desc mt-1">${pedido.descripcion}</div>` : ''}
                  </td>
                  <td class="text-center">
                    <span class="badge-gold-color font-weight-medium text-xs">
                      ${pedido.color_oro?.nombre || 'Amarillo'}
                    </span>
                  </td>
                  <td class="text-center font-weight-medium text-xs">
                    ${pedido.talla || '-'}
                  </td>
                  <td class="text-center text-xs">
                    ${pedido.peso_final ? `<strong>${pedido.peso_final} g</strong> (Final)` : pedido.peso ? `${pedido.peso} g` : '-'}
                  </td>
                  <td class="text-center text-xs font-mono">
                    ${pedido.precio_gramo ? formatCurrency(pedido.precio_gramo) : '-'}
                  </td>
                  <td class="text-right font-weight-bold text-body-2 item-price">
                    ${formatCurrency(pedido.total_pedido)}
                  </td>
                </tr>

                ${pedido.peso_final > 0 && pedido.precio_gramo > 0 ? `
                  <tr class="sub-row">
                    <td colspan="5" class="text-right text-xs sub-row-label">
                      Liquidación Peso Final (${pedido.peso_final}g × ${formatCurrency(pedido.precio_gramo)}/g):
                    </td>
                    <td class="text-right text-xs font-mono sub-row-val">
                      ${formatCurrency(pedido.peso_final * pedido.precio_gramo)}
                    </td>
                  </tr>
                ` : ''}

                ${pedido.precio_adicionales > 0 ? `
                  <tr class="sub-row">
                    <td colspan="5" class="text-right text-xs sub-row-label">
                      Adicionales / Trabajo especial (${pedido.descripcion_adicionales || 'Piedras y engaste'}):
                    </td>
                    <td class="text-right text-xs font-mono sub-row-val">
                      ${formatCurrency(pedido.precio_adicionales)}
                    </td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>

          <!-- Historial de Abonos -->
          <div class="table-section mb-6">
            <div class="d-flex justify-space-between align-center mb-2">
              <div class="section-title text-xs font-weight-bold text-uppercase">
                Historial de Abonos & Pagos
              </div>
              <span class="text-xs font-weight-medium text-sub font-mono">
                ${pedido.abonos ? pedido.abonos.length : 0} abono(s) registrado(s)
              </span>
            </div>

            ${pedido.abonos && pedido.abonos.length > 0 ? `
              <table class="invoice-table invoice-table--abonos w-100">
                <thead>
                  <tr>
                    <th class="text-center" style="width: 40px;">#</th>
                    <th class="text-left">FECHA ABONO</th>
                    <th class="text-left">MEDIO DE PAGO</th>
                    <th class="text-left">CONCEPTO / NOTAS</th>
                    <th class="text-right">MONTO ABONADO</th>
                  </tr>
                </thead>
                <tbody>
                  ${abonosRowsHtml}
                </tbody>
              </table>
            ` : `
              <div class="no-abonos-box pa-4 rounded-lg text-center text-xs">
                No se han registrado abonos previos para este pedido.
              </div>
            `}
          </div>

          <!-- Resumen de Totales y Firmas -->
          <div class="d-flex justify-space-between align-start mt-6">
            <div class="invoice-terms text-xs">
              <strong>Condiciones de Cobro:</strong><br>
              • Garantía de por vida en la autenticidad del oro 18k.<br>
              • El saldo pendiente debe cancelarse al momento del retiro.<br>
              • Documento expedido por 18D Joyeros S.A.S.
            </div>

            <div class="totals-summary-box pa-4 rounded-lg">
              <div class="d-flex justify-space-between align-center mb-2 text-xs">
                <span class="totals-label">Total Pedido:</span>
                <strong class="totals-val font-mono">${formatCurrency(pedido.total_pedido)}</strong>
              </div>
              <div class="d-flex justify-space-between align-center mb-2 text-xs">
                <span class="totals-label font-weight-bold" style="color: #1b5e20;">(-) Total Abonado:</span>
                <strong class="totals-val font-mono font-weight-bold" style="color: #1b5e20;">-${formatCurrency(pedido.total_abonado)}</strong>
              </div>
              <hr class="my-2 totals-hr" />
              <div class="d-flex justify-space-between align-center text-body-1 font-weight-bold">
                <span class="totals-title" style="color: #c62828;">SALDO PENDIENTE:</span>
                <span class="totals-val font-mono" style="color: #c62828; font-size: 1.1rem;">${formatCurrency(pedido.saldo_pendiente)}</span>
              </div>
            </div>
          </div>

          <!-- Firmas -->
          <div class="signatures-row mt-8">
            <div class="signature-block text-center">
              <div class="signature-line"></div>
              <div class="signature-label text-xs font-weight-bold mt-1">FIRMA CLIENTE</div>
              <div class="signature-sub text-xs">${cliente.nombre} ${cliente.apellido}</div>
            </div>
            <div class="signature-block text-center">
              <div class="signature-line"></div>
              <div class="signature-label text-xs font-weight-bold mt-1">REPRESENTANTE 18D JOYEROS</div>
              <div class="signature-sub text-xs">Control de Cartera & Ventas</div>
            </div>
          </div>
        </div>
        <div class="page-break"></div>
      `
    }).join('')

    const printWindow = window.open('', '_blank', 'width=900,height=950')
    if (!printWindow) return

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Estado de Cuenta & Facturas - ${cliente.nombre} ${cliente.apellido}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #111; padding: 24px; }
          
          .page-break { page-break-after: always; break-after: page; }
          
          /* ── PÁGINA 1: PORTADA EXCLUSIVA ── */
          .cover-page {
            min-height: 90vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            border: 3px double #8b6b15;
            border-radius: 12px;
            padding: 32px;
            background: #fffcf7;
          }
          .cover-header { text-align: center; border-bottom: 2px solid #8b6b15; padding-bottom: 20px; margin-bottom: 24px; }
          .cover-brand { font-size: 28px; font-weight: 900; color: #8b6b15; letter-spacing: 2px; }
          .cover-subbrand { font-size: 13px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; font-weight: 600; }
          .cover-title { font-size: 18px; font-weight: 800; color: #1e1b16; margin-top: 16px; letter-spacing: 0.5px; }

          .cover-client-box { background: #ffffff; border: 1px solid #e0d4be; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
          .cover-client-label { font-size: 10px; text-transform: uppercase; color: #8b6b15; font-weight: 800; letter-spacing: 0.5px; }
          .cover-client-name { font-size: 22px; font-weight: 800; color: #111; margin-top: 2px; }
          .cover-meta { display: flex; justify-content: space-between; margin-top: 12px; font-size: 12px; color: #555; border-top: 1px dashed #eee; padding-top: 8px; }

          .cover-stats-grid { display: flex; gap: 14px; margin-bottom: 28px; }
          .cover-stat-card { flex: 1; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px; text-align: center; }
          .cover-stat-card.main-debt { border: 2px solid #ef9a9a; background: #ffebee; }
          .cover-stat-label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #666; }
          .cover-stat-card.main-debt .cover-stat-label { color: #c62828; }
          .cover-stat-val { font-size: 18px; font-weight: 800; margin-top: 4px; color: #111; }
          .cover-stat-card.main-debt .cover-stat-val { color: #c62828; font-size: 22px; }

          .cover-table-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #8b6b15; margin-bottom: 8px; letter-spacing: 0.5px; }
          .cover-table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden; }
          .cover-table th { background: #1e1b16; color: #f5d77f; padding: 8px 12px; font-size: 11px; text-transform: uppercase; text-align: left; }
          .cover-table td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 12px; }

          .cover-footer { text-align: center; border-top: 1px solid #e0d4be; padding-top: 12px; font-size: 11px; color: #777; }

          /* ── PÁGINAS 2+: FACTURAS COMPLEMENTARIAS ── */
          .invoice-page { padding: 10px 0; }
          .brand-logo-text { font-size: 22px; font-weight: 900; color: #8b6b15; letter-spacing: 1px; margin-bottom: 4px; }
          .font-mono { font-family: 'Courier New', Courier, monospace; }
          .d-flex { display: flex; }
          .flex-column { flex-direction: column; }
          .align-start { align-items: flex-start; }
          .align-center { align-items: center; }
          .justify-space-between { justify-content: space-between; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .text-capitalize { text-transform: capitalize; }
          .text-uppercase { text-transform: uppercase; }
          .font-weight-bold { font-weight: 700; }
          .font-weight-medium { font-weight: 500; }
          .text-xs { font-size: 0.75rem; }
          .text-sm { font-size: 0.875rem; }
          .text-body-2 { font-size: 0.875rem; }
          .text-body-1 { font-size: 1rem; }
          .text-subtitle-1 { font-size: 1rem; }
          .text-h5 { font-size: 1.35rem; }
          .d-block { display: block; }
          .d-inline-block { display: inline-block; }
          .mb-1 { margin-bottom: 4px; }
          .mb-2 { margin-bottom: 8px; }
          .mb-6 { margin-bottom: 20px; }
          .mt-1 { margin-top: 4px; }
          .mt-6 { margin-top: 20px; }
          .mt-8 { margin-top: 32px; }
          .pa-4 { padding: 14px; }
          .px-3 { padding-left: 12px; padding-right: 12px; }
          .py-1 { padding-top: 4px; padding-bottom: 4px; }
          .my-2 { margin-top: 8px; margin-bottom: 8px; }
          .w-100 { width: 100%; }
          .rounded { border-radius: 4px; }
          .rounded-lg { border-radius: 8px; }
          .company-name { color: #111; font-size: 0.875rem; }
          .company-details, .company-details span { color: #444; }
          .invoice-title { color: #8b6b15; }
          .invoice-number { color: #111; }
          .invoice-subtext { color: #555; }
          .invoice-subtext strong { color: #111; }
          hr.invoice-divider { border: 0; border-top: 2px solid #8b6b15; opacity: 0.9; }
          .invoice-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .info-box { background: #fdfbf7; border: 1px solid #e5dac4; color: #111; }
          .info-box__title { color: #8b6b15; }
          .info-box__main { color: #111; }
          .info-box__sub { color: #444; }
          .info-box__highlight { color: #8b6b15; }
          .section-title { color: #555; letter-spacing: 0.5px; }
          .text-sub { color: #555; }
          .item-title { color: #111; }
          .item-desc { color: #444; }
          .item-price { color: #111; }
          .sub-row-label { color: #555; }
          .sub-row-val { color: #222; }
          table.invoice-table { border-collapse: collapse; width: 100%; }
          .invoice-table th { background: #1e1b16; color: #f5d77f; padding: 8px 10px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px; border-bottom: 2px solid #8b6b15; }
          .invoice-table td { padding: 8px 10px; border-bottom: 1px solid #e0e0e0; color: #111; }
          .invoice-table .sub-row td { background: #f8f8f8; padding: 6px 10px; }
          .invoice-table--abonos th { background: #2b2b2b; color: #fff; border-bottom: 2px solid #666; }
          .badge-gold-color { background: rgba(201,168,76,0.2); color: #8b6b15; border: 1px solid rgba(201,168,76,0.4); padding: 3px 8px; border-radius: 4px; }
          .no-abonos-box { background: #f9f9f9; border: 1px dashed #ccc; color: #555; }
          .totals-summary-box { width: 320px; background: #fdfbf7; border: 1px solid #d9ccaf; color: #111; }
          .totals-label { color: #444; }
          .totals-val { color: #111; }
          .totals-title { color: #111; }
          hr.totals-hr { border-color: #d9ccaf; }
          .invoice-terms { color: #444; }
          .invoice-terms strong { color: #111; }
          .signature-block { width: 220px; }
          .signature-line { border-bottom: 1px solid #222; height: 35px; }
          .signature-label { color: #111; }
          .signature-sub { color: #444; }
          .signatures-row { display: flex; justify-content: space-around; margin-top: 28px; }

          @media print {
            body { padding: 0; margin: 0; }
            @page { size: A4; margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <!-- ── PÁGINA 1: PORTADA EXCLUSIVA ── -->
        <div class="cover-page">
          <div>
            <div class="cover-header">
              <div class="cover-brand">18D JOYEROS</div>
              <div class="cover-subbrand">Joyería Fina & Diseños Personalizados 18k — Medellín, Colombia</div>
              <div class="cover-title">ESTADO DE CUENTA & REPORTE DE CARTERA</div>
            </div>

            <div class="cover-client-box">
              <div class="cover-client-label">ESTADO DE CUENTA DE CARTERA PARA</div>
              <div class="cover-client-name">${cliente.nombre} ${cliente.apellido}</div>
              <div class="cover-meta">
                <span>Fecha de Emisión: <strong>${fechaEmisionActual}</strong></span>
                <span>Facturas Pendientes: <strong>${pedidosAdeudados.length} pedido(s) adeudado(s)</strong></span>
              </div>
            </div>

            <div class="cover-stats-grid">
              <div class="cover-stat-card main-debt">
                <div class="cover-stat-label">DEUDA TOTAL PENDIENTE</div>
                <div class="cover-stat-val">${formatCurrency(totalSaldoAdeudado)}</div>
              </div>
              <div class="cover-stat-card">
                <div class="cover-stat-label">TOTAL FACTURADO (ADEUDADOS)</div>
                <div class="cover-stat-val" style="color: #8b6b15;">${formatCurrency(totalFacturadoAdeudado)}</div>
              </div>
              <div class="cover-stat-card">
                <div class="cover-stat-label">TOTAL ABONADO A LA FECHA</div>
                <div class="cover-stat-val" style="color: #2e7d32;">${formatCurrency(totalAbonadoAdeudado)}</div>
              </div>
            </div>

            <div class="cover-table-title">RESUMEN DE FACTURAS ADEUDADAS</div>
            <table class="cover-table">
              <thead>
                <tr>
                  <th style="width: 30px;">#</th>
                  <th>Ref. Pedido</th>
                  <th>Descripción / Título</th>
                  <th style="text-align: center;">Fecha Entrega</th>
                  <th style="text-align: right;">Total Pedido</th>
                  <th style="text-align: right;">Total Abonado</th>
                  <th style="text-align: right;">Saldo Pendiente</th>
                </tr>
              </thead>
              <tbody>
                ${pedidosAdeudados.map((p, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td style="font-weight: 700; color: #8b6b15;">${p.referencia}</td>
                    <td>${p.titulo}</td>
                    <td style="text-align: center;">${formatDate(p.fecha_entregado)}</td>
                    <td style="text-align: right;">${formatCurrency(p.total_pedido)}</td>
                    <td style="text-align: right; color: #1b5e20;">${formatCurrency(p.total_abonado)}</td>
                    <td style="text-align: right; font-weight: bold; color: #c62828;">${formatCurrency(p.saldo_pendiente)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="cover-footer">
            18D Joyeros S.A.S — NIT: 901.482.930-1 — Documento Oficial de Control de Cartera
          </div>
        </div>

        <div class="page-break"></div>

        <!-- ── PÁGINAS 2+: FACTURAS ADJUNTAS ── -->
        ${facturasPagesHtml}

        <script>
          window.onload = function() {
            window.print();
          }
        <\/script>
      </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
  } catch (error: any) {
    console.error('Error al generar reporte de cliente:', error)
    snackbar.value = { show: true, message: error.message || 'Error al generar reporte', color: 'error' }
  } finally {
    isGeneratingReport.value[cliente.cliente_id] = false
  }
}

watch([fechaInicio, fechaFin, selectedCliente], loadAll, { deep: true })

onMounted(async () => {
  try {
    clientes.value = await carteraStore.fetchClientes()
  } catch {}
  loadAll()
})
</script>

<template>
  <section>
    <!-- ── Header ─────────────────────────────── -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h4 class="text-h4 font-weight-bold d-flex align-center gap-2">
          <VIcon icon="tabler-report-money" color="primary" size="28" />
          Cartera & Cuentas por Cobrar
        </h4>
        <p class="text-body-1 text-disabled mb-0">
          Seguimiento de cobros, facturas adeudadas y saldos pendientes por cliente
        </p>
      </div>
      <VBtn color="secondary" variant="tonal" prepend-icon="tabler-printer" @click="printReporte">
        Imprimir / PDF
      </VBtn>
    </div>

    <!-- ── Filtros ─────────────────────────────── -->
    <VCard class="mb-6" elevation="1">
      <VCardText class="py-3">
        <VRow dense align="center">
          <VCol cols="12" sm="3">
            <AppDateTimePicker
              v-model="fechaInicio"
              label="Desde"
              placeholder="Fecha inicio"
              density="compact"
              clearable
              :config="{ dateFormat: 'Y-m-d' }"
            />
          </VCol>
          <VCol cols="12" sm="3">
            <AppDateTimePicker
              v-model="fechaFin"
              label="Hasta"
              placeholder="Fecha fin"
              density="compact"
              clearable
              :config="{ dateFormat: 'Y-m-d' }"
            />
          </VCol>
          <VCol cols="12" sm="4">
            <AppAutocomplete
              v-model="selectedCliente"
              :items="[{ value: null, title: 'Todos los clientes' }, ...clientes.map(c => ({ value: c.id, title: `${c.nombre} ${c.apellido}` }))]"
              label="Filtrar por cliente"
              placeholder="Todos los clientes"
              density="compact"
              clearable
            />
          </VCol>
          <VCol cols="12" sm="2" class="d-flex align-end">
            <VBtn block color="primary" variant="tonal" :loading="isLoadingStats || isLoadingClientes" @click="loadAll">
              <VIcon icon="tabler-refresh" class="me-1" size="16" />
              Actualizar
            </VBtn>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- ── Stats cards ────────────────────────── -->
    <VRow class="mb-6">
      <!-- Facturado -->
      <VCol cols="12" sm="6" lg="2">
        <VCard elevation="2" class="h-100">
          <VCardText class="d-flex align-center gap-3 pa-4">
            <VAvatar color="warning" variant="tonal" size="48" rounded="lg">
              <VIcon icon="tabler-file-invoice" size="26" />
            </VAvatar>
            <div>
              <span class="text-caption text-uppercase font-weight-bold text-disabled d-block">Facturado</span>
              <span class="text-h6 font-weight-bold text-warning">{{ formatCurrency(stats.total_facturado) }}</span>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Recaudado -->
      <VCol cols="12" sm="6" lg="2">
        <VCard elevation="2" class="h-100">
          <VCardText class="d-flex align-center gap-3 pa-4">
            <VAvatar color="success" variant="tonal" size="48" rounded="lg">
              <VIcon icon="tabler-circle-check" size="26" />
            </VAvatar>
            <div>
              <span class="text-caption text-uppercase font-weight-bold text-disabled d-block">Recaudado</span>
              <span class="text-h6 font-weight-bold text-success">{{ formatCurrency(stats.total_recaudado) }}</span>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Efectivo -->
      <VCol cols="12" sm="6" lg="2">
        <VCard elevation="2" class="h-100">
          <VCardText class="d-flex align-center gap-3 pa-4">
            <VAvatar color="info" variant="tonal" size="48" rounded="lg">
              <VIcon icon="tabler-cash" size="26" />
            </VAvatar>
            <div>
              <span class="text-caption text-uppercase font-weight-bold text-disabled d-block">Efectivo</span>
              <span class="text-h6 font-weight-bold text-info">{{ formatCurrency(stats.total_efectivo_mes) }}</span>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Transferencia -->
      <VCol cols="12" sm="6" lg="2">
        <VCard elevation="2" class="h-100">
          <VCardText class="d-flex align-center gap-3 pa-4">
            <VAvatar color="secondary" variant="tonal" size="48" rounded="lg">
              <VIcon icon="tabler-building-bank" size="26" />
            </VAvatar>
            <div>
              <span class="text-caption text-uppercase font-weight-bold text-disabled d-block">Transferencia</span>
              <span class="text-h6 font-weight-bold text-secondary">{{ formatCurrency(stats.total_transferencia_mes) }}</span>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Pendiente -->
      <VCol cols="12" sm="6" lg="2">
        <VCard elevation="2" class="h-100">
          <VCardText class="d-flex align-center gap-3 pa-4">
            <VAvatar color="error" variant="tonal" size="48" rounded="lg">
              <VIcon icon="tabler-alert-circle" size="26" />
            </VAvatar>
            <div>
              <span class="text-caption text-uppercase font-weight-bold text-disabled d-block">Por cobrar</span>
              <span class="text-h6 font-weight-bold text-error">{{ formatCurrency(stats.total_pendiente) }}</span>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Clientes con saldo -->
      <VCol cols="12" sm="6" lg="2">
        <VCard elevation="2" class="h-100">
          <VCardText class="d-flex align-center gap-3 pa-4">
            <VAvatar color="primary" variant="tonal" size="48" rounded="lg">
              <VIcon icon="tabler-users" size="26" />
            </VAvatar>
            <div>
              <span class="text-caption text-uppercase font-weight-bold text-disabled d-block">Con saldo</span>
              <span class="text-h6 font-weight-bold text-primary">{{ stats.clientes_con_saldo }}</span>
              <span class="text-xs text-disabled d-block">clientes</span>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- ── Tabla por cliente ───────────────────── -->
    <VCard elevation="2">
      <VCardItem class="pa-4">
        <VCardTitle class="d-flex align-center gap-2">
          <VIcon icon="tabler-users" size="20" color="primary" />
          Cartera por Cliente
        </VCardTitle>
        <template #append>
          <VProgressCircular v-if="isLoadingClientes" indeterminate size="22" width="2" color="primary" />
        </template>
      </VCardItem>
      <VDivider />

      <VCardText class="pa-0">
        <!-- Empty -->
        <div v-if="!isLoadingClientes && carteraClientes.length === 0" class="py-12 text-center">
          <VIcon icon="tabler-report-off" size="56" color="disabled" class="mb-3" style="opacity:0.3" />
          <p class="text-body-1 text-disabled mb-0">
            No hay pedidos entregados en el período seleccionado
          </p>
        </div>

        <!-- Cards de clientes -->
        <div v-else class="pa-4 d-flex flex-column gap-3">
          <div
            v-for="cliente in carteraClientes"
            :key="cliente.cliente_id"
            class="cliente-card"
            @click="openDetalle(cliente)"
          >
            <!-- ── Zona superior: identidad + estado ── -->
            <div class="cliente-card__header">
              <div class="d-flex align-center gap-3">
                <VAvatar
                  :color="cliente.saldo_pendiente > 0 ? 'error' : 'success'"
                  variant="tonal"
                  size="44"
                  rounded="lg"
                >
                  <span class="text-body-1 font-weight-black">
                    {{ (cliente.nombre[0] || '').toUpperCase() }}{{ (cliente.apellido[0] || '').toUpperCase() }}
                  </span>
                </VAvatar>
                <div>
                  <div class="text-body-1 font-weight-bold text-on-surface">
                    {{ cliente.nombre }} {{ cliente.apellido }}
                  </div>
                  <div class="d-flex align-center gap-2 mt-1">
                    <VChip
                      size="x-small"
                      color="primary"
                      variant="tonal"
                      prepend-icon="tabler-shopping-bag"
                    >
                      {{ cliente.pedidos_count }} pedido{{ cliente.pedidos_count !== 1 ? 's' : '' }}
                    </VChip>
                    <VChip
                      size="x-small"
                      :color="cliente.saldo_pendiente > 0 ? 'error' : 'success'"
                      variant="tonal"
                    >
                      {{ cliente.saldo_pendiente > 0 ? 'Con saldo' : 'Al día' }}
                    </VChip>
                  </div>
                </div>
              </div>
              <div class="d-flex align-center gap-2 flex-shrink-0">
                <VBtn
                  size="small"
                  variant="tonal"
                  color="secondary"
                  prepend-icon="tabler-file-download"
                  :loading="isGeneratingReport[cliente.cliente_id]"
                  @click.stop="generarReporteClientePdf(cliente)"
                >
                  Reporte PDF
                </VBtn>

                <VBtn
                  size="small"
                  variant="tonal"
                  color="primary"
                  prepend-icon="tabler-eye"
                  @click.stop="openDetalle(cliente)"
                >
                  Ver detalle
                </VBtn>
              </div>
            </div>

            <!-- ── Zona métricas: 4 columnas ── -->
            <div class="cliente-card__metrics">
              <div class="metric-col">
                <div class="metric-col__icon-wrap metric-col__icon-wrap--warning">
                  <VIcon icon="tabler-file-invoice" size="14" color="warning" />
                </div>
                <div class="metric-col__label">Facturado</div>
                <div class="metric-col__value text-warning">{{ formatCurrency(cliente.total_pedidos) }}</div>
              </div>

              <div class="metric-divider" />

              <div class="metric-col">
                <div class="metric-col__icon-wrap metric-col__icon-wrap--success">
                  <VIcon icon="tabler-circle-check" size="14" color="success" />
                </div>
                <div class="metric-col__label">Recaudado</div>
                <div class="metric-col__value text-success">{{ formatCurrency(cliente.total_abonado) }}</div>
              </div>

              <div class="metric-divider" />

              <div class="metric-col">
                <div class="metric-col__icon-wrap metric-col__icon-wrap--info">
                  <VIcon icon="tabler-cash" size="14" color="info" />
                </div>
                <div class="metric-col__label">Efectivo</div>
                <div class="metric-col__value text-info">{{ formatCurrency(cliente.total_efectivo) }}</div>
              </div>

              <div class="metric-divider" />

              <div class="metric-col">
                <div class="metric-col__icon-wrap metric-col__icon-wrap--secondary">
                  <VIcon icon="tabler-building-bank" size="14" color="secondary" />
                </div>
                <div class="metric-col__label">Transferencia</div>
                <div class="metric-col__value text-secondary">{{ formatCurrency(cliente.total_transferencia) }}</div>
              </div>

              <div class="metric-divider metric-divider--strong" />

              <div class="metric-col metric-col--saldo">
                <div
                  class="metric-col__icon-wrap"
                  :class="cliente.saldo_pendiente > 0 ? 'metric-col__icon-wrap--error' : 'metric-col__icon-wrap--success'"
                >
                  <VIcon
                    :icon="cliente.saldo_pendiente > 0 ? 'tabler-alert-circle' : 'tabler-circle-check'"
                    size="14"
                    :color="cliente.saldo_pendiente > 0 ? 'error' : 'success'"
                  />
                </div>
                <div class="metric-col__label">Por cobrar</div>
                <div
                  class="metric-col__value font-weight-black"
                  :class="cliente.saldo_pendiente > 0 ? 'text-error' : 'text-success'"
                >
                  {{ formatCurrency(cliente.saldo_pendiente) }}
                </div>
              </div>
            </div>

            <!-- ── Barra progreso ── -->
            <div class="cliente-card__footer">
              <div class="d-flex justify-space-between align-center mb-1">
                <span class="text-xs text-disabled font-weight-medium">Progreso de cobro</span>
                <span
                  class="text-xs font-weight-bold"
                  :class="porcentajeCobrado(cliente) >= 100 ? 'text-success' : porcentajeCobrado(cliente) >= 50 ? 'text-warning' : 'text-error'"
                >{{ porcentajeCobrado(cliente) }}%</span>
              </div>
              <VProgressLinear
                :model-value="porcentajeCobrado(cliente)"
                :color="porcentajeCobrado(cliente) >= 100 ? 'success' : porcentajeCobrado(cliente) >= 50 ? 'warning' : 'error'"
                bg-color="rgba(var(--v-border-color), 0.2)"
                rounded
                height="6"
              />
            </div>
          </div>
        </div>
      </VCardText>
    </VCard>

    <!-- ── Dialog Detalle Cliente ─────────────── -->
    <VDialog v-model="detalleDialogOpen" max-width="820" scrollable>
      <VCard v-if="clienteSeleccionadoInfo">
        <VCardItem class="pa-4">
          <VCardTitle class="d-flex align-center gap-2">
            <VIcon icon="tabler-user-circle" color="primary" size="20" />
            {{ clienteSeleccionadoInfo.nombre }} {{ clienteSeleccionadoInfo.apellido }}
          </VCardTitle>
          <template #append>
            <div class="d-flex align-center gap-2">
              <VBtn
                size="small"
                variant="tonal"
                color="secondary"
                prepend-icon="tabler-file-download"
                :loading="isGeneratingReport[clienteSeleccionadoInfo.cliente_id]"
                @click="generarReporteClientePdf(clienteSeleccionadoInfo)"
              >
                Reporte PDF
              </VBtn>
              <VBtn icon variant="text" size="small" @click="detalleDialogOpen = false">
                <VIcon icon="tabler-x" />
              </VBtn>
            </div>
          </template>
        </VCardItem>
        <VDivider />

        <!-- Resumen del cliente -->
        <VCardText class="pa-4">
          <VRow dense class="mb-4">
            <VCol cols="6" sm="3">
              <div class="resumen-box">
                <span class="resumen-label">Facturado</span>
                <span class="resumen-val text-warning">{{ formatCurrency(clienteSeleccionadoInfo.total_pedidos) }}</span>
              </div>
            </VCol>
            <VCol cols="6" sm="3">
              <div class="resumen-box">
                <span class="resumen-label">Abonado</span>
                <span class="resumen-val text-success">{{ formatCurrency(clienteSeleccionadoInfo.total_abonado) }}</span>
              </div>
            </VCol>
            <VCol cols="6" sm="3">
              <div class="resumen-box">
                <span class="resumen-label">Efectivo</span>
                <span class="resumen-val text-info">{{ formatCurrency(clienteSeleccionadoInfo.total_efectivo) }}</span>
              </div>
            </VCol>
            <VCol cols="6" sm="3">
              <div class="resumen-box border-error">
                <span class="resumen-label">Saldo Pendiente</span>
                <span class="resumen-val text-error font-weight-bold">{{ formatCurrency(clienteSeleccionadoInfo.saldo_pendiente) }}</span>
              </div>
            </VCol>
          </VRow>

          <VProgressLinear
            :model-value="porcentajeCobrado(clienteSeleccionadoInfo)"
            :color="porcentajeCobrado(clienteSeleccionadoInfo) >= 100 ? 'success' : 'warning'"
            rounded height="8" class="mb-4"
          />

          <!-- Pedidos del cliente -->
          <div v-if="isLoadingDetalle" class="text-center py-6">
            <VProgressCircular indeterminate color="primary" />
          </div>

          <div v-else-if="detalleCliente.length === 0" class="text-center py-6 text-disabled">
            Sin pedidos entregados en el período
          </div>

          <div v-else>
            <div
              v-for="pedido in detalleCliente"
              :key="pedido.id"
              class="pedido-row mb-2"
            >
              <div class="d-flex align-center justify-space-between flex-wrap gap-2">
                <div>
                  <div class="d-flex align-center gap-2">
                    <VChip size="x-small" color="primary" variant="tonal">{{ pedido.referencia }}</VChip>
                    <span class="font-weight-medium text-body-2">{{ pedido.titulo }}</span>
                  </div>
                  <div class="text-xs text-disabled mt-1">
                    <VIcon icon="tabler-calendar-check" size="12" class="me-1" />
                    Entregado: {{ formatDate(pedido.fecha_entregado) }}
                  </div>
                </div>
                <div class="d-flex gap-3 text-sm flex-wrap">
                  <span class="text-disabled">Total: <strong class="text-on-surface">{{ formatCurrency(pedido.total_pedido) }}</strong></span>
                  <span class="text-disabled">Abono: <strong class="text-success">{{ formatCurrency(pedido.total_abonado) }}</strong></span>
                  <span>
                    <VChip
                      size="small"
                      :color="pedido.saldo_pendiente <= 0 ? 'success' : 'error'"
                      variant="tonal"
                    >
                      {{ pedido.saldo_pendiente <= 0 ? 'Pagado' : `Debe: ${formatCurrency(pedido.saldo_pendiente)}` }}
                    </VChip>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </VCardText>
      </VCard>
    </VDialog>

    <VSnackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </VSnackbar>
  </section>
</template>

<style scoped>
/* ── Card principal ── */
.cliente-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
  background: rgba(var(--v-theme-surface), 1);
}
.cliente-card:hover {
  box-shadow: 0 6px 24px rgba(var(--v-shadow-key-umbra-color), 0.1);
  border-color: rgba(var(--v-theme-primary), 0.35);
  transform: translateY(-1px);
}

/* ── Header: identidad + botón ── */
.cliente-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  gap: 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

/* ── Métricas: fila de columnas ── */
.cliente-card__metrics {
  display: flex;
  align-items: center;
  padding: 0;
  background: rgba(var(--v-theme-on-surface), 0.015);
}

.metric-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 14px 8px;
  gap: 4px;
  min-width: 0;
}
.metric-col--saldo {
  flex: 1.3;
}
.metric-col__icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  margin-bottom: 2px;
}
.metric-col__icon-wrap--warning { background: rgba(var(--v-theme-warning), 0.12); }
.metric-col__icon-wrap--success { background: rgba(var(--v-theme-success), 0.12); }
.metric-col__icon-wrap--info    { background: rgba(var(--v-theme-info),    0.12); }
.metric-col__icon-wrap--secondary { background: rgba(var(--v-theme-secondary), 0.12); }
.metric-col__icon-wrap--error   { background: rgba(var(--v-theme-error),   0.12); }

.metric-col__label {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.45);
  white-space: nowrap;
}
.metric-col__value {
  font-size: 0.88rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-align: center;
}

/* Divisores entre columnas */
.metric-divider {
  width: 1px;
  height: 40px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
  flex-shrink: 0;
}
.metric-divider--strong {
  height: 48px;
  background: rgba(var(--v-border-color), calc(var(--v-border-opacity) * 2));
}

/* ── Footer: barra progreso ── */
.cliente-card__footer {
  padding: 10px 18px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface), 1);
}

/* ── Resumen dentro del dialog ── */
.resumen-box {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  padding: 10px 14px;
  text-align: center;
}
.resumen-label {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-weight: 600;
  margin-bottom: 4px;
}
.resumen-val {
  display: block;
  font-size: 1rem;
  font-weight: 700;
}
.pedido-row {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  padding: 10px 14px;
  background: rgba(var(--v-theme-surface), 0.6);
}
</style>

<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { useDisplay } from 'vuetify'
import { CARTERA_STATS_VACIAS, useCarteraStore } from '@/views/apps/cartera/useCarteraStore'
import type { CarteraCliente, CarteraEstado, CarteraFiltros, CarteraOrden, CarteraPedido, CarteraStats } from '@/views/apps/cartera/useCarteraStore'
import { useNegocioStore } from '@/views/apps/configuracion/useNegocioStore'

const carteraStore = useCarteraStore()
const negocio = useNegocioStore()
const { formatCurrency, formatShortDate, formatDate: formatFechaLarga, formatNowDateTime } = useFormato()
const { imprimirHtml } = usePrintDocument()
const { xs } = useDisplay()

// ── Filtros ──────────────────────────────────
type Periodo = 'todo' | 'mes' | 'mes_anterior' | 'trimestre' | 'anio' | 'personalizado'

const periodos: { value: Periodo; title: string }[] = [
  { value: 'todo', title: 'Todo' },
  { value: 'mes', title: 'Este mes' },
  { value: 'mes_anterior', title: 'Mes anterior' },
  { value: 'trimestre', title: 'Últimos 3 meses' },
  { value: 'anio', title: 'Este año' },
]

const periodo = ref<Periodo>('todo')
const fechaInicio = ref<string | null>(null)
const fechaFin = ref<string | null>(null)
const busqueda = ref('')
const busquedaAplicada = ref('')
const estadoFiltro = ref<CarteraEstado>('todos')

// 'YYYY-MM-DD' en hora local; toISOString() pasaría a UTC y correría el día
const toLocalDateStr = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')

  return `${y}-${m}-${d}`
}

const rangoDePeriodo = (p: Periodo): [string | null, string | null] => {
  const hoy = new Date()
  const y = hoy.getFullYear()
  const m = hoy.getMonth()

  const rangos: Partial<Record<Periodo, () => [Date, Date]>> = {
    mes: () => [new Date(y, m, 1), new Date(y, m + 1, 0)],
    mes_anterior: () => [new Date(y, m - 1, 1), new Date(y, m, 0)],
    trimestre: () => [new Date(y, m - 2, 1), new Date(y, m + 1, 0)],
    anio: () => [new Date(y, 0, 1), new Date(y, 11, 31)],
  }

  const rango = rangos[p]?.()

  return rango ? [toLocalDateStr(rango[0]), toLocalDateStr(rango[1])] : [null, null]
}

const aplicarPeriodo = (p: Periodo) => {
  periodo.value = p

  const [desde, hasta] = rangoDePeriodo(p)

  fechaInicio.value = desde
  fechaFin.value = hasta
}

// Editar las fechas a mano convierte el período en "personalizado"
watch([fechaInicio, fechaFin], ([desde, hasta]) => {
  if (periodo.value === 'personalizado')
    return

  const [pd, ph] = rangoDePeriodo(periodo.value)
  if ((desde || null) !== pd || (hasta || null) !== ph)
    periodo.value = 'personalizado'
})

watchDebounced(busqueda, valor => {
  busquedaAplicada.value = (valor || '').trim()
}, { debounce: 350 })

const filtros = computed<CarteraFiltros>(() => ({
  fechaInicio: fechaInicio.value || null,
  fechaFin: fechaFin.value || null,
  busqueda: busquedaAplicada.value || null,
}))

const hayFiltros = computed(() => !!(fechaInicio.value || fechaFin.value || busqueda.value || estadoFiltro.value !== 'todos'))

const limpiarFiltros = () => {
  aplicarPeriodo('todo')
  busqueda.value = ''
  busquedaAplicada.value = ''
  estadoFiltro.value = 'todos'
}

// ── Tabla (paginada en el servidor) ──────────
const headers = [
  { title: 'Cliente', key: 'cliente' },
  { title: 'Pedidos', key: 'pedidos_count', align: 'center' as const },
  { title: 'Facturado', key: 'total_pedidos', align: 'end' as const },
  { title: 'Recaudado', key: 'total_abonado', align: 'end' as const },
  { title: 'Por cobrar', key: 'saldo_pendiente', align: 'end' as const },
  { title: 'Cobrado', key: 'porcentaje_cobrado', width: 170 },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'center' as const },
]

const page = ref(1)
const itemsPerPage = ref(25)
const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([{ key: 'saldo_pendiente', order: 'desc' }])

const ordenActual = computed(() => ({
  estado: estadoFiltro.value,
  orden: (sortBy.value[0]?.key || 'saldo_pendiente') as CarteraOrden,
  desc: (sortBy.value[0]?.order || 'desc') === 'desc',
}))

// ── Estado ───────────────────────────────────
const isLoadingStats = ref(false)
const isLoadingClientes = ref(false)
const isLoadingDetalle = ref(false)
const isPrinting = ref(false)

const stats = ref<CarteraStats>({ ...CARTERA_STATS_VACIAS })

const carteraClientes = ref<CarteraCliente[]>([])
const totalClientes = ref(0)
const detalleCliente = ref<CarteraPedido[]>([])
const clienteSeleccionadoInfo = ref<CarteraCliente | null>(null)
const detalleDialogOpen = ref(false)
const soloConSaldoDetalle = ref(false)
const snackbar = ref({ show: false, message: '', color: 'error' })
const isGeneratingReport = ref<Record<string, boolean>>({})

const detalleFiltrado = computed(() => soloConSaldoDetalle.value
  ? detalleCliente.value.filter(p => p.saldo_pendiente > 0)
  : detalleCliente.value)

// ── Helpers ───────────────────────────────────
const formatDate = (d: string | null | undefined) => formatShortDate(d)

const rangoTexto = computed(() => `${fechaInicio.value ? formatDate(fechaInicio.value) : 'Inicio'} al ${fechaFin.value ? formatDate(fechaFin.value) : 'Hoy'}`)

const porcentajeRecaudado = computed(() => stats.value.total_facturado
  ? Math.min(100, Math.round((stats.value.total_recaudado / stats.value.total_facturado) * 100))
  : 0)

const porcentajeEfectivo = computed(() => stats.value.total_recaudado
  ? Math.round((stats.value.total_efectivo / stats.value.total_recaudado) * 100)
  : 0)

const colorProgreso = (pct: number) => pct >= 100 ? 'success' : pct >= 50 ? 'warning' : 'error'

const iniciales = (c: { nombre: string; apellido: string }) =>
  `${(c.nombre[0] || '').toUpperCase()}${(c.apellido[0] || '').toUpperCase()}` || '?'

// Condiciones de cobro configuradas (una por línea) + emisor del documento
const condicionesCarteraHtml = () => [
  ...(negocio.config.terminos_cartera || '').split('\n').map(linea => linea.trim()).filter(Boolean),
  `Documento expedido por ${negocio.razonSocial}.`,
].map(linea => `• ${linea}`).join('<br>')

// ── Fetch ─────────────────────────────────────
// Contadores de solicitud: si llega una respuesta vieja después de una nueva, se descarta
let solicitudStats = 0
let solicitudLista = 0
let solicitudDetalle = 0

const loadStats = async () => {
  const solicitud = ++solicitudStats

  isLoadingStats.value = true
  try {
    const resultado = await carteraStore.fetchCarteraStats(filtros.value)
    if (solicitud === solicitudStats)
      stats.value = resultado
  }
  catch (e: any) {
    snackbar.value = { show: true, message: e.message || 'Error al cargar estadísticas', color: 'error' }
  }
  finally {
    if (solicitud === solicitudStats)
      isLoadingStats.value = false
  }
}

const loadCartera = async () => {
  const solicitud = ++solicitudLista

  isLoadingClientes.value = true
  try {
    const { items, total } = await carteraStore.fetchCarteraByCliente(filtros.value, {
      ...ordenActual.value,
      page: page.value,
      itemsPerPage: itemsPerPage.value,
    })

    if (solicitud === solicitudLista) {
      carteraClientes.value = items
      totalClientes.value = total
    }
  }
  catch (e: any) {
    snackbar.value = { show: true, message: e.message || 'Error al cargar cartera', color: 'error' }
  }
  finally {
    if (solicitud === solicitudLista)
      isLoadingClientes.value = false
  }
}

const loadAll = () => {
  loadStats()
  loadCartera()
}

const irPrimeraPaginaYCargar = () => {
  if (page.value !== 1)
    page.value = 1
  else
    loadCartera()
}

const openDetalle = async (cliente: CarteraCliente) => {
  const solicitud = ++solicitudDetalle

  clienteSeleccionadoInfo.value = cliente
  detalleCliente.value = []
  soloConSaldoDetalle.value = false
  detalleDialogOpen.value = true
  isLoadingDetalle.value = true
  try {
    const pedidos = await carteraStore.fetchPedidosByCliente(cliente.cliente_id, filtros.value)
    if (solicitud === solicitudDetalle)
      detalleCliente.value = pedidos
  }
  catch (e: any) {
    snackbar.value = { show: true, message: e.message || 'Error al cargar detalle', color: 'error' }
  }
  finally {
    if (solicitud === solicitudDetalle)
      isLoadingDetalle.value = false
  }
}

const etiquetaEstado: Record<CarteraEstado, string> = {
  todos: 'Todos los clientes',
  con_saldo: 'Solo clientes con saldo',
  al_dia: 'Solo clientes al día',
}

const opcionesEstado = computed(() => [
  { value: 'todos' as const, title: 'Todos', icon: 'tabler-users', color: 'medium-emphasis', count: stats.value.total_clientes },
  { value: 'con_saldo' as const, title: 'Con saldo', icon: 'tabler-alert-circle', color: 'error', count: stats.value.clientes_con_saldo },
  { value: 'al_dia' as const, title: 'Al día', icon: 'tabler-circle-check', color: 'success', count: stats.value.clientes_al_dia },
])

const printReporte = async () => {
  // Si la página actual ya contiene todo, se imprime sin esperar: así el navegador
  // no bloquea la ventana emergente por haber pasado tiempo desde el clic.
  let lista: CarteraCliente[] = carteraClientes.value
  if (totalClientes.value > carteraClientes.value.length) {
    isPrinting.value = true
    try {
      lista = await carteraStore.fetchCarteraCompleta(filtros.value, ordenActual.value)
    }
    catch (e: any) {
      snackbar.value = { show: true, message: e.message || 'Error al preparar el informe', color: 'error' }

      return
    }
    finally {
      isPrinting.value = false
    }
  }

  const filtrosTexto = [
    etiquetaEstado[estadoFiltro.value],
    busquedaAplicada.value ? `Búsqueda: "${busquedaAplicada.value}"` : '',
  ].filter(Boolean).join(' · ')

  const filas = lista.map((c, i) => `
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

  imprimirHtml({
    titulo: `Cartera ${negocio.nombreComercial}`,
    ancho: 1000,
    alto: 750,
    estilos: `
      body{font-family:Arial,sans-serif;font-size:12px;padding:20px;color:#111}
      h1{color:var(--doc-primario-oscuro);margin:0;font-size:20px} .sub{color:#666;font-size:12px;margin-bottom:16px}
      .cards{display:flex;gap:12px;margin-bottom:20px}
      .card{flex:1;border:1px solid #ddd;border-radius:6px;padding:10px 14px;text-align:center}
      .card .lbl{font-size:10px;text-transform:uppercase;color:#666;font-weight:700}
      .card .val{font-size:16px;font-weight:bold;margin-top:4px}
      table{width:100%;border-collapse:collapse}
      th{background:#1e1b16;color:var(--doc-primario-claro);padding:7px 9px;font-size:10px;text-transform:uppercase}
      td{padding:7px 9px;border-bottom:1px solid #eee;font-size:11px}
      tr:nth-child(even){background:#fafafa}
      .foot{margin-top:20px;border-top:1px solid #ddd;padding-top:8px;display:flex;justify-content:space-between;font-size:10px;color:#888}
    `,
    cuerpo: `
    <div style="display:flex;justify-content:space-between;border-bottom:2px solid var(--doc-primario-oscuro);padding-bottom:12px;margin-bottom:16px">
      <div><h1>${negocio.nombreMayusculas}</h1><div class="sub">Informe de Cartera — ${rangoTexto.value}<br>${filtrosTexto}</div></div>
      <div style="text-align:right;font-size:11px;color:#444">
        <div>Impreso: ${formatNowDateTime()}</div>
        <div>Clientes: ${lista.length}</div>
      </div>
    </div>
    <div class="cards">
      <div class="card"><div class="lbl">Total Facturado</div><div class="val" style="color:var(--doc-primario-oscuro)">${formatCurrency(stats.value.total_facturado)}</div></div>
      <div class="card"><div class="lbl">Total Recaudado</div><div class="val" style="color:#2e7d32">${formatCurrency(stats.value.total_recaudado)}</div></div>
      <div class="card"><div class="lbl">Efectivo</div><div class="val" style="color:#1565c0">${formatCurrency(stats.value.total_efectivo)}</div></div>
      <div class="card"><div class="lbl">Transferencia</div><div class="val" style="color:#7b1fa2">${formatCurrency(stats.value.total_transferencia)}</div></div>
      <div class="card"><div class="lbl">Saldo Pendiente</div><div class="val" style="color:#c62828">${formatCurrency(stats.value.total_pendiente)}</div></div>
    </div>
    <table><thead><tr><th>#</th><th>Cliente</th><th>Pedidos</th><th>Facturado</th><th>Abonado</th><th>Efectivo</th><th>Transferencia</th><th>Saldo</th></tr></thead>
    <tbody>${filas || '<tr><td colspan="8" style="text-align:center;color:#888;padding:16px">Sin registros</td></tr>'}</tbody></table>
    <div class="foot"><div>${negocio.nombreComercial} — Informe de Cartera</div><div>Generado automáticamente</div></div>`,
  })
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

    const fechaEmisionActual = formatFechaLarga(new Date())

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
              <div class="brand-logo-text">${negocio.nombreMayusculas}</div>
              <div class="company-details text-xs">
                <strong class="company-name text-body-2 font-weight-bold d-block">${negocio.razonSocial.toUpperCase()}</strong>
                ${negocio.config.nit ? `<span>NIT: ${negocio.config.nit}</span><br>` : ''}
                ${negocio.config.eslogan ? `<span>${negocio.config.eslogan}</span><br>` : ''}
                ${negocio.config.direccion ? `<span>${negocio.config.direccion}</span><br>` : ''}
                ${negocio.ubicacion ? `<span>${negocio.ubicacion}</span><br>` : ''}
                ${negocio.lineaContacto ? `<span>Contacto: ${negocio.lineaContacto}</span>` : ''}
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
                Cliente de Cartera — ${negocio.nombreComercial}
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
              ${condicionesCarteraHtml()}
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
              <div class="signature-label text-xs font-weight-bold mt-1">REPRESENTANTE ${negocio.nombreMayusculas}</div>
              <div class="signature-sub text-xs">Control de Cartera & Ventas</div>
            </div>
          </div>
        </div>
        <div class="page-break"></div>
      `
    }).join('')

    imprimirHtml({
      titulo: `Estado de Cuenta & Facturas - ${cliente.nombre} ${cliente.apellido}`,
      ancho: 900,
      alto: 950,
      estilos: `
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #111; padding: 24px; }
          
          .page-break { page-break-after: always; break-after: page; }
          
          /* ── PÁGINA 1: PORTADA EXCLUSIVA ── */
          .cover-page {
            min-height: 90vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            border: 3px double var(--doc-primario-oscuro);
            border-radius: 12px;
            padding: 32px;
            background: #fffcf7;
          }
          .cover-header { text-align: center; border-bottom: 2px solid var(--doc-primario-oscuro); padding-bottom: 20px; margin-bottom: 24px; }
          .cover-brand { font-size: 28px; font-weight: 900; color: var(--doc-primario-oscuro); letter-spacing: 2px; }
          .cover-subbrand { font-size: 13px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; font-weight: 600; }
          .cover-title { font-size: 18px; font-weight: 800; color: #1e1b16; margin-top: 16px; letter-spacing: 0.5px; }

          .cover-client-box { background: #ffffff; border: 1px solid #e0d4be; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
          .cover-client-label { font-size: 10px; text-transform: uppercase; color: var(--doc-primario-oscuro); font-weight: 800; letter-spacing: 0.5px; }
          .cover-client-name { font-size: 22px; font-weight: 800; color: #111; margin-top: 2px; }
          .cover-meta { display: flex; justify-content: space-between; margin-top: 12px; font-size: 12px; color: #555; border-top: 1px dashed #eee; padding-top: 8px; }

          .cover-stats-grid { display: flex; gap: 14px; margin-bottom: 28px; }
          .cover-stat-card { flex: 1; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px; text-align: center; }
          .cover-stat-card.main-debt { border: 2px solid #ef9a9a; background: #ffebee; }
          .cover-stat-label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #666; }
          .cover-stat-card.main-debt .cover-stat-label { color: #c62828; }
          .cover-stat-val { font-size: 18px; font-weight: 800; margin-top: 4px; color: #111; }
          .cover-stat-card.main-debt .cover-stat-val { color: #c62828; font-size: 22px; }

          .cover-table-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: var(--doc-primario-oscuro); margin-bottom: 8px; letter-spacing: 0.5px; }
          .cover-table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden; }
          .cover-table th { background: #1e1b16; color: var(--doc-primario-claro); padding: 8px 12px; font-size: 11px; text-transform: uppercase; text-align: left; }
          .cover-table td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 12px; }

          .cover-footer { text-align: center; border-top: 1px solid #e0d4be; padding-top: 12px; font-size: 11px; color: #777; }

          /* ── PÁGINAS 2+: FACTURAS COMPLEMENTARIAS ── */
          .invoice-page { padding: 10px 0; }
          .brand-logo-text { font-size: 22px; font-weight: 900; color: var(--doc-primario-oscuro); letter-spacing: 1px; margin-bottom: 4px; }
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
          .invoice-title { color: var(--doc-primario-oscuro); }
          .invoice-number { color: #111; }
          .invoice-subtext { color: #555; }
          .invoice-subtext strong { color: #111; }
          hr.invoice-divider { border: 0; border-top: 2px solid var(--doc-primario-oscuro); opacity: 0.9; }
          .invoice-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .info-box { background: #fdfbf7; border: 1px solid #e5dac4; color: #111; }
          .info-box__title { color: var(--doc-primario-oscuro); }
          .info-box__main { color: #111; }
          .info-box__sub { color: #444; }
          .info-box__highlight { color: var(--doc-primario-oscuro); }
          .section-title { color: #555; letter-spacing: 0.5px; }
          .text-sub { color: #555; }
          .item-title { color: #111; }
          .item-desc { color: #444; }
          .item-price { color: #111; }
          .sub-row-label { color: #555; }
          .sub-row-val { color: #222; }
          table.invoice-table { border-collapse: collapse; width: 100%; }
          .invoice-table th { background: #1e1b16; color: var(--doc-primario-claro); padding: 8px 10px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px; border-bottom: 2px solid var(--doc-primario-oscuro); }
          .invoice-table td { padding: 8px 10px; border-bottom: 1px solid #e0e0e0; color: #111; }
          .invoice-table .sub-row td { background: #f8f8f8; padding: 6px 10px; }
          .invoice-table--abonos th { background: #2b2b2b; color: #fff; border-bottom: 2px solid #666; }
          .badge-gold-color { background: rgba(var(--doc-primario-rgb),0.2); color: var(--doc-primario-oscuro); border: 1px solid rgba(var(--doc-primario-rgb),0.4); padding: 3px 8px; border-radius: 4px; }
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
      `,
      cuerpo: `
        <!-- ── PÁGINA 1: PORTADA EXCLUSIVA ── -->
        <div class="cover-page">
          <div>
            <div class="cover-header">
              <div class="cover-brand">${negocio.nombreMayusculas}</div>
              <div class="cover-subbrand">${[negocio.config.eslogan, negocio.ubicacion].filter(Boolean).join(' — ')}</div>
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
                <div class="cover-stat-val" style="color: var(--doc-primario-oscuro);">${formatCurrency(totalFacturadoAdeudado)}</div>
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
                    <td style="font-weight: 700; color: var(--doc-primario-oscuro);">${p.referencia}</td>
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
            ${[negocio.razonSocial, negocio.config.nit ? `NIT: ${negocio.config.nit}` : '', 'Documento Oficial de Control de Cartera'].filter(Boolean).join(' — ')}
          </div>
        </div>

        <div class="page-break"></div>

        <!-- ── PÁGINAS 2+: FACTURAS ADJUNTAS ── -->
        ${facturasPagesHtml}
      `,
    })
  } catch (error: any) {
    console.error('Error al generar reporte de cliente:', error)
    snackbar.value = { show: true, message: error.message || 'Error al generar reporte', color: 'error' }
  } finally {
    isGeneratingReport.value[cliente.cliente_id] = false
  }
}

watch(filtros, () => {
  loadStats()
  irPrimeraPaginaYCargar()
})

watch(estadoFiltro, irPrimeraPaginaYCargar)

watch([page, itemsPerPage, sortBy], loadCartera, { deep: true })

onMounted(loadAll)
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
      <div class="d-flex align-center gap-2">
        <VBtn
          variant="tonal"
          color="primary"
          prepend-icon="tabler-refresh"
          :loading="isLoadingStats || isLoadingClientes"
          @click="loadAll"
        >
          Actualizar
        </VBtn>
        <VBtn
          color="secondary"
          variant="tonal"
          prepend-icon="tabler-printer"
          :loading="isPrinting"
          @click="printReporte"
        >
          Imprimir / PDF
        </VBtn>
      </div>
    </div>

    <!-- ── Filtros ─────────────────────────────── -->
    <VCard class="mb-6" elevation="1">
      <VCardText class="d-flex flex-column gap-4">
        <div class="d-flex align-center flex-wrap gap-2">
          <span class="text-body-2 text-disabled me-1">Período:</span>
          <VChip
            v-for="p in periodos"
            :key="p.value"
            :color="periodo === p.value ? 'primary' : undefined"
            :variant="periodo === p.value ? 'flat' : 'outlined'"
            size="small"
            @click="aplicarPeriodo(p.value)"
          >
            {{ p.title }}
          </VChip>
          <VChip
            v-if="periodo === 'personalizado'"
            color="primary"
            variant="flat"
            size="small"
            prepend-icon="tabler-calendar"
          >
            Personalizado
          </VChip>
        </div>

        <VRow dense align="center">
          <VCol cols="12" sm="6" md="3">
            <AppDateTimePicker
              v-model="fechaInicio"
              label="Desde"
              placeholder="Fecha inicio"
              density="compact"
              clearable
              :config="{ dateFormat: 'Y-m-d' }"
            />
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <AppDateTimePicker
              v-model="fechaFin"
              label="Hasta"
              placeholder="Fecha fin"
              density="compact"
              clearable
              :config="{ dateFormat: 'Y-m-d' }"
            />
          </VCol>
          <VCol cols="12" md="6">
            <AppTextField
              v-model="busqueda"
              label="Cliente"
              placeholder="Buscar cliente por nombre o apellido…"
              prepend-inner-icon="tabler-search"
              density="compact"
              clearable
            />
          </VCol>
        </VRow>

        <div v-if="hayFiltros" class="d-flex justify-end">
          <VBtn
            variant="text"
            size="small"
            color="secondary"
            prepend-icon="tabler-filter-off"
            @click="limpiarFiltros"
          >
            Limpiar filtros
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <!-- ── KPIs ───────────────────────────────── -->
    <VRow class="mb-6">
      <!-- Por cobrar (principal) -->
      <VCol cols="12" sm="6" lg="3">
        <VCard elevation="2" class="h-100 kpi-card kpi-card--destacada">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-uppercase font-weight-bold text-disabled">Por cobrar</span>
              <VAvatar color="error" variant="tonal" size="36" rounded="lg">
                <VIcon icon="tabler-alert-circle" size="20" />
              </VAvatar>
            </div>
            <VSkeletonLoader v-if="isLoadingStats" type="heading" class="kpi-skeleton" />
            <h4 v-else class="text-h4 font-weight-bold text-error">
              {{ formatCurrency(stats.total_pendiente) }}
            </h4>
            <div class="text-xs text-disabled mt-1">
              {{ stats.pedidos_con_saldo }} pedido(s) con saldo
            </div>
            <div class="mt-3">
              <div class="d-flex justify-space-between text-xs mb-1">
                <span class="text-disabled">Recaudado del facturado</span>
                <span class="font-weight-bold" :class="`text-${colorProgreso(porcentajeRecaudado)}`">{{ porcentajeRecaudado }}%</span>
              </div>
              <VProgressLinear
                :model-value="porcentajeRecaudado"
                :color="colorProgreso(porcentajeRecaudado)"
                rounded
                height="6"
              />
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Facturado -->
      <VCol cols="12" sm="6" lg="3">
        <VCard elevation="2" class="h-100 kpi-card">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-uppercase font-weight-bold text-disabled">Facturado</span>
              <VAvatar color="warning" variant="tonal" size="36" rounded="lg">
                <VIcon icon="tabler-file-invoice" size="20" />
              </VAvatar>
            </div>
            <VSkeletonLoader v-if="isLoadingStats" type="heading" class="kpi-skeleton" />
            <h4 v-else class="text-h4 font-weight-bold text-warning">
              {{ formatCurrency(stats.total_facturado) }}
            </h4>
            <div class="text-xs text-disabled mt-1">
              {{ stats.total_pedidos }} pedido(s) entregado(s) · {{ rangoTexto }}
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Recaudado (efectivo / transferencia) -->
      <VCol cols="12" sm="6" lg="3">
        <VCard elevation="2" class="h-100 kpi-card">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-uppercase font-weight-bold text-disabled">Recaudado</span>
              <VAvatar color="success" variant="tonal" size="36" rounded="lg">
                <VIcon icon="tabler-circle-check" size="20" />
              </VAvatar>
            </div>
            <VSkeletonLoader v-if="isLoadingStats" type="heading" class="kpi-skeleton" />
            <h4 v-else class="text-h4 font-weight-bold text-success">
              {{ formatCurrency(stats.total_recaudado) }}
            </h4>
            <div class="split-bar mt-3" :title="`Efectivo ${porcentajeEfectivo}% · Transferencia ${100 - porcentajeEfectivo}%`">
              <div class="split-bar__efectivo" :style="{ inlineSize: `${stats.total_recaudado ? porcentajeEfectivo : 0}%` }" />
              <div class="split-bar__transferencia" :style="{ inlineSize: `${stats.total_recaudado ? 100 - porcentajeEfectivo : 0}%` }" />
            </div>
            <div class="d-flex justify-space-between text-xs mt-2 gap-2">
              <span class="d-flex align-center gap-1">
                <span class="dot dot--info" />
                <span class="text-disabled">Efectivo</span>
                <strong class="text-info">{{ formatCurrency(stats.total_efectivo) }}</strong>
              </span>
              <span class="d-flex align-center gap-1">
                <span class="dot dot--secondary" />
                <span class="text-disabled">Transf.</span>
                <strong class="text-secondary">{{ formatCurrency(stats.total_transferencia) }}</strong>
              </span>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Clientes con saldo -->
      <VCol cols="12" sm="6" lg="3">
        <VCard elevation="2" class="h-100 kpi-card">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-uppercase font-weight-bold text-disabled">Clientes con saldo</span>
              <VAvatar color="primary" variant="tonal" size="36" rounded="lg">
                <VIcon icon="tabler-users" size="20" />
              </VAvatar>
            </div>
            <VSkeletonLoader v-if="isLoadingStats" type="heading" class="kpi-skeleton" />
            <h4 v-else class="text-h4 font-weight-bold text-primary">
              {{ stats.clientes_con_saldo }}
              <span class="text-body-1 text-disabled">/ {{ stats.total_clientes }}</span>
            </h4>
            <div class="text-xs text-disabled mt-1">
              {{ stats.clientes_al_dia }} cliente(s) al día
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- ── Tabla por cliente ───────────────────── -->
    <VCard elevation="2">
      <VCardText class="d-flex align-center justify-space-between flex-wrap gap-3">
        <div class="d-flex align-center gap-2">
          <VIcon icon="tabler-users" size="20" color="primary" />
          <span class="text-h6 font-weight-bold">Cartera por Cliente</span>
        </div>

        <div class="d-flex align-center flex-wrap gap-3">
          <div
            class="estado-segmentos"
            role="radiogroup"
            aria-label="Filtrar por estado"
          >
            <VBtn
              v-for="op in opcionesEstado"
              :key="op.value"
              role="radio"
              :aria-checked="estadoFiltro === op.value"
              :variant="estadoFiltro === op.value ? 'flat' : 'text'"
              :color="estadoFiltro === op.value ? 'primary' : undefined"
              size="small"
              class="estado-segmento"
              @click="estadoFiltro = op.value"
            >
              <VIcon
                :icon="op.icon"
                size="16"
                start
              />
              {{ op.title }}
              <span
                class="estado-contador"
                :class="estadoFiltro === op.value ? 'estado-contador--activo' : `text-${op.color}`"
              >
                {{ op.count }}
              </span>
            </VBtn>
          </div>

          <div class="d-flex align-center gap-2">
            <span class="text-body-2 text-disabled">Mostrar</span>
            <AppSelect
              :model-value="itemsPerPage"
              :items="[10, 25, 50, 100]"
              density="compact"
              style="inline-size: 5.5rem;"
              @update:model-value="itemsPerPage = Number($event)"
            />
          </div>
        </div>
      </VCardText>

      <VDivider />

      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        v-model:sort-by="sortBy"
        :items="carteraClientes"
        :items-length="totalClientes"
        :headers="headers"
        :loading="isLoadingClientes"
        item-value="cliente_id"
        must-sort
        hover
        class="text-no-wrap cartera-table"
        @click:row="(_e: Event, { item }: { item: CarteraCliente }) => openDetalle(item)"
      >
        <!-- Cliente -->
        <template #item.cliente="{ item }">
          <div class="d-flex align-center gap-3 py-2">
            <VAvatar
              :color="item.saldo_pendiente > 0 ? 'error' : 'success'"
              variant="tonal"
              size="38"
              rounded="lg"
            >
              <span class="text-body-2 font-weight-bold">{{ iniciales(item) }}</span>
            </VAvatar>
            <div class="d-flex flex-column">
              <span class="font-weight-bold text-high-emphasis">{{ item.nombre }} {{ item.apellido }}</span>
              <span v-if="item.saldo_pendiente > 0" class="text-xs text-error">
                {{ item.pedidos_con_saldo }} pedido(s) con saldo
              </span>
              <span v-else-if="item.saldo_pendiente < 0" class="text-xs text-info">Saldo a favor</span>
              <span v-else class="text-xs text-success">Al día</span>
            </div>
          </div>
        </template>

        <!-- Pedidos -->
        <template #item.pedidos_count="{ item }">
          <VChip size="small" color="primary" variant="tonal">
            {{ item.pedidos_count }}
          </VChip>
        </template>

        <!-- Facturado -->
        <template #item.total_pedidos="{ item }">
          <span class="font-weight-medium">{{ formatCurrency(item.total_pedidos) }}</span>
        </template>

        <!-- Recaudado -->
        <template #item.total_abonado="{ item }">
          <div class="d-flex flex-column align-end">
            <span class="font-weight-medium text-success">{{ formatCurrency(item.total_abonado) }}</span>
            <span class="text-xs text-disabled">
              Ef. {{ formatCurrency(item.total_efectivo) }} · Tr. {{ formatCurrency(item.total_transferencia) }}
            </span>
          </div>
        </template>

        <!-- Por cobrar -->
        <template #item.saldo_pendiente="{ item }">
          <span
            class="font-weight-bold"
            :class="item.saldo_pendiente > 0 ? 'text-error' : item.saldo_pendiente < 0 ? 'text-info' : 'text-success'"
          >
            {{ formatCurrency(item.saldo_pendiente) }}
          </span>
        </template>

        <!-- Progreso de cobro -->
        <template #item.porcentaje_cobrado="{ item }">
          <div class="d-flex align-center gap-2">
            <VProgressLinear
              :model-value="item.porcentaje_cobrado"
              :color="colorProgreso(item.porcentaje_cobrado)"
              rounded
              height="6"
              class="flex-grow-1"
            />
            <span class="text-xs font-weight-bold progreso-pct" :class="`text-${colorProgreso(item.porcentaje_cobrado)}`">
              {{ item.porcentaje_cobrado }}%
            </span>
          </div>
        </template>

        <!-- Acciones -->
        <template #item.acciones="{ item }">
          <div class="d-flex justify-center gap-1" @click.stop>
            <IconBtn
              color="secondary"
              :loading="isGeneratingReport[item.cliente_id]"
              @click="generarReporteClientePdf(item)"
            >
              <VIcon icon="tabler-file-download" />
              <VTooltip activator="parent" location="top">
                Estado de cuenta PDF
              </VTooltip>
            </IconBtn>
            <IconBtn color="primary" @click="openDetalle(item)">
              <VIcon icon="tabler-eye" />
              <VTooltip activator="parent" location="top">
                Ver detalle
              </VTooltip>
            </IconBtn>
          </div>
        </template>

        <!-- Sin resultados -->
        <template #no-data>
          <div class="py-12 text-center">
            <VIcon icon="tabler-report-off" size="56" class="mb-3 text-disabled" />
            <p class="text-body-1 text-disabled mb-2">
              {{ hayFiltros ? 'Ningún cliente coincide con los filtros aplicados' : 'No hay pedidos entregados en el período seleccionado' }}
            </p>
            <VBtn
              v-if="hayFiltros"
              variant="tonal"
              size="small"
              prepend-icon="tabler-filter-off"
              @click="limpiarFiltros"
            >
              Limpiar filtros
            </VBtn>
          </div>
        </template>

        <!-- Paginación -->
        <template #bottom>
          <VDivider />
          <TablePagination
            v-model:page="page"
            :items-per-page="itemsPerPage"
            :total-items="totalClientes"
          />
        </template>
      </VDataTableServer>
    </VCard>

    <!-- ── Dialog Detalle Cliente ─────────────── -->
    <VDialog
      v-model="detalleDialogOpen"
      max-width="920"
      scrollable
      :fullscreen="xs"
    >
      <VCard v-if="clienteSeleccionadoInfo">
        <VCardItem class="pa-4">
          <template #prepend>
            <VAvatar
              :color="clienteSeleccionadoInfo.saldo_pendiente > 0 ? 'error' : 'success'"
              variant="tonal"
              size="42"
              rounded="lg"
            >
              <span class="font-weight-bold">{{ iniciales(clienteSeleccionadoInfo) }}</span>
            </VAvatar>
          </template>
          <VCardTitle>
            {{ clienteSeleccionadoInfo.nombre }} {{ clienteSeleccionadoInfo.apellido }}
          </VCardTitle>
          <VCardSubtitle>
            {{ clienteSeleccionadoInfo.pedidos_count }} pedido(s) entregado(s) · {{ rangoTexto }}
          </VCardSubtitle>
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

        <VCardText class="pa-4">
          <!-- Resumen del cliente -->
          <div class="resumen-grid mb-4">
            <div class="resumen-box">
              <span class="resumen-label">Facturado</span>
              <span class="resumen-val text-warning">{{ formatCurrency(clienteSeleccionadoInfo.total_pedidos) }}</span>
            </div>
            <div class="resumen-box">
              <span class="resumen-label">Abonado</span>
              <span class="resumen-val text-success">{{ formatCurrency(clienteSeleccionadoInfo.total_abonado) }}</span>
            </div>
            <div class="resumen-box">
              <span class="resumen-label">Efectivo</span>
              <span class="resumen-val text-info">{{ formatCurrency(clienteSeleccionadoInfo.total_efectivo) }}</span>
            </div>
            <div class="resumen-box">
              <span class="resumen-label">Transferencia</span>
              <span class="resumen-val text-secondary">{{ formatCurrency(clienteSeleccionadoInfo.total_transferencia) }}</span>
            </div>
            <div class="resumen-box" :class="clienteSeleccionadoInfo.saldo_pendiente > 0 ? 'resumen-box--error' : 'resumen-box--success'">
              <span class="resumen-label">Saldo pendiente</span>
              <span
                class="resumen-val font-weight-bold"
                :class="clienteSeleccionadoInfo.saldo_pendiente > 0 ? 'text-error' : 'text-success'"
              >
                {{ formatCurrency(clienteSeleccionadoInfo.saldo_pendiente) }}
              </span>
            </div>
          </div>

          <div class="d-flex justify-space-between text-xs mb-1">
            <span class="text-disabled">Progreso de cobro</span>
            <span class="font-weight-bold" :class="`text-${colorProgreso(clienteSeleccionadoInfo.porcentaje_cobrado)}`">
              {{ clienteSeleccionadoInfo.porcentaje_cobrado }}%
            </span>
          </div>
          <VProgressLinear
            :model-value="clienteSeleccionadoInfo.porcentaje_cobrado"
            :color="colorProgreso(clienteSeleccionadoInfo.porcentaje_cobrado)"
            rounded
            height="8"
            class="mb-5"
          />

          <!-- Pedidos del cliente -->
          <div class="d-flex align-center justify-space-between flex-wrap gap-2 mb-2">
            <span class="text-subtitle-1 font-weight-bold">Pedidos entregados</span>
            <VSwitch
              v-model="soloConSaldoDetalle"
              label="Solo con saldo"
              color="error"
              density="compact"
              hide-details
              inset
            />
          </div>

          <div v-if="isLoadingDetalle" class="text-center py-6">
            <VProgressCircular indeterminate color="primary" />
          </div>

          <div v-else-if="detalleFiltrado.length === 0" class="text-center py-6 text-disabled">
            {{ soloConSaldoDetalle ? 'Este cliente no tiene pedidos con saldo en el período' : 'Sin pedidos entregados en el período' }}
          </div>

          <VTable v-else density="compact" class="text-no-wrap detalle-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Entregado</th>
                <th class="text-end">
                  Total
                </th>
                <th class="text-end">
                  Abonado
                </th>
                <th class="text-end">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pedido in detalleFiltrado" :key="pedido.id">
                <td>
                  <div class="d-flex flex-column py-1">
                    <span class="font-weight-bold text-primary">{{ pedido.referencia }}</span>
                    <span class="text-xs text-disabled text-truncate detalle-titulo">{{ pedido.titulo }}</span>
                  </div>
                </td>
                <td>{{ formatDate(pedido.fecha_entregado) }}</td>
                <td class="text-end">
                  {{ formatCurrency(pedido.total_pedido) }}
                </td>
                <td class="text-end">
                  <div class="d-flex flex-column align-end">
                    <span class="text-success">{{ formatCurrency(pedido.total_abonado) }}</span>
                    <span v-if="pedido.total_abonado" class="text-xs text-disabled">
                      Ef. {{ formatCurrency(pedido.total_efectivo) }} · Tr. {{ formatCurrency(pedido.total_transferencia) }}
                    </span>
                  </div>
                </td>
                <td class="text-end">
                  <VChip
                    size="small"
                    :color="pedido.saldo_pendiente <= 0 ? 'success' : 'error'"
                    variant="tonal"
                  >
                    {{ pedido.saldo_pendiente <= 0 ? 'Pagado' : formatCurrency(pedido.saldo_pendiente) }}
                  </VChip>
                </td>
              </tr>
            </tbody>
          </VTable>
        </VCardText>
      </VCard>
    </VDialog>

    <VSnackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </VSnackbar>
  </section>
</template>

<style scoped>
/* ── KPIs ── */
.kpi-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}

.kpi-card--destacada {
  border-inline-start: 4px solid rgb(var(--v-theme-error)) !important;
}

.kpi-skeleton {
  background: transparent;
  max-inline-size: 180px;
}

/* ── Filtro de estado (control segmentado) ── */
.estado-segmentos {
  display: inline-flex;
  flex-wrap: wrap;
  padding: 4px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.03);
  gap: 4px;
}

.estado-segmento {
  border-radius: 7px !important;
  letter-spacing: normal;
  text-transform: none;
}

.estado-segmento:not(.v-btn--variant-flat) {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.estado-contador {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding-inline: 6px;
  margin-inline-start: 8px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  block-size: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  min-inline-size: 22px;
}

.estado-contador--activo {
  background: rgba(var(--v-theme-on-primary), 0.22);
  color: rgb(var(--v-theme-on-primary));
}

@media (max-width: 599px) {
  .estado-segmentos {
    display: flex;
    inline-size: 100%;
  }

  .estado-segmento {
    flex: 1 1 0;
    padding-inline: 6px !important;
  }
}

.split-bar {
  display: flex;
  overflow: hidden;
  border-radius: 4px;
  background: rgba(var(--v-border-color), 0.2);
  block-size: 6px;
}

.split-bar__efectivo {
  background: rgb(var(--v-theme-info));
  transition: inline-size 0.3s ease;
}

.split-bar__transferencia {
  background: rgb(var(--v-theme-secondary));
  transition: inline-size 0.3s ease;
}

.dot {
  display: inline-block;
  border-radius: 50%;
  block-size: 8px;
  inline-size: 8px;
}

.dot--info { background: rgb(var(--v-theme-info)); }
.dot--secondary { background: rgb(var(--v-theme-secondary)); }

/* ── Tabla ── */
.cartera-table :deep(tbody tr) {
  cursor: pointer;
}

.progreso-pct {
  min-inline-size: 2.5rem;
  text-align: end;
}

/* ── Dialog detalle ── */
.resumen-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.resumen-box {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  padding-block: 10px;
  padding-inline: 14px;
  text-align: center;
}

.resumen-box--error {
  border-color: rgba(var(--v-theme-error), 0.5);
  background: rgba(var(--v-theme-error), 0.06);
}

.resumen-box--success {
  border-color: rgba(var(--v-theme-success), 0.5);
  background: rgba(var(--v-theme-success), 0.06);
}

.resumen-label {
  display: block;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.7rem;
  font-weight: 600;
  margin-block-end: 4px;
  text-transform: uppercase;
}

.resumen-val {
  display: block;
  font-size: 1rem;
  font-weight: 700;
}

.detalle-titulo {
  max-inline-size: 260px;
}
</style>

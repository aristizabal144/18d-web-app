<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { ARREGLO_RESUMEN_VACIO, DIAS_VENCIMIENTO_ARREGLO, toLocalDateStr, useArreglosStore } from '@/views/apps/arreglos/useArreglosStore'
import type { Arreglo, ArregloDeudor, ArregloPayload, ArregloResumen, ClienteArreglo, DatosPago, EstadoArreglo } from '@/views/apps/arreglos/useArreglosStore'
import { agruparPorCliente, nombreCliente, useCuentaCobroArreglos } from '@/views/apps/arreglos/useCuentaCobroArreglos'
import ArreglosResumenCards from '@/views/apps/arreglos/ArreglosResumenCards.vue'
import ArregloFormDialog from '@/views/apps/arreglos/ArregloFormDialog.vue'
import ArregloPagoDialog from '@/views/apps/arreglos/ArregloPagoDialog.vue'
import { useNegocioStore } from '@/views/apps/configuracion/useNegocioStore'

type FiltroEstado = 'todos' | EstadoArreglo

const arreglosStore = useArreglosStore()
const negocio = useNegocioStore()
const { formatCurrency, formatDateNumeric: formatDate, formatNowDateTime } = useFormato()
const { imprimirHtml } = usePrintDocument()
const { imprimirCuentaCobro, urlWhatsapp } = useCuentaCobroArreglos()

const tab = ref<'arreglos' | 'cobros'>('arreglos')

// 👉 Filtros
const busqueda = ref('')
const busquedaAplicada = ref('')
const fechaInicio = ref<string | null>(null)
const fechaFin = ref<string | null>(null)
const selectedClienteId = ref<string | null>(null)
const estadoFiltro = ref<FiltroEstado>('todos')

watchDebounced(busqueda, val => {
  busquedaAplicada.value = (val || '').trim()
}, { debounce: 350 })

const hayFiltros = computed(() => !!(busqueda.value || fechaInicio.value || fechaFin.value || selectedClienteId.value || estadoFiltro.value !== 'todos'))

const limpiarFiltros = () => {
  busqueda.value = ''
  busquedaAplicada.value = ''
  fechaInicio.value = null
  fechaFin.value = null
  selectedClienteId.value = null
  estadoFiltro.value = 'todos'
}

// 👉 Tabla
const itemsPerPage = ref(25)
const page = ref(1)
const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([{ key: 'fecha', order: 'desc' }])
const totalArreglosCount = ref(0)
const arreglosList = ref<Arreglo[]>([])
const isLoading = ref(false)
const seleccion = ref<Arreglo[]>([])

const headers = [
  { title: 'Fecha', key: 'fecha', width: '120px' },
  { title: 'Cliente', key: 'cliente', sortable: false },
  { title: 'Descripción', key: 'descripcion' },
  { title: 'Cant.', key: 'cantidad', width: '90px', align: 'center' as const },
  { title: 'Valor', key: 'valor', width: '140px', align: 'end' as const },
  { title: 'Estado', key: 'estado', width: '170px' },
  { title: '', key: 'actions', width: '130px', sortable: false, align: 'end' as const },
]

// 👉 Resumen, deudores y clientes
const resumen = ref<ArregloResumen>({ ...ARREGLO_RESUMEN_VACIO })
const isResumenLoading = ref(false)
const deudores = ref<ArregloDeudor[]>([])
const isDeudoresLoading = ref(false)
const busquedaDeudor = ref('')
const clientes = ref<ClienteArreglo[]>([])

const itemsClientes = computed(() => clientes.value.map(c => ({ value: c.id, title: `${c.nombre} ${c.apellido}` })))

const opcionesEstado = computed(() => [
  { value: 'todos' as const, title: 'Todos', icon: 'tabler-list', color: 'medium-emphasis', count: resumen.value.cantidad_total },
  { value: 'pendiente' as const, title: 'Pendientes', icon: 'tabler-clock', color: 'warning', count: resumen.value.cantidad_pendientes },
  { value: 'cancelado' as const, title: 'Cancelados', icon: 'tabler-circle-check', color: 'success', count: resumen.value.cantidad_cancelados },
])

const deudorActual = computed(() => deudores.value.find(d => d.cliente_id === selectedClienteId.value) || null)
const clienteActualNombre = computed(() => itemsClientes.value.find(c => c.value === selectedClienteId.value)?.title || 'Este cliente')

const deudoresFiltrados = computed(() => {
  const q = busquedaDeudor.value.trim().toLowerCase()
  if (!q)
    return deudores.value

  return deudores.value.filter(d => `${d.nombre || ''} ${d.apellido || ''} ${d.telefono || ''}`.toLowerCase().includes(q))
})

// 👉 Feedback
const snackbar = ref({ show: false, message: '', color: 'success' })

const avisar = (message: string, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

// 👉 Helpers de vista
const diasDesde = (fecha: string) => {
  const inicio = new Date(`${fecha.substring(0, 10)}T12:00:00`)

  return Math.max(0, Math.floor((Date.now() - inicio.getTime()) / 86_400_000))
}

const colorAntiguedad = (dias: number) => {
  if (dias > DIAS_VENCIMIENTO_ARREGLO)
    return 'error'
  if (dias > DIAS_VENCIMIENTO_ARREGLO / 2)
    return 'warning'

  return 'secondary'
}

const textoDias = (dias: number) => {
  if (dias === 0)
    return 'hoy'
  if (dias === 1)
    return 'hace 1 día'

  return `hace ${dias} días`
}

const iniciales = (nombre?: string | null, apellido?: string | null) =>
  `${(nombre || '?').charAt(0)}${(apellido || '').charAt(0)}`.toUpperCase()

// 👉 Carga de datos (los contadores descartan respuestas viejas)
let solicitudLista = 0

const fetchArreglos = async () => {
  const solicitud = ++solicitudLista

  isLoading.value = true
  try {
    const { arreglos, totalArreglos } = await arreglosStore.fetchArreglos({
      q: busquedaAplicada.value,
      fechaInicio: fechaInicio.value,
      fechaFin: fechaFin.value,
      clienteId: selectedClienteId.value,
      estado: estadoFiltro.value === 'todos' ? null : estadoFiltro.value,
      options: {
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: sortBy.value,
      },
    })

    if (solicitud !== solicitudLista)
      return

    arreglosList.value = arreglos
    totalArreglosCount.value = totalArreglos
  }
  catch (error) {
    console.error('Error al cargar arreglos:', error)
    avisar('No se pudieron cargar los arreglos', 'error')
  }
  finally {
    if (solicitud === solicitudLista)
      isLoading.value = false
  }
}

const loadResumen = async () => {
  isResumenLoading.value = true
  try {
    resumen.value = await arreglosStore.fetchResumen()
  }
  catch (error) {
    console.error('Error al cargar resumen:', error)
  }
  finally {
    isResumenLoading.value = false
  }
}

const loadDeudores = async () => {
  isDeudoresLoading.value = true
  try {
    deudores.value = await arreglosStore.fetchDeudores()
  }
  catch (error) {
    console.error('Error al cargar deudores:', error)
  }
  finally {
    isDeudoresLoading.value = false
  }
}

const recargarTodo = () => {
  fetchArreglos()
  loadResumen()
  loadDeudores()
}

const irPrimeraPaginaYCargar = () => {
  seleccion.value = []
  if (page.value !== 1)
    page.value = 1
  else
    fetchArreglos()
}

watch([busquedaAplicada, fechaInicio, fechaFin, selectedClienteId, estadoFiltro], irPrimeraPaginaYCargar)
watch([page, itemsPerPage, sortBy], fetchArreglos, { deep: true })

onMounted(async () => {
  recargarTodo()
  clientes.value = await arreglosStore.fetchClientes()
})

// 👉 Accesos rápidos desde las tarjetas
const verPendientes = () => {
  tab.value = 'arreglos'
  limpiarFiltros()
  estadoFiltro.value = 'pendiente'
}

const verVencidos = () => {
  const limite = new Date()

  limite.setDate(limite.getDate() - DIAS_VENCIMIENTO_ARREGLO - 1)
  tab.value = 'arreglos'
  limpiarFiltros()
  estadoFiltro.value = 'pendiente'
  fechaFin.value = toLocalDateStr(limite)
}

const verCliente = (clienteId: string) => {
  tab.value = 'arreglos'
  limpiarFiltros()
  selectedClienteId.value = clienteId
  estadoFiltro.value = 'pendiente'
}

// 👉 Crear / Editar / Eliminar
const formDialogOpen = ref(false)
const editingArreglo = ref<Arreglo | null>(null)

const openCreateDialog = () => {
  editingArreglo.value = null
  formDialogOpen.value = true
}

const openEditDialog = (arreglo: Arreglo) => {
  editingArreglo.value = { ...arreglo }
  formDialogOpen.value = true
}

const onSubmitForm = async (payload: ArregloPayload) => {
  try {
    if (editingArreglo.value) {
      await arreglosStore.updateArreglo(editingArreglo.value.id, payload)
      avisar('Arreglo actualizado con éxito')
    }
    else {
      await arreglosStore.addArreglo(payload)
      avisar('Arreglo registrado con éxito')
    }
    recargarTodo()
  }
  catch (error: any) {
    console.error('Error al guardar arreglo:', error)
    avisar(error.message || 'Error al guardar', 'error')
  }
}

const deleteArreglo = async (arreglo: Arreglo) => {
  if (!confirm(`¿Eliminar el arreglo "${arreglo.descripcion}"? Esta acción no se puede deshacer.`))
    return

  try {
    await arreglosStore.deleteArreglo(arreglo.id)
    seleccion.value = seleccion.value.filter(a => a.id !== arreglo.id)
    avisar('Arreglo eliminado correctamente', 'info')
    recargarTodo()
  }
  catch (error: any) {
    console.error('Error al eliminar arreglo:', error)
    avisar('Error al eliminar', 'error')
  }
}

// 👉 Selección múltiple
const seleccionPendientes = computed(() => seleccion.value.filter(a => a.estado === 'pendiente'))
const seleccionCancelados = computed(() => seleccion.value.filter(a => a.estado === 'cancelado'))
const totalSeleccionPendiente = computed(() => seleccionPendientes.value.reduce((s, a) => s + Number(a.valor || 0), 0))
const totalSeleccion = computed(() => seleccion.value.reduce((s, a) => s + Number(a.valor || 0), 0))

// 👉 Registrar pago (uno, selección o todo un cliente)
interface ContextoPago {
  ids: string[]
  clienteId: string | null
  cantidad: number
  total: number
  descripcion: string
}

const pagoDialogOpen = ref(false)
const isPagando = ref(false)
const contextoPago = ref<ContextoPago>({ ids: [], clienteId: null, cantidad: 0, total: 0, descripcion: '' })

const abrirPagoUno = (arreglo: Arreglo) => {
  contextoPago.value = {
    ids: [arreglo.id],
    clienteId: null,
    cantidad: 1,
    total: Number(arreglo.valor),
    descripcion: arreglo.descripcion,
  }
  pagoDialogOpen.value = true
}

const abrirPagoSeleccion = () => {
  contextoPago.value = {
    ids: seleccionPendientes.value.map(a => a.id),
    clienteId: null,
    cantidad: seleccionPendientes.value.length,
    total: totalSeleccionPendiente.value,
    descripcion: `${seleccionPendientes.value.length} arreglo(s) seleccionados pasarán a cancelado`,
  }
  pagoDialogOpen.value = true
}

const abrirPagoCliente = (deudor: ArregloDeudor) => {
  contextoPago.value = {
    ids: [],
    clienteId: deudor.cliente_id,
    cantidad: deudor.cantidad,
    total: deudor.total,
    descripcion: `Todos los arreglos pendientes de ${deudor.nombre || ''} ${deudor.apellido || ''}`.trim(),
  }
  pagoDialogOpen.value = true
}

const confirmarPago = async (pago: DatosPago) => {
  isPagando.value = true
  try {
    const { ids, clienteId } = contextoPago.value

    const actualizados = clienteId
      ? await arreglosStore.cancelarTodoCliente(clienteId, pago)
      : await arreglosStore.marcarCancelados(ids, pago)

    seleccion.value = seleccion.value.filter(a => !ids.includes(a.id) && (!clienteId || a.cliente_id !== clienteId))
    pagoDialogOpen.value = false
    avisar(`${actualizados} arreglo(s) marcados como cancelados`)
    recargarTodo()
  }
  catch (error: any) {
    console.error('Error al registrar pago:', error)
    avisar(error.message || 'No se pudo registrar el pago', 'error')
  }
  finally {
    isPagando.value = false
  }
}

const revertirAPendiente = async (arreglos: Arreglo[]) => {
  const ids = arreglos.filter(a => a.estado === 'cancelado').map(a => a.id)
  if (!ids.length)
    return
  if (!confirm(`¿Devolver ${ids.length} arreglo(s) a pendiente? Se borrará la fecha y el medio de pago.`))
    return

  try {
    const actualizados = await arreglosStore.marcarPendientes(ids)

    seleccion.value = seleccion.value.filter(a => !ids.includes(a.id))
    avisar(`${actualizados} arreglo(s) devueltos a pendiente`, 'info')
    recargarTodo()
  }
  catch (error: any) {
    console.error('Error al revertir pago:', error)
    avisar(error.message || 'No se pudo revertir', 'error')
  }
}

// 👉 Cuenta de cobro y WhatsApp
const generandoCliente = ref<string | null>(null)

const imprimirSeleccion = () => {
  if (!seleccionPendientes.value.length)
    return

  const ordenados = [...seleccionPendientes.value].sort((a, b) => a.fecha.localeCompare(b.fecha))

  imprimirCuentaCobro(agruparPorCliente(ordenados))
  if (seleccionCancelados.value.length)
    avisar(`Se omitieron ${seleccionCancelados.value.length} arreglo(s) ya cancelados`, 'info')
}

const imprimirCliente = async (clienteId: string) => {
  generandoCliente.value = clienteId
  try {
    const pendientes = await arreglosStore.fetchPendientesCliente(clienteId)

    if (!pendientes.length) {
      avisar('Este cliente no tiene arreglos pendientes de pago', 'info')

      return
    }
    imprimirCuentaCobro(agruparPorCliente(pendientes))
  }
  catch (error: any) {
    console.error('Error al generar cuenta de cobro:', error)
    avisar(error.message || 'No se pudo generar la cuenta de cobro', 'error')
  }
  finally {
    generandoCliente.value = null
  }
}

const enviarWhatsapp = async (clienteId: string) => {
  // La ventana se abre antes de la consulta para que el navegador no la bloquee.
  const ventana = window.open('', '_blank')

  generandoCliente.value = clienteId
  try {
    const pendientes = await arreglosStore.fetchPendientesCliente(clienteId)

    if (!pendientes.length) {
      ventana?.close()
      avisar('Este cliente no tiene arreglos pendientes de pago', 'info')

      return
    }

    const url = urlWhatsapp(agruparPorCliente(pendientes)[0])

    if (ventana)
      ventana.location.href = url
    else
      window.open(url, '_blank')
  }
  catch (error: any) {
    ventana?.close()
    console.error('Error al preparar WhatsApp:', error)
    avisar(error.message || 'No se pudo preparar el mensaje', 'error')
  }
  finally {
    generandoCliente.value = null
  }
}

// 👉 Informe por rango de fechas
const reportDialogOpen = ref(false)
const reportFechaInicio = ref(toLocalDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
const reportFechaFin = ref(toLocalDateStr(new Date()))
const reportEstado = ref<EstadoArreglo | null>(null)
const reportArreglos = ref<Arreglo[]>([])
const isReportLoading = ref(false)

const loadReportData = async () => {
  if (!reportFechaInicio.value || !reportFechaFin.value)
    return

  isReportLoading.value = true
  try {
    reportArreglos.value = await arreglosStore.fetchArreglosReport(reportFechaInicio.value, reportFechaFin.value, reportEstado.value)
  }
  catch (error) {
    console.error('Error al cargar reporte:', error)
  }
  finally {
    isReportLoading.value = false
  }
}

const openReportDialog = () => {
  reportDialogOpen.value = true
  loadReportData()
}

watch(reportEstado, () => {
  if (reportDialogOpen.value)
    loadReportData()
})

const reportTotal = computed(() => reportArreglos.value.reduce((sum, a) => sum + Number(a.valor || 0), 0))
const reportCantidadTotal = computed(() => reportArreglos.value.reduce((sum, a) => sum + Number(a.cantidad || 1), 0))
const reportPendiente = computed(() => reportArreglos.value.filter(a => a.estado === 'pendiente').reduce((sum, a) => sum + Number(a.valor || 0), 0))
const reportCobrado = computed(() => reportTotal.value - reportPendiente.value)

const escapar = (texto: string | null | undefined) =>
  (texto || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const celdaEstado = (arreglo: Arreglo) => {
  if (arreglo.estado !== 'cancelado')
    return '<span class="estado pend">Pendiente</span>'

  const medio = arreglo.tipo_pago === 'transferencia' ? 'Transf.' : 'Efectivo'

  return `<span class="estado ok">Cancelado</span><div class="sub">${formatDate(arreglo.fecha_pago)} · ${medio}</div>`
}

const printReport = () => {
  const rowsHtml = reportArreglos.value.map((arreglo, index) => `
    <tr>
      <td style="text-align: center;">${index + 1}</td>
      <td style="text-align: center;">${formatDate(arreglo.fecha)}</td>
      <td>${escapar(nombreCliente(arreglo.cliente))}</td>
      <td>${escapar(arreglo.descripcion)}</td>
      <td style="text-align: center;">${arreglo.cantidad}</td>
      <td style="text-align: center;">${celdaEstado(arreglo)}</td>
      <td style="text-align: right; font-weight: bold;">${formatCurrency(arreglo.valor)}</td>
    </tr>
  `).join('')

  const filtroEstado = reportEstado.value === 'pendiente' ? 'Solo pendientes' : reportEstado.value === 'cancelado' ? 'Solo cancelados' : 'Todos'

  imprimirHtml({
    titulo: `Reporte de Arreglos - ${negocio.nombreComercial}`,
    ancho: 900,
    alto: 800,
    estilos: `
      @page { size: A4; margin: 15mm; }
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; margin: 0; padding: 20px; font-size: 13px; line-height: 1.4; }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--doc-primario-oscuro); padding-bottom: 15px; margin-bottom: 20px; }
      .logo-title { font-size: 22px; font-weight: bold; color: var(--doc-primario-oscuro); letter-spacing: 1px; }
      .subtitle { font-size: 13px; color: #666; margin-top: 4px; }
      .report-info { text-align: right; font-size: 12px; color: #444; }
      .summary-cards { display: flex; gap: 12px; margin-bottom: 20px; }
      .summary-box { flex: 1; border: 1px solid #e0e0e0; background: #fafafa; border-radius: 6px; padding: 10px 12px; text-align: center; }
      .summary-box .label { font-size: 10px; text-transform: uppercase; color: #666; font-weight: 600; }
      .summary-box .val { font-size: 15px; font-weight: bold; color: #111; margin-top: 4px; }
      .summary-box.total .val { color: var(--doc-primario-oscuro); font-size: 17px; }
      .summary-box.pend .val { color: #c62828; }
      .summary-box.ok .val { color: #2e7d32; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th { background: #1e1b16; color: var(--doc-primario-claro); padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--doc-primario-oscuro); }
      td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
      tr:nth-child(even) { background-color: #fcfcfc; }
      .estado { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
      .estado.ok { color: #2e7d32; background: #e8f5e9; }
      .estado.pend { color: #c62828; background: #ffebee; }
      .sub { font-size: 10px; color: #777; margin-top: 2px; }
      .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; display: flex; justify-content: space-between; font-size: 11px; color: #777; }
    `,
    cuerpo: `
      <div class="header">
        <div>
          <div class="logo-title">${escapar(negocio.nombreMayusculas)}</div>
          <div class="subtitle">Reporte de Arreglos y Servicios de Taller</div>
        </div>
        <div class="report-info">
          <div><strong>Rango:</strong> ${formatDate(reportFechaInicio.value)} al ${formatDate(reportFechaFin.value)}</div>
          <div><strong>Estado:</strong> ${filtroEstado}</div>
          <div><strong>Fecha Impr.:</strong> ${formatNowDateTime()}</div>
          <div><strong>Total Regs:</strong> ${reportArreglos.value.length}</div>
        </div>
      </div>

      <div class="summary-cards">
        <div class="summary-box total">
          <div class="label">Valor total</div>
          <div class="val">${formatCurrency(reportTotal.value)}</div>
        </div>
        <div class="summary-box ok">
          <div class="label">Cobrado</div>
          <div class="val">${formatCurrency(reportCobrado.value)}</div>
        </div>
        <div class="summary-box pend">
          <div class="label">Pendiente</div>
          <div class="val">${formatCurrency(reportPendiente.value)}</div>
        </div>
        <div class="summary-box">
          <div class="label">Arreglos / Piezas</div>
          <div class="val">${reportArreglos.value.length} / ${reportCantidadTotal.value}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 36px; text-align: center;">#</th>
            <th style="width: 95px; text-align: center;">Fecha</th>
            <th style="width: 140px;">Cliente</th>
            <th>Descripción</th>
            <th style="width: 55px; text-align: center;">Cant.</th>
            <th style="width: 110px; text-align: center;">Estado</th>
            <th style="width: 110px; text-align: right;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="7" style="text-align: center; color: #888; padding: 20px;">No hay arreglos registrados en este rango de fechas.</td></tr>'}
        </tbody>
      </table>

      <div class="footer">
        <div>${escapar(negocio.nombreComercial)} — Sistema de Control de Taller</div>
        <div>${formatNowDateTime()}</div>
      </div>
    `,
  })
}
</script>

<template>
  <section>
    <!-- 👉 Encabezado -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h4 class="text-h4 font-weight-bold d-flex align-center gap-2">
          <VIcon
            icon="tabler-tools"
            color="primary"
            size="28"
          />
          Arreglos de Taller
        </h4>
        <p class="text-body-1 text-disabled mb-0">
          Registra los servicios de reparación, controla lo que te deben y cobra por cliente
        </p>
      </div>

      <div class="d-flex align-center flex-wrap gap-3">
        <VBtn
          color="secondary"
          variant="tonal"
          prepend-icon="tabler-file-text"
          @click="openReportDialog"
        >
          Informe por fechas
        </VBtn>
        <VBtn
          color="primary"
          prepend-icon="tabler-plus"
          @click="openCreateDialog"
        >
          Nuevo Arreglo
        </VBtn>
      </div>
    </div>

    <!-- 👉 Resumen -->
    <div class="mb-6">
      <ArreglosResumenCards
        :resumen="resumen"
        :loading="isResumenLoading"
        @ver-pendientes="verPendientes"
        @ver-vencidos="verVencidos"
      />
    </div>

    <VCard elevation="2">
      <VTabs
        v-model="tab"
        class="px-4"
      >
        <VTab value="arreglos">
          <VIcon
            icon="tabler-list-details"
            start
          />
          Arreglos
        </VTab>
        <VTab value="cobros">
          <VIcon
            icon="tabler-users"
            start
          />
          Cobros por cliente
          <VChip
            v-if="deudores.length"
            size="x-small"
            color="error"
            variant="tonal"
            class="ms-2"
          >
            {{ deudores.length }}
          </VChip>
        </VTab>
      </VTabs>

      <VDivider />

      <VWindow v-model="tab">
        <!-- ═══════════ Pestaña: Arreglos ═══════════ -->
        <VWindowItem value="arreglos">
          <VCardText class="pb-2">
            <VRow
              class="align-center"
              density="compact"
            >
              <VCol
                cols="12"
                md="3"
              >
                <AppTextField
                  v-model="busqueda"
                  placeholder="Buscar descripción..."
                  density="compact"
                  clearable
                  prepend-inner-icon="tabler-search"
                />
              </VCol>
              <VCol
                cols="12"
                sm="6"
                md="3"
              >
                <AppAutocomplete
                  v-model="selectedClienteId"
                  :items="itemsClientes"
                  placeholder="Todos los clientes"
                  prepend-inner-icon="tabler-user"
                  density="compact"
                  clearable
                />
              </VCol>
              <VCol
                cols="6"
                sm="3"
                md="2"
              >
                <AppDateTimePicker
                  v-model="fechaInicio"
                  placeholder="Desde"
                  density="compact"
                  clearable
                  :config="{ dateFormat: 'Y-m-d' }"
                />
              </VCol>
              <VCol
                cols="6"
                sm="3"
                md="2"
              >
                <AppDateTimePicker
                  v-model="fechaFin"
                  placeholder="Hasta"
                  density="compact"
                  clearable
                  :config="{ dateFormat: 'Y-m-d' }"
                />
              </VCol>
              <VCol
                cols="12"
                md="2"
                class="text-md-end"
              >
                <VBtn
                  v-if="hayFiltros"
                  variant="text"
                  color="secondary"
                  size="small"
                  prepend-icon="tabler-filter-off"
                  @click="limpiarFiltros"
                >
                  Limpiar filtros
                </VBtn>
              </VCol>
            </VRow>

            <div class="d-flex align-center flex-wrap gap-3 mt-3">
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
            </div>
          </VCardText>

          <!-- Resumen del cliente filtrado -->
          <VExpandTransition>
            <div
              v-if="selectedClienteId"
              class="px-6 pb-4"
            >
              <VAlert
                v-if="deudorActual"
                color="error"
                variant="tonal"
                class="cliente-alerta"
              >
                <div class="d-flex align-center justify-space-between flex-wrap gap-3">
                  <div>
                    <div class="font-weight-bold text-high-emphasis">
                      {{ clienteActualNombre }} debe {{ formatCurrency(deudorActual.total) }}
                    </div>
                    <div class="text-sm">
                      {{ deudorActual.cantidad }} arreglo(s) pendiente(s) · el más antiguo {{ textoDias(deudorActual.dias_mas_antiguo) }}
                    </div>
                  </div>
                  <div class="d-flex flex-wrap gap-2">
                    <VBtn
                      size="small"
                      variant="flat"
                      color="error"
                      prepend-icon="tabler-file-invoice"
                      :loading="generandoCliente === deudorActual.cliente_id"
                      @click="imprimirCliente(deudorActual.cliente_id)"
                    >
                      Cuenta de cobro PDF
                    </VBtn>
                    <VBtn
                      size="small"
                      variant="tonal"
                      color="success"
                      prepend-icon="tabler-brand-whatsapp"
                      @click="enviarWhatsapp(deudorActual.cliente_id)"
                    >
                      Recordar por WhatsApp
                    </VBtn>
                    <VBtn
                      size="small"
                      variant="outlined"
                      color="success"
                      prepend-icon="tabler-checks"
                      @click="abrirPagoCliente(deudorActual)"
                    >
                      Cancelar todo
                    </VBtn>
                  </div>
                </div>
              </VAlert>
              <VAlert
                v-else
                color="success"
                variant="tonal"
                icon="tabler-circle-check"
              >
                {{ clienteActualNombre }} está al día: no tiene arreglos pendientes de pago.
              </VAlert>
            </div>
          </VExpandTransition>

          <!-- Barra de acciones masivas -->
          <VExpandTransition>
            <div
              v-if="seleccion.length"
              class="barra-seleccion d-flex align-center justify-space-between flex-wrap gap-3 px-6 py-3"
            >
              <div class="d-flex align-center gap-3">
                <VBtn
                  icon
                  size="small"
                  variant="text"
                  color="primary"
                  aria-label="Quitar selección"
                  @click="seleccion = []"
                >
                  <VIcon icon="tabler-x" />
                </VBtn>
                <div>
                  <div class="font-weight-bold text-high-emphasis">
                    {{ seleccion.length }} seleccionado(s) · {{ formatCurrency(totalSeleccion) }}
                  </div>
                  <div class="text-xs text-medium-emphasis">
                    {{ seleccionPendientes.length }} pendiente(s) por {{ formatCurrency(totalSeleccionPendiente) }}
                    <template v-if="seleccionCancelados.length">
                      · {{ seleccionCancelados.length }} cancelado(s)
                    </template>
                  </div>
                </div>
              </div>
              <div class="d-flex flex-wrap gap-2">
                <VBtn
                  size="small"
                  color="success"
                  prepend-icon="tabler-checks"
                  :disabled="!seleccionPendientes.length"
                  @click="abrirPagoSeleccion"
                >
                  Marcar como cancelados
                </VBtn>
                <VBtn
                  size="small"
                  variant="tonal"
                  color="primary"
                  prepend-icon="tabler-file-invoice"
                  :disabled="!seleccionPendientes.length"
                  @click="imprimirSeleccion"
                >
                  Cuenta de cobro
                </VBtn>
                <VBtn
                  v-if="seleccionCancelados.length"
                  size="small"
                  variant="tonal"
                  color="warning"
                  prepend-icon="tabler-arrow-back-up"
                  @click="revertirAPendiente(seleccionCancelados)"
                >
                  Volver a pendiente
                </VBtn>
              </div>
            </div>
          </VExpandTransition>

          <VDivider />

          <VDataTableServer
            v-model="seleccion"
            v-model:items-per-page="itemsPerPage"
            v-model:page="page"
            v-model:sort-by="sortBy"
            :items="arreglosList"
            :items-length="totalArreglosCount"
            :headers="headers"
            :loading="isLoading"
            :items-per-page-options="[10, 25, 50, 100]"
            item-value="id"
            return-object
            show-select
            must-sort
            hover
            class="text-no-wrap arreglos-table"
          >
            <template #item.fecha="{ item }">
              <span class="font-weight-medium text-body-2">{{ formatDate(item.fecha) }}</span>
            </template>

            <template #item.cliente="{ item }">
              <div
                v-if="item.cliente"
                class="d-flex align-center gap-2 cliente-link"
                role="button"
                @click="selectedClienteId = item.cliente_id || null"
              >
                <VAvatar
                  size="30"
                  color="primary"
                  variant="tonal"
                >
                  <span class="text-xs font-weight-bold">{{ iniciales(item.cliente.nombre, item.cliente.apellido) }}</span>
                </VAvatar>
                <span class="font-weight-medium text-body-2">{{ item.cliente.nombre }} {{ item.cliente.apellido }}</span>
              </div>
              <span
                v-else
                class="text-disabled text-body-2"
              >Sin asignar</span>
            </template>

            <template #item.descripcion="{ item }">
              <div class="py-2 descripcion-celda">
                <div class="font-weight-medium text-high-emphasis text-truncate">
                  {{ item.descripcion }}
                </div>
                <div
                  v-if="item.notas"
                  class="text-xs text-disabled text-truncate d-flex align-center gap-1"
                >
                  <VIcon
                    icon="tabler-note"
                    size="12"
                  />
                  {{ item.notas }}
                </div>
              </div>
            </template>

            <template #item.cantidad="{ item }">
              <VChip
                size="small"
                color="info"
                variant="tonal"
                class="font-weight-bold"
              >
                {{ item.cantidad }} pza{{ item.cantidad > 1 ? 's' : '' }}
              </VChip>
            </template>

            <template #item.valor="{ item }">
              <span
                class="font-weight-bold text-body-1"
                :class="item.estado === 'pendiente' ? 'text-high-emphasis' : 'text-success'"
              >
                {{ formatCurrency(item.valor) }}
              </span>
            </template>

            <template #item.estado="{ item }">
              <div
                v-if="item.estado === 'pendiente'"
                class="d-flex flex-column align-start py-1"
              >
                <VChip
                  size="small"
                  color="warning"
                  variant="tonal"
                  prepend-icon="tabler-clock"
                  class="font-weight-bold"
                >
                  Pendiente
                </VChip>
                <span
                  class="text-xs mt-1"
                  :class="`text-${colorAntiguedad(diasDesde(item.fecha))}`"
                >
                  {{ textoDias(diasDesde(item.fecha)) }}
                </span>
              </div>
              <div
                v-else
                class="d-flex flex-column align-start py-1"
              >
                <VChip
                  size="small"
                  color="success"
                  variant="tonal"
                  prepend-icon="tabler-circle-check"
                  class="font-weight-bold"
                >
                  Cancelado
                </VChip>
                <span class="text-xs text-disabled mt-1 d-flex align-center gap-1">
                  <VIcon
                    :icon="item.tipo_pago === 'transferencia' ? 'tabler-building-bank' : 'tabler-cash'"
                    size="12"
                  />
                  {{ formatDate(item.fecha_pago) }}
                </span>
              </div>
            </template>

            <template #item.actions="{ item }">
              <div class="d-flex align-center justify-end gap-1">
                <IconBtn
                  v-if="item.estado === 'pendiente'"
                  color="success"
                  @click="abrirPagoUno(item)"
                >
                  <VIcon
                    icon="tabler-cash-register"
                    size="20"
                  />
                  <VTooltip
                    activator="parent"
                    location="top"
                  >
                    Registrar pago
                  </VTooltip>
                </IconBtn>
                <IconBtn
                  v-else
                  @click="revertirAPendiente([item])"
                >
                  <VIcon
                    icon="tabler-arrow-back-up"
                    size="20"
                  />
                  <VTooltip
                    activator="parent"
                    location="top"
                  >
                    Volver a pendiente
                  </VTooltip>
                </IconBtn>
                <IconBtn @click="openEditDialog(item)">
                  <VIcon
                    icon="tabler-pencil"
                    size="20"
                  />
                  <VTooltip
                    activator="parent"
                    location="top"
                  >
                    Editar
                  </VTooltip>
                </IconBtn>
                <IconBtn @click="deleteArreglo(item)">
                  <VIcon
                    icon="tabler-trash"
                    size="20"
                    color="error"
                  />
                  <VTooltip
                    activator="parent"
                    location="top"
                  >
                    Eliminar
                  </VTooltip>
                </IconBtn>
              </div>
            </template>

            <template #no-data>
              <div class="text-center py-10">
                <VIcon
                  icon="tabler-tools-off"
                  size="48"
                  class="text-disabled mb-3"
                />
                <p class="text-h6 text-disabled mb-1">
                  {{ hayFiltros ? 'Ningún arreglo coincide con los filtros' : 'No hay arreglos registrados' }}
                </p>
                <VBtn
                  v-if="hayFiltros"
                  variant="text"
                  size="small"
                  @click="limpiarFiltros"
                >
                  Limpiar filtros
                </VBtn>
                <p
                  v-else
                  class="text-body-2 text-disabled"
                >
                  Registra tu primer arreglo para comenzar
                </p>
              </div>
            </template>
          </VDataTableServer>
        </VWindowItem>

        <!-- ═══════════ Pestaña: Cobros por cliente ═══════════ -->
        <VWindowItem value="cobros">
          <VCardText class="d-flex align-center justify-space-between flex-wrap gap-3">
            <div class="text-body-2 text-medium-emphasis">
              Clientes con arreglos pendientes de pago, de mayor a menor deuda.
            </div>
            <AppTextField
              v-model="busquedaDeudor"
              placeholder="Buscar cliente..."
              density="compact"
              clearable
              prepend-inner-icon="tabler-search"
              style="max-inline-size: 280px;"
            />
          </VCardText>

          <VDivider />

          <VDataTable
            :items="deudoresFiltrados"
            :headers="[
              { title: 'Cliente', key: 'cliente', sortable: false },
              { title: 'Arreglos', key: 'cantidad', align: 'center' },
              { title: 'Más antiguo', key: 'dias_mas_antiguo' },
              { title: 'Total adeudado', key: 'total', align: 'end' },
              { title: '', key: 'acciones', sortable: false, align: 'end' },
            ]"
            :loading="isDeudoresLoading"
            :items-per-page="25"
            item-value="cliente_id"
            hover
            class="text-no-wrap"
          >
            <template #item.cliente="{ item }">
              <div class="d-flex align-center gap-3 py-2">
                <VAvatar
                  color="error"
                  variant="tonal"
                  size="38"
                  rounded="lg"
                >
                  <span class="text-body-2 font-weight-bold">{{ iniciales(item.nombre, item.apellido) }}</span>
                </VAvatar>
                <div class="d-flex flex-column">
                  <span class="font-weight-bold text-high-emphasis">{{ item.nombre || 'Cliente' }} {{ item.apellido || '' }}</span>
                  <span class="text-xs text-disabled">{{ item.telefono || 'Sin teléfono' }}</span>
                </div>
              </div>
            </template>

            <template #item.cantidad="{ item }">
              <span class="font-weight-medium">{{ item.cantidad }}</span>
              <span class="text-xs text-disabled"> · {{ item.piezas }} pza(s)</span>
            </template>

            <template #item.dias_mas_antiguo="{ item }">
              <VChip
                size="small"
                :color="colorAntiguedad(item.dias_mas_antiguo)"
                variant="tonal"
              >
                {{ textoDias(item.dias_mas_antiguo) }}
              </VChip>
            </template>

            <template #item.total="{ item }">
              <span class="font-weight-bold text-error text-body-1">{{ formatCurrency(item.total) }}</span>
            </template>

            <template #item.acciones="{ item }">
              <div class="d-flex align-center justify-end gap-1">
                <IconBtn @click="verCliente(item.cliente_id)">
                  <VIcon
                    icon="tabler-eye"
                    size="20"
                  />
                  <VTooltip
                    activator="parent"
                    location="top"
                  >
                    Ver arreglos pendientes
                  </VTooltip>
                </IconBtn>
                <IconBtn
                  :loading="generandoCliente === item.cliente_id"
                  @click="imprimirCliente(item.cliente_id)"
                >
                  <VIcon
                    icon="tabler-file-invoice"
                    size="20"
                    color="primary"
                  />
                  <VTooltip
                    activator="parent"
                    location="top"
                  >
                    Cuenta de cobro PDF
                  </VTooltip>
                </IconBtn>
                <IconBtn @click="enviarWhatsapp(item.cliente_id)">
                  <VIcon
                    icon="tabler-brand-whatsapp"
                    size="20"
                    color="success"
                  />
                  <VTooltip
                    activator="parent"
                    location="top"
                  >
                    {{ item.telefono ? 'Recordar por WhatsApp' : 'WhatsApp (sin teléfono: elegir contacto)' }}
                  </VTooltip>
                </IconBtn>
                <VBtn
                  size="small"
                  variant="tonal"
                  color="success"
                  class="ms-1"
                  @click="abrirPagoCliente(item)"
                >
                  Cancelar todo
                </VBtn>
              </div>
            </template>

            <template #no-data>
              <div class="text-center py-10">
                <VIcon
                  icon="tabler-mood-happy"
                  size="48"
                  class="text-success mb-3"
                />
                <p class="text-h6 text-disabled mb-1">
                  Nadie te debe arreglos
                </p>
                <p class="text-body-2 text-disabled">
                  Todos los arreglos con cliente están cancelados
                </p>
              </div>
            </template>
          </VDataTable>
        </VWindowItem>
      </VWindow>
    </VCard>

    <!-- 👉 Diálogos -->
    <ArregloFormDialog
      v-model:is-dialog-visible="formDialogOpen"
      :arreglo-data="editingArreglo"
      :clientes="clientes"
      :cliente-inicial="selectedClienteId"
      @submit="onSubmitForm"
    />

    <ArregloPagoDialog
      v-model:is-dialog-visible="pagoDialogOpen"
      :cantidad="contextoPago.cantidad"
      :total="contextoPago.total"
      :descripcion="contextoPago.descripcion"
      :loading="isPagando"
      @confirm="confirmarPago"
    />

    <VDialog
      v-model="reportDialogOpen"
      max-width="680"
    >
      <VCard class="pa-2">
        <VCardItem class="pb-4">
          <div class="d-flex align-center justify-space-between w-100">
            <div class="d-flex align-center gap-2">
              <VAvatar
                color="primary"
                variant="tonal"
                size="38"
                rounded
              >
                <VIcon
                  icon="tabler-file-text"
                  size="22"
                />
              </VAvatar>
              <div>
                <h5 class="text-h5 font-weight-bold mb-0">
                  Informe de Arreglos
                </h5>
                <span class="text-caption text-disabled">Generar reporte por rango de fechas</span>
              </div>
            </div>

            <IconBtn @click="reportDialogOpen = false">
              <VIcon icon="tabler-x" />
            </IconBtn>
          </div>
        </VCardItem>

        <VDivider class="mb-4" />

        <VCardText class="pt-2">
          <VRow>
            <VCol
              cols="12"
              sm="4"
            >
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">Fecha Inicio</label>
              <AppDateTimePicker
                v-model="reportFechaInicio"
                placeholder="Desde"
                :config="{ dateFormat: 'Y-m-d' }"
                density="compact"
              />
            </VCol>
            <VCol
              cols="12"
              sm="4"
            >
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">Fecha Fin</label>
              <AppDateTimePicker
                v-model="reportFechaFin"
                placeholder="Hasta"
                :config="{ dateFormat: 'Y-m-d' }"
                density="compact"
              />
            </VCol>
            <VCol
              cols="12"
              sm="4"
            >
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">Estado</label>
              <AppSelect
                v-model="reportEstado"
                :items="[{ value: null, title: 'Todos' }, { value: 'pendiente', title: 'Pendientes' }, { value: 'cancelado', title: 'Cancelados' }]"
                density="compact"
              />
            </VCol>
          </VRow>

          <div class="d-flex justify-end mt-3">
            <VBtn
              color="primary"
              variant="tonal"
              size="small"
              prepend-icon="tabler-refresh"
              :loading="isReportLoading"
              @click="loadReportData"
            >
              Cargar
            </VBtn>
          </div>

          <VAlert
            v-if="reportArreglos.length > 0"
            color="primary"
            variant="tonal"
            class="mt-4"
          >
            <div class="d-flex justify-space-between align-center flex-wrap gap-2">
              <div>
                <span class="font-weight-bold">{{ reportArreglos.length }}</span> arreglos
                <span class="mx-2">•</span>
                <span class="font-weight-bold">{{ reportCantidadTotal }}</span> piezas
                <div class="text-xs mt-1">
                  Cobrado {{ formatCurrency(reportCobrado) }} · Pendiente {{ formatCurrency(reportPendiente) }}
                </div>
              </div>
              <span class="font-weight-bold text-h6">{{ formatCurrency(reportTotal) }}</span>
            </div>
          </VAlert>

          <VAlert
            v-else-if="!isReportLoading"
            color="warning"
            variant="tonal"
            class="mt-4"
          >
            No se encontraron arreglos en el rango seleccionado.
          </VAlert>
        </VCardText>

        <VCardText class="d-flex justify-end gap-3 pt-4">
          <VBtn
            variant="tonal"
            color="secondary"
            @click="reportDialogOpen = false"
          >
            Cerrar
          </VBtn>
          <VBtn
            color="primary"
            prepend-icon="tabler-printer"
            :disabled="reportArreglos.length === 0"
            @click="printReport"
          >
            Imprimir / Guardar PDF
          </VBtn>
        </VCardText>
      </VCard>
    </VDialog>

    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3500"
      location="top end"
    >
      {{ snackbar.message }}
    </VSnackbar>
  </section>
</template>

<style scoped>
.arreglos-table :deep(tbody tr) {
  cursor: default;
}

.descripcion-celda {
  max-inline-size: 340px;
}

.cliente-link {
  cursor: pointer;
}

.cliente-link:hover span {
  color: rgb(var(--v-theme-primary));
}

.barra-seleccion {
  border-block: 1px solid rgba(var(--v-theme-primary), 0.3);
  background: rgba(var(--v-theme-primary), 0.08);
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
</style>

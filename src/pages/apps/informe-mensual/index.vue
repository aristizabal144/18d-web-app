<script setup lang="ts">
import { useTheme } from 'vuetify'
import { supabase } from '@/utils/supabase'

defineOptions({ name: 'InformeMensual' })

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface PedidoInforme {
  id: string
  referencia: string
  titulo: string
  fecha_inicio: string | null
  fecha_fin: string | null
  fecha_entregado: string | null
  created_at: string
  total_pedido: number | null
  peso: number | null
  peso_final: number | null
  estado: string
  cliente_id: string | null
  cliente: { nombre: string; apellido: string } | null
}

interface AbonoInforme {
  valor: number
  tipo_pago: 'efectivo' | 'transferencia'
  fecha: string
}

type GastoInforme = AbonoInforme

interface TopCliente {
  clave: string
  nombre: string
  pedidos: number
  gramos: number
  total: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const { formatCurrency, formatNumber, formatDateNumeric: formatDate } = useFormato()
const theme = useTheme()

const formatGrams = (value: number) => `${formatNumber(value, 1)} gr`

// 'YYYY-MM-DD' en hora local; toISOString() pasaría a UTC y correría el día
const toLocalDateStr = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')

  return `${y}-${m}-${d}`
}

// Misma regla que el informe semanal: se factura por fecha de entrega
const getPedidoDeliveryDate = (p: PedidoInforme): string => {
  const d = p.fecha_entregado || p.fecha_fin || p.created_at

  return d ? d.substring(0, 10) : ''
}

const pesoPedido = (p: PedidoInforme) => Number(p.peso_final ?? p.peso ?? 0)

// ─── Selector de Mes ─────────────────────────────────────────────────────────
const now = new Date()
const selectedYear = ref(now.getFullYear())
const selectedMonth = ref(now.getMonth() + 1) // 1-12

const monthOptions = [
  { value: 1, title: 'Enero' },
  { value: 2, title: 'Febrero' },
  { value: 3, title: 'Marzo' },
  { value: 4, title: 'Abril' },
  { value: 5, title: 'Mayo' },
  { value: 6, title: 'Junio' },
  { value: 7, title: 'Julio' },
  { value: 8, title: 'Agosto' },
  { value: 9, title: 'Septiembre' },
  { value: 10, title: 'Octubre' },
  { value: 11, title: 'Noviembre' },
  { value: 12, title: 'Diciembre' },
]

const yearOptions = computed(() => {
  const current = now.getFullYear()

  return [current - 4, current - 3, current - 2, current - 1, current].map(y => ({ value: y, title: String(y) }))
})

const selectedMonthLabel = computed(() => monthOptions.find(m => m.value === selectedMonth.value)?.title || '')

const esMesActual = computed(() => selectedYear.value === now.getFullYear() && selectedMonth.value === now.getMonth() + 1)

const cambiarMes = (delta: number) => {
  const fecha = new Date(selectedYear.value, selectedMonth.value - 1 + delta, 1)
  if (fecha > now)
    return

  selectedYear.value = fecha.getFullYear()
  selectedMonth.value = fecha.getMonth() + 1
}

const irMesActual = () => {
  selectedYear.value = now.getFullYear()
  selectedMonth.value = now.getMonth() + 1
}

const getMonthRange = (year: number, month: number) => ({
  start: toLocalDateStr(new Date(year, month - 1, 1)),
  end: toLocalDateStr(new Date(year, month, 0)),
  days: new Date(year, month, 0).getDate(),
})

// ─── State ───────────────────────────────────────────────────────────────────
const isMounted = ref(false)
const isLoading = ref(false)
const pedidosEntregados = ref<PedidoInforme[]>([])
const pedidosIngresados = ref<PedidoInforme[]>([])
const abonos = ref<AbonoInforme[]>([])
const gastos = ref<GastoInforme[]>([])
const facturadoMesAnterior = ref(0)

// ─── Fetch ───────────────────────────────────────────────────────────────────
let ultimaSolicitud = 0

const fetchInforme = async () => {
  const solicitud = ++ultimaSolicitud

  isLoading.value = true
  try {
    const { start, end } = getMonthRange(selectedYear.value, selectedMonth.value)
    const prevDate = new Date(selectedYear.value, selectedMonth.value - 2, 1)
    const prev = getMonthRange(prevDate.getFullYear(), prevDate.getMonth() + 1)

    const columnas = 'id, referencia, titulo, fecha_inicio, fecha_fin, fecha_entregado, created_at, total_pedido, peso, peso_final, estado, cliente_id, cliente:profiles!pedidos_cliente_id_fkey(nombre, apellido)'

    const [entregadosRes, ingresadosRes, abonosRes, gastosRes] = await Promise.all([
      supabase.from('pedidos').select(columnas).eq('estado', 'entregado'),
      supabase.from('pedidos').select(columnas).gte('fecha_inicio', start).lte('fecha_inicio', end).order('fecha_inicio', { ascending: true }),
      supabase.from('abonos').select('valor, tipo_pago, fecha').gte('fecha', start).lte('fecha', end),
      supabase.from('gastos').select('valor, tipo_pago, fecha').gte('fecha', start).lte('fecha', end),
    ])

    if (solicitud !== ultimaSolicitud)
      return

    const entregados = (entregadosRes.data || []) as unknown as PedidoInforme[]

    pedidosEntregados.value = entregados
      .filter(p => {
        const d = getPedidoDeliveryDate(p)

        return d >= start && d <= end
      })
      .sort((a, b) => getPedidoDeliveryDate(a).localeCompare(getPedidoDeliveryDate(b)))

    facturadoMesAnterior.value = entregados
      .filter(p => {
        const d = getPedidoDeliveryDate(p)

        return d >= prev.start && d <= prev.end
      })
      .reduce((sum, p) => sum + Number(p.total_pedido || 0), 0)

    pedidosIngresados.value = (ingresadosRes.data || []) as unknown as PedidoInforme[]
    abonos.value = (abonosRes.data || []) as AbonoInforme[]
    gastos.value = (gastosRes.data || []) as GastoInforme[]
  }
  catch (error) {
    console.error('Error cargando informe mensual:', error)
  }
  finally {
    if (solicitud === ultimaSolicitud)
      isLoading.value = false
  }
}

watch([selectedYear, selectedMonth], fetchInforme)

onMounted(() => {
  isMounted.value = true
  fetchInforme()
})

// ─── KPIs ────────────────────────────────────────────────────────────────────
const totalFacturado = computed(() => pedidosEntregados.value.reduce((s, p) => s + Number(p.total_pedido || 0), 0))
const totalGramos = computed(() => pedidosEntregados.value.reduce((s, p) => s + pesoPedido(p), 0))
const totalAbonos = computed(() => abonos.value.reduce((s, a) => s + Number(a.valor || 0), 0))
const abonosEfectivo = computed(() => abonos.value.filter(a => a.tipo_pago === 'efectivo').reduce((s, a) => s + Number(a.valor || 0), 0))
const abonosTransferencia = computed(() => totalAbonos.value - abonosEfectivo.value)
const totalGastos = computed(() => gastos.value.reduce((s, g) => s + Number(g.valor || 0), 0))
const gastosEfectivo = computed(() => gastos.value.filter(g => g.tipo_pago === 'efectivo').reduce((s, g) => s + Number(g.valor || 0), 0))
const gastosTransferencia = computed(() => totalGastos.value - gastosEfectivo.value)

const variacionFacturado = computed(() => {
  if (!facturadoMesAnterior.value)
    return null

  return ((totalFacturado.value - facturadoMesAnterior.value) / facturadoMesAnterior.value) * 100
})

const topClientes = computed<TopCliente[]>(() => {
  const mapa = new Map<string, TopCliente>()

  for (const p of pedidosEntregados.value) {
    const clave = p.cliente_id || 'sin-cliente'

    const actual = mapa.get(clave) || {
      clave,
      nombre: p.cliente ? `${p.cliente.nombre} ${p.cliente.apellido}` : 'Sin asignar',
      pedidos: 0,
      gramos: 0,
      total: 0,
    }

    actual.pedidos += 1
    actual.gramos += pesoPedido(p)
    actual.total += Number(p.total_pedido || 0)
    mapa.set(clave, actual)
  }

  return [...mapa.values()].sort((a, b) => b.total - a.total).slice(0, 5)
})

// ─── Datos Diarios ───────────────────────────────────────────────────────────
const dailyData = computed(() => {
  const { days } = getMonthRange(selectedYear.value, selectedMonth.value)

  return Array.from({ length: days }, (_, i) => {
    const fecha = toLocalDateStr(new Date(selectedYear.value, selectedMonth.value - 1, i + 1))
    const entregadosDia = pedidosEntregados.value.filter(p => getPedidoDeliveryDate(p) === fecha)

    return {
      dia: String(i + 1),
      facturado: entregadosDia.reduce((s, p) => s + Number(p.total_pedido || 0), 0),
      entregados: entregadosDia.length,
      ingresados: pedidosIngresados.value.filter(p => p.fecha_inicio?.substring(0, 10) === fecha).length,
    }
  })
})

// ─── ApexCharts ──────────────────────────────────────────────────────────────
const primaryColor = computed(() => theme.current.value.colors.primary)

const baseChart = {
  toolbar: { show: false },
  zoom: { enabled: false },
  fontFamily: 'Public Sans, sans-serif',
}

const baseGrid = {
  borderColor: 'rgba(255, 255, 255, 0.08)',
  strokeDashArray: 4,
}

const chartFacturacionSeries = computed(() => [{
  name: 'Facturado',
  data: dailyData.value.map(d => d.facturado),
}])

const chartFacturacionOptions = computed(() => ({
  chart: { ...baseChart, height: 320, type: 'area' },
  stroke: { width: 3, curve: 'smooth' },
  colors: ['#28C76F'],
  fill: {
    type: 'gradient',
    gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.05, stops: [0, 90, 100] },
  },
  markers: { size: 3, colors: ['#28C76F'], hover: { size: 6 } },
  xaxis: {
    categories: dailyData.value.map(d => d.dia),
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { fontSize: '11px' } },
  },
  yaxis: { labels: { formatter: (val: number) => `$${(val / 1000).toFixed(0)}k` } },
  tooltip: {
    theme: 'dark',
    x: { formatter: (val: number) => `${val} de ${selectedMonthLabel.value}` },
    y: { formatter: (val: number) => formatCurrency(val) },
  },
  grid: baseGrid,
  dataLabels: { enabled: false },
}))

const chartPedidosSeries = computed(() => [
  { name: 'Entregados', data: dailyData.value.map(d => d.entregados) },
  { name: 'Ingresados', data: dailyData.value.map(d => d.ingresados) },
])

const chartPedidosOptions = computed(() => ({
  chart: { ...baseChart, height: 320, type: 'bar' },
  plotOptions: { bar: { columnWidth: '60%', borderRadius: 4 } },
  colors: [primaryColor.value, '#00CFE8'],
  xaxis: {
    categories: dailyData.value.map(d => d.dia),
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { fontSize: '11px' } },
  },
  yaxis: { min: 0, forceNiceScale: true, labels: { formatter: (val: number) => val.toFixed(0) } },
  tooltip: {
    theme: 'dark',
    shared: true,
    intersect: false,
    x: { formatter: (val: number) => `${val} de ${selectedMonthLabel.value}` },
    y: { formatter: (val: number) => `${val} pedido(s)` },
  },
  legend: { position: 'top', horizontalAlign: 'right', labels: { colors: 'rgba(255,255,255,0.7)' } },
  grid: baseGrid,
  dataLabels: { enabled: false },
}))
</script>

<template>
  <section>
    <!-- ── Encabezado ── -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h4 class="text-h4 font-weight-bold d-flex align-center gap-2">
          <VIcon icon="tabler-calendar-stats" color="primary" size="28" />
          Informe Mensual
        </h4>
        <p class="text-body-1 text-disabled mb-0">
          Pedidos y facturación del mes seleccionado
        </p>
      </div>

      <!-- Selector de Mes/Año -->
      <div class="d-flex align-center flex-wrap gap-2">
        <VBtn
          icon
          variant="tonal"
          color="primary"
          size="small"
          title="Mes anterior"
          :disabled="isLoading"
          @click="cambiarMes(-1)"
        >
          <VIcon icon="tabler-chevron-left" />
        </VBtn>
        <AppSelect
          v-model="selectedMonth"
          :items="monthOptions"
          density="compact"
          style="min-inline-size: 140px;"
        />
        <AppSelect
          v-model="selectedYear"
          :items="yearOptions"
          density="compact"
          style="min-inline-size: 100px;"
        />
        <VBtn
          icon
          variant="tonal"
          color="primary"
          size="small"
          title="Mes siguiente"
          :disabled="isLoading || esMesActual"
          @click="cambiarMes(1)"
        >
          <VIcon icon="tabler-chevron-right" />
        </VBtn>
        <VBtn
          v-if="!esMesActual"
          variant="text"
          color="primary"
          size="small"
          prepend-icon="tabler-calendar-event"
          @click="irMesActual"
        >
          Mes actual
        </VBtn>
        <VBtn
          color="primary"
          variant="tonal"
          icon="tabler-refresh"
          size="small"
          title="Actualizar"
          :loading="isLoading"
          @click="fetchInforme"
        />
      </div>
    </div>

    <!-- ── Banner de resumen del mes ── -->
    <VCard
      class="mb-6 overflow-hidden"
      style="background: linear-gradient(135deg, #181612 0%, #2A2518 100%); border-bottom: 3px solid rgb(var(--v-theme-primary));"
      elevation="3"
    >
      <VCardText class="pa-5">
        <div class="d-flex align-center justify-space-between flex-wrap gap-4">
          <div>
            <div class="d-flex align-center gap-2 mb-2">
              <VChip size="small" color="primary" variant="flat" class="font-weight-bold">
                TALLER
              </VChip>
              <span class="text-caption text-disabled">Período analizado</span>
            </div>
            <h3 class="text-h3 font-weight-bold text-white mb-1">
              {{ selectedMonthLabel }} {{ selectedYear }}
            </h3>
            <p class="text-body-1 mb-0" style="color: rgba(255, 255, 255, 0.65);">
              {{ pedidosEntregados.length }} pedidos entregados · {{ formatGrams(totalGramos) }} de oro
            </p>
          </div>
          <div class="d-flex align-center gap-3">
            <div class="text-end">
              <div class="text-caption text-disabled mb-1">
                Total Facturado
              </div>
              <div class="text-h3 font-weight-bold text-white">
                {{ formatCurrency(totalFacturado) }}
              </div>
              <div v-if="variacionFacturado !== null" class="text-caption mt-1">
                <span :class="variacionFacturado >= 0 ? 'text-success' : 'text-error'" class="font-weight-bold">
                  <VIcon :icon="variacionFacturado >= 0 ? 'tabler-trending-up' : 'tabler-trending-down'" size="14" />
                  {{ variacionFacturado >= 0 ? '+' : '' }}{{ formatNumber(variacionFacturado, 1) }}%
                </span>
                <span class="text-disabled"> vs. mes anterior ({{ formatCurrency(facturadoMesAnterior) }})</span>
              </div>
            </div>
            <VAvatar color="primary" variant="tonal" size="56" rounded="lg">
              <VIcon icon="tabler-calendar-stats" size="30" />
            </VAvatar>
          </div>
        </div>
      </VCardText>
    </VCard>

    <!-- ── KPI Cards ── -->
    <VRow class="mb-6">
      <VCol cols="12" sm="6" md="3">
        <VCard elevation="2" class="kpi-card">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-uppercase font-weight-bold text-disabled">Pedidos Entregados</span>
              <VAvatar color="success" variant="tonal" size="38" rounded="lg">
                <VIcon icon="tabler-package-export" size="20" />
              </VAvatar>
            </div>
            <VProgressCircular v-if="isLoading" indeterminate size="20" width="2" color="success" />
            <h4 v-else class="text-h4 font-weight-bold text-success">
              {{ pedidosEntregados.length }}
            </h4>
            <div class="text-xs text-disabled mt-2">
              Facturado: {{ formatCurrency(totalFacturado) }}
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" sm="6" md="3">
        <VCard elevation="2" class="kpi-card">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-uppercase font-weight-bold text-disabled">Gramos Fabricados</span>
              <VAvatar color="primary" variant="tonal" size="38" rounded="lg">
                <VIcon icon="tabler-scale" size="20" />
              </VAvatar>
            </div>
            <VProgressCircular v-if="isLoading" indeterminate size="20" width="2" color="primary" />
            <h4 v-else class="text-h4 font-weight-bold text-primary">
              {{ formatGrams(totalGramos) }}
            </h4>
            <div class="text-xs text-disabled mt-2">
              Oro de los pedidos entregados en el mes
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" sm="6" md="3">
        <VCard elevation="2" class="kpi-card">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-uppercase font-weight-bold text-disabled">Gastos del Mes</span>
              <VAvatar color="error" variant="tonal" size="38" rounded="lg">
                <VIcon icon="tabler-wallet" size="20" />
              </VAvatar>
            </div>
            <VProgressCircular v-if="isLoading" indeterminate size="20" width="2" color="error" />
            <h4 v-else class="text-h4 font-weight-bold text-error">
              {{ formatCurrency(totalGastos) }}
            </h4>
            <div class="text-xs text-disabled mt-2">
              Efectivo {{ formatCurrency(gastosEfectivo) }} · Transf. {{ formatCurrency(gastosTransferencia) }}
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" sm="6" md="3">
        <VCard elevation="2" class="kpi-card">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-uppercase font-weight-bold text-disabled">Abonos Recibidos</span>
              <VAvatar color="warning" variant="tonal" size="38" rounded="lg">
                <VIcon icon="tabler-cash" size="20" />
              </VAvatar>
            </div>
            <VProgressCircular v-if="isLoading" indeterminate size="20" width="2" color="warning" />
            <h4 v-else class="text-h4 font-weight-bold text-warning">
              {{ formatCurrency(totalAbonos) }}
            </h4>
            <div class="text-xs text-disabled mt-2">
              Efectivo {{ formatCurrency(abonosEfectivo) }} · Transf. {{ formatCurrency(abonosTransferencia) }}
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- ── Gráficas ── -->
    <VRow class="mb-6">
      <VCol cols="12" md="6">
        <VCard elevation="2">
          <VCardItem class="pb-2">
            <div class="d-flex align-center justify-space-between flex-wrap gap-2">
              <div>
                <VCardTitle class="text-h6 font-weight-bold d-flex align-center gap-2">
                  <VIcon icon="tabler-chart-line" color="success" size="22" />
                  Facturación Diaria
                </VCardTitle>
                <VCardSubtitle>Monto facturado por día (pedidos entregados)</VCardSubtitle>
              </div>
              <VChip color="success" variant="tonal" size="small" class="font-weight-bold">
                {{ formatCurrency(totalFacturado) }}
              </VChip>
            </div>
          </VCardItem>
          <VCardText class="pt-2">
            <div v-if="isLoading || !isMounted" class="d-flex justify-center align-center py-12">
              <VProgressCircular indeterminate color="success" size="48" />
            </div>
            <VueApexCharts
              v-else
              :options="chartFacturacionOptions"
              :series="chartFacturacionSeries"
              height="320"
            />
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" md="6">
        <VCard elevation="2">
          <VCardItem class="pb-2">
            <div class="d-flex align-center justify-space-between flex-wrap gap-2">
              <div>
                <VCardTitle class="text-h6 font-weight-bold d-flex align-center gap-2">
                  <VIcon icon="tabler-chart-bar" color="primary" size="22" />
                  Pedidos por Día
                </VCardTitle>
                <VCardSubtitle>Entregados vs. ingresados cada día del mes</VCardSubtitle>
              </div>
            </div>
          </VCardItem>
          <VCardText class="pt-2">
            <div v-if="isLoading || !isMounted" class="d-flex justify-center align-center py-12">
              <VProgressCircular indeterminate color="primary" size="48" />
            </div>
            <VueApexCharts
              v-else
              :options="chartPedidosOptions"
              :series="chartPedidosSeries"
              height="320"
            />
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- ── Tablas ── -->
    <VRow>
      <VCol cols="12" md="8">
        <VCard elevation="2">
          <VCardItem>
            <VCardTitle class="text-h6 font-weight-bold d-flex align-center gap-2">
              <VIcon icon="tabler-package-check" color="success" size="22" />
              Pedidos Entregados en {{ selectedMonthLabel }}
            </VCardTitle>
            <VCardSubtitle>Detalle de lo facturado en el mes, por fecha de entrega</VCardSubtitle>
          </VCardItem>

          <VDivider />

          <VTable class="text-no-wrap">
            <thead>
              <tr>
                <th>REF / PEDIDO</th>
                <th>CLIENTE</th>
                <th class="text-center">
                  FECHA ENTREGA
                </th>
                <th class="text-center">
                  GRAMOS
                </th>
                <th class="text-end">
                  VALOR FACTURADO
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in pedidosEntregados" :key="p.id">
                <td>
                  <div class="d-flex flex-column">
                    <span class="font-weight-bold text-primary">{{ p.referencia }}</span>
                    <span class="text-xs text-disabled">{{ p.titulo }}</span>
                  </div>
                </td>
                <td>
                  {{ p.cliente ? `${p.cliente.nombre} ${p.cliente.apellido}` : 'Sin asignar' }}
                </td>
                <td class="text-center">
                  {{ formatDate(getPedidoDeliveryDate(p)) }}
                </td>
                <td class="text-center font-weight-bold text-info">
                  {{ formatGrams(pesoPedido(p)) }}
                </td>
                <td class="text-end font-weight-bold text-success">
                  {{ formatCurrency(Number(p.total_pedido || 0)) }}
                </td>
              </tr>
              <tr v-if="!isLoading && pedidosEntregados.length === 0">
                <td colspan="5" class="text-center py-6 text-disabled">
                  <VIcon icon="tabler-package-off" size="32" class="mb-1 d-block mx-auto text-disabled" />
                  No se entregaron pedidos en {{ selectedMonthLabel }} {{ selectedYear }}.
                </td>
              </tr>
            </tbody>
            <tfoot v-if="pedidosEntregados.length > 0">
              <tr>
                <td colspan="3" class="text-end font-weight-bold">
                  TOTAL DEL MES
                </td>
                <td class="text-center font-weight-bold text-info">
                  {{ formatGrams(totalGramos) }}
                </td>
                <td class="text-end font-weight-bold text-success">
                  {{ formatCurrency(totalFacturado) }}
                </td>
              </tr>
            </tfoot>
          </VTable>
        </VCard>
      </VCol>

      <VCol cols="12" md="4">
        <VCard elevation="2">
          <VCardItem>
            <VCardTitle class="text-h6 font-weight-bold d-flex align-center gap-2">
              <VIcon icon="tabler-users-group" color="primary" size="22" />
              Top Clientes del Mes
            </VCardTitle>
            <VCardSubtitle>Mayor facturación en {{ selectedMonthLabel }}</VCardSubtitle>
          </VCardItem>

          <VDivider />

          <VList class="pa-2">
            <VListItem v-for="(c, idx) in topClientes" :key="c.clave">
              <template #prepend>
                <VAvatar size="30" color="primary" variant="tonal">
                  <span class="text-xs font-weight-bold">{{ idx + 1 }}</span>
                </VAvatar>
              </template>
              <VListItemTitle class="font-weight-bold text-sm">
                {{ c.nombre }}
              </VListItemTitle>
              <VListItemSubtitle class="text-xs">
                {{ c.pedidos }} pedido(s) · {{ formatGrams(c.gramos) }}
              </VListItemSubtitle>
              <template #append>
                <span class="font-weight-bold text-success text-sm">{{ formatCurrency(c.total) }}</span>
              </template>
            </VListItem>
            <div v-if="!isLoading && topClientes.length === 0" class="text-center py-6 text-disabled text-body-2">
              Sin entregas este mes
            </div>
          </VList>
        </VCard>
      </VCol>
    </VRow>
  </section>
</template>

<style scoped>
.kpi-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08) !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.kpi-card:hover {
  transform: translateY(-3px);
}

:deep(.apexcharts-tooltip) {
  border: 1px solid rgba(var(--v-theme-primary), 0.4) !important;
  backdrop-filter: blur(8px);
  background: #1e1b16 !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 60%) !important;
  color: #fff !important;
}

:deep(.apexcharts-tooltip-title) {
  border-block-end: 1px solid rgba(var(--v-theme-primary), 0.3) !important;
  background: #2a2518 !important;
  color: rgb(var(--v-theme-primary)) !important;
  font-weight: bold !important;
}

:deep(.apexcharts-tooltip-text-y-value),
:deep(.apexcharts-tooltip-text-y-label),
:deep(.apexcharts-tooltip-text) {
  color: #fff !important;
}
</style>

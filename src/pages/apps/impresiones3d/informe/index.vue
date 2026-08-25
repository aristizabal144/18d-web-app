<script setup lang="ts">
import { useFacturas3dStore } from '@/views/apps/impresiones3d/useFacturas3dStore'
import type { Factura3d, ReporteDiario, TopCliente } from '@/views/apps/impresiones3d/useFacturas3dStore'
import DetalleFactura3dDialog from '@/views/apps/impresiones3d/DetalleFactura3dDialog.vue'

defineOptions({ name: 'Impresiones3dInforme' })

// ─── Store ───────────────────────────────────────────────────────────────────
const store = useFacturas3dStore()
const isMounted = ref(false)

// ─── State - Dialog ──────────────────────────────────────────────────────────
const detalleDialogOpen = ref(false)
const selectedFactura = ref<Factura3d | null>(null)

const openFacturaDetalle = (factura: Factura3d) => {
  selectedFactura.value = factura
  detalleDialogOpen.value = true
}

// ─── State - Selector de Mes ─────────────────────────────────────────────────
const now = new Date()
const selectedYear = ref(now.getFullYear())
const selectedMonth = ref(now.getMonth() + 1) // 1-12
const isLoading = ref(false)

// ─── State - Datos del Reporte ────────────────────────────────────────────────
const dailyData = ref<ReporteDiario[]>([])
const topClientes = ref<TopCliente[]>([])
const facturasPendientes = ref<Factura3d[]>([])

// ─── Opciones de Mes ─────────────────────────────────────────────────────────
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
  return [current - 1, current, current + 1].map(y => ({ value: y, title: String(y) }))
})

const selectedMonthLabel = computed(() => {
  return monthOptions.find(m => m.value === selectedMonth.value)?.title || ''
})

// ─── KPIs Calculados ─────────────────────────────────────────────────────────
const kpiTotal = computed(() => dailyData.value.reduce((s, d) => s + d.total, 0))
const kpiPeso = computed(() => dailyData.value.reduce((s, d) => s + d.peso, 0))
const kpiFacturas = computed(() => dailyData.value.reduce((s, d) => s + d.cantidad, 0))
const kpiPendiente = computed(() => facturasPendientes.value.reduce((s, f) => s + Number(f.total || 0), 0))

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const [year, month, day] = dateStr.substring(0, 10).split('-')
  return `${day}/${month}/${year}`
}

// ─── Fetch Reporte ────────────────────────────────────────────────────────────
const fetchReporte = async () => {
  isLoading.value = true
  try {
    const result = await store.fetchReporteMensual(selectedYear.value, selectedMonth.value)
    dailyData.value = result.dailyData
    topClientes.value = result.topClientes
    facturasPendientes.value = result.facturasPendientes
  }
  catch (error) {
    console.error('Error cargando reporte:', error)
  }
  finally {
    isLoading.value = false
  }
}

watch([selectedYear, selectedMonth], () => {
  fetchReporte()
})

onMounted(() => {
  isMounted.value = true
  fetchReporte()
})

// ─── ApexCharts: Gráfica de Ventas Diarias ────────────────────────────────────
const chartVentasSeries = computed(() => [{
  name: 'Facturado ($)',
  data: dailyData.value.map(d => d.total),
}])

const chartVentasOptions = computed(() => ({
  chart: {
    height: 300,
    type: 'area',
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: 'Public Sans, sans-serif',
  },
  stroke: { width: 3, curve: 'smooth' },
  colors: ['#7C4DFF'],
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.45,
      opacityTo: 0.02,
      stops: [0, 90, 100],
    },
  },
  markers: {
    size: 5,
    colors: ['#7C4DFF'],
    hover: { size: 7 },
  },
  xaxis: {
    categories: dailyData.value.map(d => {
      const day = d.fecha.split('-')[2]
      return `${day}/${d.fecha.split('-')[1]}`
    }),
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { fontSize: '11px' } },
  },
  yaxis: {
    labels: { formatter: (val: number) => `$${(val / 1000).toFixed(0)}k` },
  },
  tooltip: {
    theme: 'dark',
    y: { formatter: (val: number) => formatCurrency(val) },
  },
  grid: {
    borderColor: 'rgba(255,255,255,0.08)',
    strokeDashArray: 4,
  },
  dataLabels: { enabled: false },
}))

// ─── ApexCharts: Gráfica de Peso Diario ───────────────────────────────────────
const chartPesoSeries = computed(() => [{
  name: 'Peso Impreso (g)',
  data: dailyData.value.map(d => Math.round(d.peso * 10) / 10),
}])

const chartPesoOptions = computed(() => ({
  chart: {
    height: 300,
    type: 'bar',
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: 'Public Sans, sans-serif',
  },
  plotOptions: {
    bar: {
      columnWidth: '55%',
      borderRadius: 5,
      distributed: false,
    },
  },
  colors: ['#00CFE8'],
  xaxis: {
    categories: dailyData.value.map(d => {
      const day = d.fecha.split('-')[2]
      return `${day}/${d.fecha.split('-')[1]}`
    }),
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { fontSize: '11px' } },
  },
  yaxis: {
    labels: { formatter: (val: number) => `${val} g` },
    min: 0,
  },
  tooltip: {
    theme: 'dark',
    y: { formatter: (val: number) => `${val} gramos impresos` },
  },
  legend: { show: false },
  grid: {
    borderColor: 'rgba(255,255,255,0.08)',
    strokeDashArray: 4,
  },
  dataLabels: { enabled: false },
}))
</script>

<template>
  <section>
    <!-- ── Encabezado ── -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h4 class="text-h4 font-weight-bold d-flex align-center gap-2">
          <VIcon icon="tabler-chart-area-line" color="primary" size="28" />
          Informe Mensual — Impresiones 3D
        </h4>
        <p class="text-body-1 text-disabled mb-0">
          Análisis de ventas y peso impreso por día en el mes seleccionado
        </p>
      </div>

      <!-- Selector de Mes/Año -->
      <div class="d-flex align-center gap-3">
        <AppSelect
          v-model="selectedMonth"
          :items="monthOptions"
          density="compact"
          style="min-width: 140px;"
        />
        <AppSelect
          v-model="selectedYear"
          :items="yearOptions"
          density="compact"
          style="min-width: 100px;"
        />
        <VBtn
          color="primary"
          variant="tonal"
          icon="tabler-refresh"
          size="small"
          :loading="isLoading"
          @click="fetchReporte"
        />
      </div>
    </div>

    <!-- ── Banner de resumen del mes ── -->
    <VCard
      class="mb-6 overflow-hidden"
      style="background: linear-gradient(135deg, #1a0a2e 0%, #1e1040 60%, #160d30 100%); border-bottom: 3px solid #7C4DFF;"
      elevation="3"
    >
      <VCardText class="pa-5">
        <div class="d-flex align-center justify-space-between flex-wrap gap-4">
          <div>
            <div class="d-flex align-center gap-2 mb-2">
              <VChip size="small" color="primary" variant="flat" class="font-weight-bold">
                IMPRESIONES 3D
              </VChip>
              <span class="text-caption text-disabled">Período analizado</span>
            </div>
            <h3 class="text-h3 font-weight-bold text-white mb-1">
              {{ selectedMonthLabel }} {{ selectedYear }}
            </h3>
            <p class="text-body-1 mb-0" style="color: rgba(255,255,255,0.65)">
              {{ kpiFacturas }} facturas · {{ kpiPeso.toFixed(1) }} g impresos en total
            </p>
          </div>
          <div class="d-flex align-center gap-3">
            <div class="text-end">
              <div class="text-caption text-disabled mb-1">
                Total Facturado
              </div>
              <div class="text-h3 font-weight-bold text-white">
                {{ formatCurrency(kpiTotal) }}
              </div>
            </div>
            <VAvatar color="primary" variant="tonal" size="56" rounded="lg">
              <VIcon icon="tabler-printer" size="30" />
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
              <span class="text-caption text-uppercase font-weight-bold text-disabled">
                Total Vendido
              </span>
              <VAvatar color="primary" variant="tonal" size="38" rounded="lg">
                <VIcon icon="tabler-currency-dollar" size="20" />
              </VAvatar>
            </div>
            <div v-if="isLoading" class="d-flex align-center py-2">
              <VProgressCircular indeterminate size="20" width="2" color="primary" />
            </div>
            <h4 v-else class="text-h4 font-weight-bold text-primary">
              {{ formatCurrency(kpiTotal) }}
            </h4>
            <div class="text-xs text-disabled mt-2">
              En {{ selectedMonthLabel }}
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" sm="6" md="3">
        <VCard elevation="2" class="kpi-card">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-uppercase font-weight-bold text-disabled">
                Peso Impreso
              </span>
              <VAvatar color="info" variant="tonal" size="38" rounded="lg">
                <VIcon icon="tabler-weight" size="20" />
              </VAvatar>
            </div>
            <div v-if="isLoading" class="d-flex align-center py-2">
              <VProgressCircular indeterminate size="20" width="2" color="info" />
            </div>
            <h4 v-else class="text-h4 font-weight-bold text-info">
              {{ kpiPeso.toFixed(1) }} g
            </h4>
            <div class="text-xs text-disabled mt-2">
              Gramos impresos en el mes
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" sm="6" md="3">
        <VCard elevation="2" class="kpi-card">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-uppercase font-weight-bold text-disabled">
                N° de Facturas
              </span>
              <VAvatar color="success" variant="tonal" size="38" rounded="lg">
                <VIcon icon="tabler-receipt" size="20" />
              </VAvatar>
            </div>
            <div v-if="isLoading" class="d-flex align-center py-2">
              <VProgressCircular indeterminate size="20" width="2" color="success" />
            </div>
            <h4 v-else class="text-h4 font-weight-bold text-success">
              {{ kpiFacturas }}
            </h4>
            <div class="text-xs text-disabled mt-2">
              Facturas emitidas
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <VCol cols="12" sm="6" md="3">
        <VCard elevation="2" class="kpi-card">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-uppercase font-weight-bold text-disabled">
                Pendiente de Cobro
              </span>
              <VAvatar color="warning" variant="tonal" size="38" rounded="lg">
                <VIcon icon="tabler-clock-dollar" size="20" />
              </VAvatar>
            </div>
            <div v-if="isLoading" class="d-flex align-center py-2">
              <VProgressCircular indeterminate size="20" width="2" color="warning" />
            </div>
            <h4 v-else class="text-h4 font-weight-bold text-warning">
              {{ formatCurrency(kpiPendiente) }}
            </h4>
            <div class="text-xs text-disabled mt-2">
              {{ facturasPendientes.length }} facturas sin cobrar
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- ── Gráficas ── -->
    <VRow class="mb-6">
      <!-- Gráfica 1: Ventas Diarias -->
      <VCol cols="12" md="6">
        <VCard elevation="2">
          <VCardItem class="pb-2">
            <div class="d-flex align-center justify-space-between">
              <div>
                <VCardTitle class="text-h6 font-weight-bold d-flex align-center gap-2">
                  <VIcon icon="tabler-chart-area-line" color="primary" size="22" />
                  Ventas Diarias ($)
                </VCardTitle>
                <VCardSubtitle>Monto facturado cada día del mes</VCardSubtitle>
              </div>
              <VChip color="primary" variant="tonal" size="small" class="font-weight-bold">
                {{ formatCurrency(kpiTotal) }}
              </VChip>
            </div>
          </VCardItem>

          <VCardText class="pt-2">
            <div v-if="isLoading || !isMounted" class="d-flex justify-center align-center py-10">
              <VProgressCircular indeterminate color="primary" size="48" />
            </div>
            <div v-else-if="dailyData.length === 0" class="d-flex flex-column align-center justify-center py-10">
              <VIcon icon="tabler-chart-off" size="52" class="text-disabled mb-3" />
              <p class="text-disabled text-body-2">
                Sin datos para este mes
              </p>
            </div>
            <VueApexCharts
              v-else
              :options="chartVentasOptions"
              :series="chartVentasSeries"
              height="300"
            />
          </VCardText>
        </VCard>
      </VCol>

      <!-- Gráfica 2: Peso Diario -->
      <VCol cols="12" md="6">
        <VCard elevation="2">
          <VCardItem class="pb-2">
            <div class="d-flex align-center justify-space-between">
              <div>
                <VCardTitle class="text-h6 font-weight-bold d-flex align-center gap-2">
                  <VIcon icon="tabler-weight" color="info" size="22" />
                  Peso Impreso por Día (g)
                </VCardTitle>
                <VCardSubtitle>Gramos impresos cada día del mes</VCardSubtitle>
              </div>
              <VChip color="info" variant="tonal" size="small" class="font-weight-bold">
                {{ kpiPeso.toFixed(1) }} g
              </VChip>
            </div>
          </VCardItem>

          <VCardText class="pt-2">
            <div v-if="isLoading || !isMounted" class="d-flex justify-center align-center py-10">
              <VProgressCircular indeterminate color="info" size="48" />
            </div>
            <div v-else-if="dailyData.length === 0" class="d-flex flex-column align-center justify-center py-10">
              <VIcon icon="tabler-chart-off" size="52" class="text-disabled mb-3" />
              <p class="text-disabled text-body-2">
                Sin datos para este mes
              </p>
            </div>
            <VueApexCharts
              v-else
              :options="chartPesoOptions"
              :series="chartPesoSeries"
              height="300"
            />
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- ── Tabla: Top Clientes + Facturas Pendientes ── -->
    <VRow>
      <!-- Top Clientes -->
      <VCol cols="12" md="6">
        <VCard elevation="2">
          <VCardItem>
            <VCardTitle class="text-h6 font-weight-bold d-flex align-center gap-2">
              <VIcon icon="tabler-users-group" color="success" size="22" />
              Top Clientes del Mes
            </VCardTitle>
            <VCardSubtitle>Clientes con mayor facturación en {{ selectedMonthLabel }}</VCardSubtitle>
          </VCardItem>

          <VDivider />

          <VTable class="text-no-wrap">
            <thead>
              <tr>
                <th>#</th>
                <th>CLIENTE</th>
                <th class="text-center">
                  FACTURAS
                </th>
                <th class="text-center">
                  PESO (g)
                </th>
                <th class="text-end">
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(cliente, idx) in topClientes" :key="cliente.cliente_id || idx">
                <td>
                  <VAvatar size="24" color="primary" variant="tonal">
                    <span class="text-xs font-weight-bold">{{ idx + 1 }}</span>
                  </VAvatar>
                </td>
                <td>
                  <div class="d-flex align-center gap-2">
                    <VAvatar size="28" color="primary" variant="tonal">
                      <span class="text-xs font-weight-bold">
                        {{ cliente.nombre.charAt(0) }}{{ cliente.apellido.charAt(0) }}
                      </span>
                    </VAvatar>
                    <span class="font-weight-medium text-body-2">
                      {{ cliente.nombre }} {{ cliente.apellido }}
                    </span>
                  </div>
                </td>
                <td class="text-center">
                  <VChip size="x-small" color="info" variant="tonal" class="font-weight-bold">
                    {{ cliente.totalFacturas }}
                  </VChip>
                </td>
                <td class="text-center font-weight-medium text-info">
                  {{ cliente.totalPeso.toFixed(1) }} g
                </td>
                <td class="text-end font-weight-bold text-success">
                  {{ formatCurrency(cliente.totalMonto) }}
                </td>
              </tr>
              <tr v-if="topClientes.length === 0">
                <td colspan="5" class="text-center py-6 text-disabled">
                  <VIcon icon="tabler-users-minus" size="32" class="mb-2 d-block mx-auto text-disabled" />
                  Sin datos de clientes para este mes
                </td>
              </tr>
            </tbody>
          </VTable>
        </VCard>
      </VCol>

      <!-- Facturas Pendientes del Mes -->
      <VCol cols="12" md="6">
        <VCard elevation="2">
          <VCardItem>
            <div class="d-flex align-center justify-space-between">
              <div>
                <VCardTitle class="text-h6 font-weight-bold d-flex align-center gap-2">
                  <VIcon icon="tabler-clock-dollar" color="warning" size="22" />
                  Facturas Pendientes
                </VCardTitle>
                <VCardSubtitle>Sin cobrar en {{ selectedMonthLabel }}</VCardSubtitle>
              </div>
              <VChip
                v-if="facturasPendientes.length > 0"
                color="warning"
                variant="tonal"
                size="small"
                class="font-weight-bold"
              >
                {{ formatCurrency(kpiPendiente) }}
              </VChip>
            </div>
          </VCardItem>

          <VDivider />

          <VTable class="text-no-wrap">
            <thead>
              <tr>
                <th>N°</th>
                <th>FECHA</th>
                <th>CLIENTE</th>
                <th class="text-center">
                  PESO
                </th>
                <th class="text-end">
                  TOTAL
                </th>
                <th class="text-center">
                  VER
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="factura in facturasPendientes"
                :key="factura.id"
                style="cursor: pointer;"
                @click="openFacturaDetalle(factura)"
              >
                <td>
                  <span class="font-weight-bold text-primary" style="font-family: monospace; font-size: 12px;">
                    #{{ String(factura.numero || 0).padStart(4, '0') }}
                  </span>
                </td>
                <td class="text-body-2">
                  {{ formatDate(factura.fecha) }}
                </td>
                <td class="text-body-2">
                  {{ factura.cliente ? `${factura.cliente.nombre} ${factura.cliente.apellido}` : 'Sin asignar' }}
                </td>
                <td class="text-center font-weight-medium text-info">
                  {{ Number(factura.peso_total || 0).toFixed(1) }} g
                </td>
                <td class="text-end font-weight-bold text-warning">
                  {{ formatCurrency(factura.total) }}
                </td>
                <td class="text-center" @click.stop>
                  <IconBtn color="info" size="small" title="Ver e Imprimir Factura" @click="openFacturaDetalle(factura)">
                    <VIcon icon="tabler-printer" size="18" />
                  </IconBtn>
                </td>
              </tr>
              <tr v-if="facturasPendientes.length === 0">
                <td colspan="6" class="text-center py-6">
                  <VIcon icon="tabler-circle-check" size="32" color="success" class="mb-2 d-block mx-auto" />
                  <span class="text-success text-body-2 font-weight-medium">
                    ¡Todo cobrado! Sin pendientes este mes
                  </span>
                </td>
              </tr>
            </tbody>
          </VTable>
        </VCard>
      </VCol>
    </VRow>

    <!-- ── Diálogo Detalle Factura e Impresión ── -->
    <DetalleFactura3dDialog
      v-model:is-dialog-visible="detalleDialogOpen"
      :factura="selectedFactura"
    />
  </section>
</template>

<style scoped>
.kpi-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08) !important;
}
.kpi-card:hover {
  transform: translateY(-3px);
}

:deep(.apexcharts-tooltip) {
  background: #1a0a2e !important;
  border: 1px solid rgba(124, 77, 255, 0.4) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6) !important;
}
:deep(.apexcharts-tooltip-title) {
  background: #1e1040 !important;
  border-bottom: 1px solid rgba(124, 77, 255, 0.3) !important;
  color: #b39ddb !important;
  font-weight: bold !important;
}
:deep(.apexcharts-tooltip-text-y-value),
:deep(.apexcharts-tooltip-text-y-label),
:deep(.apexcharts-tooltip-text) {
  color: #ffffff !important;
}
</style>

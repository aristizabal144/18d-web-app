<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/utils/supabase'

// 👉 State - Client Mounted Flag
const isMounted = ref(false)
const isLoading = ref(true)

// 👉 State - KPIs Financieros y Operativos
const metrics = ref({
  facturacionSemana: 0,
  facturacionMes: 0,
  gramosEntregadosSemana: 0,
  gramosEntregadosMes: 0,
  pedidosEntregadosSemana: 0,
  pedidosEnProceso: 0,
  gastosSemana: 0,
  gastosMes: 0,
  arreglosSemana: 0,
  cantidadArreglosSemana: 0,
  valesPendientesTotal: 0,
  cantidadValesPendientes: 0,
  totalClientes: 0,
})

// 👉 State - Datos Diarios de la Semana (Lunes a Domingo)
const weeklyDaysData = ref([
  { day: 'Lun', entregados: 0, gramos: 0, facturado: 0 },
  { day: 'Mar', entregados: 0, gramos: 0, facturado: 0 },
  { day: 'Mié', entregados: 0, gramos: 0, facturado: 0 },
  { day: 'Jue', entregados: 0, gramos: 0, facturado: 0 },
  { day: 'Vie', entregados: 0, gramos: 0, facturado: 0 },
  { day: 'Sáb', entregados: 0, gramos: 0, facturado: 0 },
  { day: 'Dom', entregados: 0, gramos: 0, facturado: 0 },
])

// 👉 State - Pedidos Entregados de la Semana
interface PedidoEntregadoItem {
  id: string
  referencia: string
  titulo: string
  fecha_entregado: string
  estado: string
  total_pedido: number
  peso: number
  cliente?: { nombre: string; apellido: string }
  color_oro?: { nombre: string }
}
const pedidosEntregadosSemana = ref<PedidoEntregadoItem[]>([])

// 👉 Helpers de Formato
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0)
}

const formatGrams = (value: number) => {
  return `${Number(value || 0).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} gr`
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const [year, month, day] = dateStr.substring(0, 10).split('-')
  return `${day}/${month}/${year}`
}

// Helper para obtener fecha de entrega de un pedido
const getPedidoDeliveryDate = (p: any): string => {
  const d = p.fecha_entregado || p.fecha_fin || p.created_at
  return d ? d.substring(0, 10) : ''
}

// 👉 Rango de Fechas de la Semana Actual (Lunes a Domingo)
const getWeekRange = () => {
  const now = new Date()
  const currentDay = now.getDay() // 0: Dom, 1: Lun, ...
  const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay

  const monday = new Date(now)
  monday.setDate(now.getDate() + distanceToMon)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  return { monday, sunday, startOfMonth, endOfMonth }
}

// 👉 Fetch Dashboard Data
const fetchDashboardData = async () => {
  isLoading.value = true
  try {
    const { monday, sunday, startOfMonth, endOfMonth } = getWeekRange()
    const monStr = monday.toISOString().substring(0, 10)
    const sunStr = sunday.toISOString().substring(0, 10)
    const monthStartStr = startOfMonth.toISOString().substring(0, 10)
    const monthEndStr = endOfMonth.toISOString().substring(0, 10)

    // 1. Fetch Todos los Pedidos con joins completos
    const allPedidosRes = await supabase
      .from('pedidos')
      .select('id, referencia, titulo, fecha_inicio, fecha_fin, fecha_entregado, total_pedido, peso, peso_final, estado, created_at, color_id, cliente:profiles!pedidos_cliente_id_fkey(nombre, apellido), color_oro:colores_oro(nombre)')
      .order('created_at', { ascending: false })

    const allPedidos = allPedidosRes.data || []

    // Pedidos Entregados esta semana (basado estrictamente en la fecha que se entregó)
    const pedidosEntregadosSemanaList = allPedidos.filter(p => {
      if (p.estado !== 'entregado') return false
      const delDate = getPedidoDeliveryDate(p)
      return delDate >= monStr && delDate <= sunStr
    })

    // Guardar lista para la tabla de pedidos entregados en la semana
    pedidosEntregadosSemana.value = pedidosEntregadosSemanaList.map((p: any) => ({
      id: p.id,
      referencia: p.referencia,
      titulo: p.titulo,
      fecha_entregado: p.fecha_entregado || p.fecha_fin || p.created_at,
      estado: p.estado,
      total_pedido: Number(p.total_pedido || 0),
      peso: Number(p.peso_final ?? p.peso ?? 0),
      cliente: p.cliente ? { nombre: p.cliente.nombre, apellido: p.cliente.apellido } : undefined,
      color_oro: p.color_oro ? { nombre: p.color_oro.nombre } : undefined,
    }))

    // Pedidos Entregados este mes
    const pedidosEntregadosMesList = allPedidos.filter(p => {
      if (p.estado !== 'entregado') return false
      const delDate = getPedidoDeliveryDate(p)
      return delDate >= monthStartStr && delDate <= monthEndStr
    })

    // Facturación ($) - Solo pedidos en estado ENTREGADO por fecha de entrega
    metrics.value.facturacionSemana = pedidosEntregadosSemanaList.reduce((sum, p) => sum + Number(p.total_pedido || 0), 0)
    metrics.value.facturacionMes = pedidosEntregadosMesList.reduce((sum, p) => sum + Number(p.total_pedido || 0), 0)

    // Gramos Entregados (según fecha de entrega)
    metrics.value.gramosEntregadosSemana = pedidosEntregadosSemanaList.reduce((sum, p) => sum + Number(p.peso_final ?? p.peso ?? 0), 0)
    metrics.value.gramosEntregadosMes = pedidosEntregadosMesList.reduce((sum, p) => sum + Number(p.peso_final ?? p.peso ?? 0), 0)

    // Entregas de la Semana
    metrics.value.pedidosEntregadosSemana = pedidosEntregadosSemanaList.length

    // Pedidos en Proceso
    metrics.value.pedidosEnProceso = allPedidos.filter(p => p.estado !== 'entregado' && p.estado !== 'cancelado').length

    // 2. Datos Diarios de la Semana (Lunes a Domingo) por Fecha de Entrega
    const daysArr = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    const newWeeklyData = daysArr.map((d, index) => {
      const targetDate = new Date(monday)
      targetDate.setDate(monday.getDate() + index)
      const targetStr = targetDate.toISOString().substring(0, 10)

      // Fabricaciones entregadas este día exacto
      const entregadosDia = allPedidos.filter(p => {
        if (p.estado !== 'entregado') return false
        return getPedidoDeliveryDate(p) === targetStr
      })

      const countEntregados = entregadosDia.length
      const gramosDia = entregadosDia.reduce((sum, p) => sum + Number(p.peso_final ?? p.peso ?? 0), 0)

      // Facturado este día (solo pedidos entregados este día)
      const facturadoDia = entregadosDia.reduce((sum, p) => sum + Number(p.total_pedido || 0), 0)

      return {
        day: d,
        entregados: countEntregados,
        gramos: Math.round(gramosDia * 10) / 10,
        facturado: facturadoDia,
      }
    })
    weeklyDaysData.value = newWeeklyData

    // 3. Fetch Gastos
    const [gastosSemanaRes, gastosMesRes] = await Promise.all([
      supabase.from('gastos').select('valor').gte('fecha', monStr).lte('fecha', sunStr),
      supabase.from('gastos').select('valor').gte('fecha', monthStartStr).lte('fecha', monthEndStr),
    ])
    metrics.value.gastosSemana = (gastosSemanaRes.data || []).reduce((sum, g) => sum + Number(g.valor || 0), 0)
    metrics.value.gastosMes = (gastosMesRes.data || []).reduce((sum, g) => sum + Number(g.valor || 0), 0)

    // 4. Fetch Arreglos
    const arreglosSemanaRes = await supabase.from('arreglos').select('valor, cantidad').gte('fecha', monStr).lte('fecha', sunStr)
    const arreglosData = arreglosSemanaRes.data || []
    metrics.value.arreglosSemana = arreglosData.reduce((sum, a) => sum + Number(a.valor || 0), 0)
    metrics.value.cantidadArreglosSemana = arreglosData.length

    // 5. Fetch Vales Pendientes
    const valesRes = await supabase.from('vales').select('saldo_pendiente, monto_total, monto_abonado, estado').neq('estado', 'cancelado')
    const valesData = valesRes.data || []
    metrics.value.valesPendientesTotal = valesData.reduce((sum, v) => sum + Number(v.saldo_pendiente ?? (v.monto_total - v.monto_abonado)), 0)
    metrics.value.cantidadValesPendientes = valesData.length

    // 6. Total Clientes
    const clientesRes = await supabase.from('profiles').select('id', { count: 'exact' }).eq('rol_id', 3)
    metrics.value.totalClientes = clientesRes.count || 0

  } catch (error) {
    console.error('Error cargando métricas del dashboard:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  isMounted.value = true
  fetchDashboardData()
})

// 👉 Balance Operativo Semanal
const balanceSemanal = computed(() => {
  return (metrics.value.facturacionSemana + metrics.value.arreglosSemana) - metrics.value.gastosSemana
})

// 👉 1. Configuración ApexCharts: Gráfico de FACTURACIÓN SEMANAL ($)
const chartFacturacionSeries = computed(() => [
  {
    name: 'Facturación ($)',
    data: weeklyDaysData.value.map(d => d.facturado),
  },
])

const chartFacturacionOptions = computed(() => {
  return {
    chart: {
      height: 320,
      type: 'area',
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'Public Sans, sans-serif',
    },
    stroke: {
      width: 3,
      curve: 'smooth',
    },
    colors: ['#28C76F'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.5,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    markers: {
      size: 5,
      colors: ['#28C76F'],
      hover: { size: 7 },
    },
    xaxis: {
      categories: weeklyDaysData.value.map(d => d.day),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => `$${(val / 1000).toFixed(0)}k`,
      },
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val: number) => formatCurrency(val),
      },
    },
    grid: {
      borderColor: 'rgba(255, 255, 255, 0.08)',
      strokeDashArray: 4,
    },
  }
})

// 👉 2. Configuración ApexCharts: Gráfico de GRAMOS DE ORO ENTREGADOS DÍA POR DÍA (gr)
const chartGramosSeries = computed(() => [
  {
    name: 'Gramos Entregados (gr)',
    data: weeklyDaysData.value.map(d => d.gramos),
  },
])

const chartGramosOptions = computed(() => {
  return {
    chart: {
      height: 320,
      type: 'bar',
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'Public Sans, sans-serif',
    },
    plotOptions: {
      bar: {
        columnWidth: '45%',
        borderRadius: 6,
        distributed: true,
      },
    },
    colors: ['#C9A84C', '#E6CA65', '#D1D5DB', '#E8A598', '#3B82F6', '#28C76F', '#9CA3AF'],
    xaxis: {
      categories: weeklyDaysData.value.map(d => d.day),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => `${val} g`,
      },
      min: 0,
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val: number) => `${val} gr de oro entregados`,
      },
    },
    legend: { show: false },
    grid: {
      borderColor: 'rgba(255, 255, 255, 0.08)',
      strokeDashArray: 4,
    },
  }
})

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case 'entregado': return 'success'
    case 'en_fabricacion':
    case 'taller': return 'warning'
    case 'diseño':
    case 'diseno': return 'info'
    case 'listo':
    case 'por_entregar': return 'primary'
    case 'cancelado': return 'error'
    default: return 'secondary'
  }
}
</script>

<template>
  <VRow>
    <!-- 👉 Banner de Bienvenida & Resumen Ejecutivo -->
    <VCol cols="12">
      <VCard
        class="position-relative overflow-hidden"
        style="background: linear-gradient(135deg, #181612 0%, #2A2518 100%); border-bottom: 3px solid #C9A84C;"
      >
        <VCardText class="d-flex flex-sm-row flex-column justify-space-between align-center pa-6">
          <div>
            <div class="d-flex align-center gap-2 mb-2">
              <VChip size="small" color="primary" variant="flat" class="font-weight-bold">
                18D JOYEROS
              </VChip>
              <span class="text-caption text-disabled">Panel de Control & Métricas Semanales</span>
            </div>
            <h3 class="text-h3 font-weight-bold text-white mb-2">
              Métricas y Rendimiento del Negocio 💎
            </h3>
            <p class="text-body-1 mb-0 text-medium-emphasis style-subtitle">
              Seguimiento en tiempo real de facturación diaria y gramos de oro entregados por día.
            </p>
          </div>

          <div class="d-flex align-center gap-4 mt-4 mt-sm-0">
            <VBtn
              color="primary"
              prepend-icon="tabler-refresh"
              variant="tonal"
              size="small"
              :loading="isLoading"
              @click="fetchDashboardData"
            >
              Actualizar
            </VBtn>
            <VAvatar color="primary" variant="tonal" size="54" rounded="lg">
              <VIcon icon="tabler-diamond" size="32" />
            </VAvatar>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- 👉 SINGLE ROW EXECUTIVE DASHBOARD CARDS (5 Cards en una sola fila) -->
    <VCol cols="12">
      <div class="kpi-single-row">
        <!-- 1. Facturación Semanal -->
        <VCard elevation="2" class="kpi-card flex-grow-1">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-uppercase font-weight-bold text-disabled">Facturación Semanal</span>
              <VAvatar color="success" variant="tonal" size="36" rounded="lg">
                <VIcon icon="tabler-currency-dollar" size="20" />
              </VAvatar>
            </div>
            <h4 class="text-h4 font-weight-bold text-success mb-1">
              <VProgressCircular v-if="isLoading" indeterminate size="18" width="2" color="success" />
              <span v-else>{{ formatCurrency(metrics.facturacionSemana) }}</span>
            </h4>
            <div class="d-flex align-center justify-space-between text-xs mt-2 pt-2 border-t">
              <span class="text-disabled">Mes: <strong>{{ formatCurrency(metrics.facturacionMes) }}</strong></span>
            </div>
          </VCardText>
        </VCard>

        <!-- 2. Gramos Entregados Semanales -->
        <VCard elevation="2" class="kpi-card flex-grow-1">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-uppercase font-weight-bold text-disabled">Gramos Entregados</span>
              <VAvatar color="info" variant="tonal" size="36" rounded="lg">
                <VIcon icon="tabler-scale" size="20" />
              </VAvatar>
            </div>
            <h4 class="text-h4 font-weight-bold text-info mb-1">
              <VProgressCircular v-if="isLoading" indeterminate size="18" width="2" color="info" />
              <span v-else>{{ formatGrams(metrics.gramosEntregadosSemana) }}</span>
            </h4>
            <div class="d-flex align-center justify-space-between text-xs mt-2 pt-2 border-t">
              <span class="text-disabled">Mes: <strong>{{ formatGrams(metrics.gramosEntregadosMes) }}</strong></span>
            </div>
          </VCardText>
        </VCard>

        <!-- 3. Entregas de la Semana -->
        <VCard elevation="2" class="kpi-card flex-grow-1">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-uppercase font-weight-bold text-disabled">Entregas de la Semana</span>
              <VAvatar color="primary" variant="tonal" size="36" rounded="lg">
                <VIcon icon="tabler-package-export" size="20" />
              </VAvatar>
            </div>
            <h4 class="text-h4 font-weight-bold text-primary mb-1">
              <VProgressCircular v-if="isLoading" indeterminate size="18" width="2" color="primary" />
              <span v-else>{{ metrics.pedidosEntregadosSemana }} entregas</span>
            </h4>
            <div class="d-flex align-center justify-space-between text-xs mt-2 pt-2 border-t">
              <span class="text-disabled">En Proceso: <strong>{{ metrics.pedidosEnProceso }}</strong></span>
            </div>
          </VCardText>
        </VCard>

        <!-- 4. Arreglos de Taller -->
        <VCard elevation="2" class="kpi-card flex-grow-1">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-uppercase font-weight-bold text-disabled">Arreglos Semanales</span>
              <VAvatar color="warning" variant="tonal" size="36" rounded="lg">
                <VIcon icon="tabler-tools" size="20" />
              </VAvatar>
            </div>
            <h4 class="text-h4 font-weight-bold text-warning mb-1">
              <VProgressCircular v-if="isLoading" indeterminate size="18" width="2" color="warning" />
              <span v-else>{{ formatCurrency(metrics.arreglosSemana) }}</span>
            </h4>
            <div class="d-flex align-center justify-space-between text-xs mt-2 pt-2 border-t">
              <span class="text-disabled">Servicios: <strong>{{ metrics.cantidadArreglosSemana }}</strong></span>
            </div>
          </VCardText>
        </VCard>

        <!-- 5. Vales / Deuda Pendiente -->
        <VCard elevation="2" class="kpi-card flex-grow-1">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-uppercase font-weight-bold text-disabled">Vales Pendientes</span>
              <VAvatar color="error" variant="tonal" size="36" rounded="lg">
                <VIcon icon="tabler-receipt-refund" size="20" />
              </VAvatar>
            </div>
            <h4 class="text-h4 font-weight-bold text-error mb-1">
              <VProgressCircular v-if="isLoading" indeterminate size="18" width="2" color="error" />
              <span v-else>{{ formatCurrency(metrics.valesPendientesTotal) }}</span>
            </h4>
            <div class="d-flex align-center justify-space-between text-xs mt-2 pt-2 border-t">
              <span class="text-disabled">Activos: <strong>{{ metrics.cantidadValesPendientes }} vales</strong></span>
            </div>
          </VCardText>
        </VCard>
      </div>
    </VCol>

    <!-- 👉 DOS GRÁFICOS LADO A LADO -->
    <!-- GRÁFICO 1 (IZQUIERDA): FACTURACIÓN SEMANAL POR DÍA ($) -->
    <VCol cols="12" md="6">
      <VCard elevation="2">
        <VCardItem class="pb-2">
          <div class="d-flex align-center justify-space-between flex-wrap gap-2">
            <div>
              <VCardTitle class="text-h5 font-weight-bold d-flex align-center gap-2">
                <VIcon icon="tabler-chart-line" color="success" size="24" />
                Facturación Semanal Día por Día ($)
              </VCardTitle>
              <VCardSubtitle>Monto total facturado por día (por pedidos entregados)</VCardSubtitle>
            </div>
            <VChip color="success" variant="tonal" size="small" class="font-weight-bold">
              {{ formatCurrency(metrics.facturacionSemana) }}
            </VChip>
          </div>
        </VCardItem>

        <VCardText class="pt-4">
          <div v-if="isLoading || !isMounted" class="d-flex justify-center align-center py-12">
            <VProgressCircular indeterminate color="success" size="48" />
          </div>
          <div v-else>
            <VueApexCharts
              :options="chartFacturacionOptions"
              :series="chartFacturacionSeries"
              height="320"
            />
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- GRÁFICO 2 (DERECHA): ORO ENTREGADO SEMANAL DÍA POR DÍA (GR) -->
    <VCol cols="12" md="6">
      <VCard elevation="2">
        <VCardItem class="pb-2">
          <div class="d-flex align-center justify-space-between flex-wrap gap-2">
            <div>
              <VCardTitle class="text-h5 font-weight-bold d-flex align-center gap-2">
                <VIcon icon="tabler-scale" color="primary" size="24" />
                Gramos de Oro Entregados Día por Día (gr)
              </VCardTitle>
              <VCardSubtitle>Total de gramos entregados cada día (por fecha de entrega)</VCardSubtitle>
            </div>
            <VChip color="primary" variant="tonal" size="small" class="font-weight-bold">
              {{ formatGrams(metrics.gramosEntregadosSemana) }}
            </VChip>
          </div>
        </VCardItem>

        <VCardText class="pt-4">
          <div v-if="isLoading || !isMounted" class="d-flex justify-center align-center py-12">
            <VProgressCircular indeterminate color="primary" size="48" />
          </div>
          <div v-else>
            <VueApexCharts
              :options="chartGramosOptions"
              :series="chartGramosSeries"
              height="320"
            />
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- 👉 TABLA: Pedidos Entregados en la Semana -->
    <VCol cols="12" md="8">
      <VCard elevation="2">
        <VCardItem>
          <div class="d-flex align-center justify-space-between">
            <div>
              <VCardTitle class="text-h5 font-weight-bold d-flex align-center gap-2">
                <VIcon icon="tabler-package-check" color="success" size="24" />
                Pedidos Entregados en la Semana
              </VCardTitle>
              <VCardSubtitle>Listado de joyas y productos entregados durante esta semana</VCardSubtitle>
            </div>
            <VBtn
              size="small"
              variant="tonal"
              color="primary"
              to="/apps/pedidos/list"
              prepend-icon="tabler-arrow-right"
            >
              Ver Todos los Pedidos
            </VBtn>
          </div>
        </VCardItem>

        <VDivider />

        <VTable class="text-no-wrap">
          <thead>
            <tr>
              <th>REF / PEDIDO</th>
              <th>CLIENTE</th>
              <th>COLOR ORO</th>
              <th class="text-center">GRAMOS</th>
              <th class="text-center">FECHA DE ENTREGA</th>
              <th class="text-end">VALOR FACTURADO</th>
              <th class="text-center">ESTADO</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in pedidosEntregadosSemana" :key="item.id">
              <td>
                <div class="d-flex flex-column">
                  <span class="font-weight-bold text-primary">{{ item.referencia }}</span>
                  <span class="text-xs text-disabled">{{ item.titulo }}</span>
                </div>
              </td>
              <td>
                <span class="font-weight-medium">
                  {{ item.cliente ? `${item.cliente.nombre} ${item.cliente.apellido}` : 'Sin asignar' }}
                </span>
              </td>
              <td>
                <VChip size="x-small" color="warning" variant="tonal" class="font-weight-bold">
                  {{ item.color_oro?.nombre || 'Normal' }}
                </VChip>
              </td>
              <td class="text-center font-weight-bold text-info">
                {{ formatGrams(item.peso) }}
              </td>
              <td class="text-center">
                <div class="d-flex align-center justify-center gap-1 text-body-2 font-weight-medium">
                  <VIcon icon="tabler-calendar-check" size="14" color="success" />
                  {{ formatDate(item.fecha_entregado) }}
                </div>
              </td>
              <td class="text-end font-weight-bold text-success">
                {{ formatCurrency(item.total_pedido) }}
              </td>
              <td class="text-center">
                <VChip
                  size="small"
                  color="success"
                  variant="flat"
                  class="text-capitalize font-weight-bold"
                >
                  Entregado
                </VChip>
              </td>
            </tr>
            <tr v-if="pedidosEntregadosSemana.length === 0">
              <td colspan="7" class="text-center py-6 text-disabled">
                <VIcon icon="tabler-package-off" size="32" class="mb-1 text-disabled d-block mx-auto" />
                No se han registrado entregas en lo que va de esta semana.
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </VCol>

    <!-- 👉 TARJETAS RESUMEN DE MÓDULOS DE SOPORTE & BALANCE -->
    <VCol cols="12" md="4">
      <VRow>
        <!-- Balance Operativo Semanal -->
        <VCol cols="12">
          <VCard elevation="2">
            <VCardItem class="pb-2">
              <VCardTitle class="text-h6 font-weight-bold d-flex align-center gap-2">
                <VIcon icon="tabler-scale" color="success" size="22" />
                Balance Operativo Semanal
              </VCardTitle>
            </VCardItem>
            <VCardText class="pt-2">
              <VAlert
                :color="balanceSemanal >= 0 ? 'success' : 'error'"
                variant="tonal"
                class="mb-3"
              >
                <div class="d-flex justify-space-between align-center">
                  <span class="text-caption font-weight-bold text-uppercase">Resultado Semanal</span>
                  <span class="text-h6 font-weight-bold">{{ formatCurrency(balanceSemanal) }}</span>
                </div>
              </VAlert>

              <div class="d-flex flex-column gap-2 text-sm">
                <div class="d-flex justify-space-between align-center">
                  <span class="text-disabled d-flex align-center gap-1">
                    <VIcon icon="tabler-plus" size="14" color="success" /> Facturación Pedidos:
                  </span>
                  <span class="font-weight-bold text-success">{{ formatCurrency(metrics.facturacionSemana) }}</span>
                </div>
                <div class="d-flex justify-space-between align-center">
                  <span class="text-disabled d-flex align-center gap-1">
                    <VIcon icon="tabler-plus" size="14" color="warning" /> Ingresos Arreglos:
                  </span>
                  <span class="font-weight-bold text-warning">{{ formatCurrency(metrics.arreglosSemana) }}</span>
                </div>
                <div class="d-flex justify-space-between align-center pb-2 border-b">
                  <span class="text-disabled d-flex align-center gap-1">
                    <VIcon icon="tabler-minus" size="14" color="error" /> Gastos Egresos:
                  </span>
                  <span class="font-weight-bold text-error">-{{ formatCurrency(metrics.gastosSemana) }}</span>
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <!-- Acceso a Módulos -->
        <VCol cols="12">
          <VCard elevation="2">
            <VCardItem>
              <VCardTitle class="text-h6 font-weight-bold d-flex align-center gap-2">
                <VIcon icon="tabler-apps" color="primary" size="22" />
                Acceso a Módulos
              </VCardTitle>
            </VCardItem>
            <VDivider />
            <VList lines="two" class="pa-1">
              <VListItem to="/apps/gastos/list" link>
                <template #prepend>
                  <VAvatar color="error" variant="tonal" rounded="lg" size="34">
                    <VIcon icon="tabler-wallet" size="18" />
                  </VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold text-sm">Gastos</VListItemTitle>
                <VListItemSubtitle class="text-xs">{{ formatCurrency(metrics.gastosMes) }} mes</VListItemSubtitle>
              </VListItem>

              <VListItem to="/apps/vales" link>
                <template #prepend>
                  <VAvatar color="warning" variant="tonal" rounded="lg" size="34">
                    <VIcon icon="tabler-receipt-refund" size="18" />
                  </VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold text-sm">Vales</VListItemTitle>
                <VListItemSubtitle class="text-xs">{{ formatCurrency(metrics.valesPendientesTotal) }} adeudado</VListItemSubtitle>
              </VListItem>

              <VListItem to="/apps/arreglos" link>
                <template #prepend>
                  <VAvatar color="primary" variant="tonal" rounded="lg" size="34">
                    <VIcon icon="tabler-tools" size="18" />
                  </VAvatar>
                </template>
                <VListItemTitle class="font-weight-bold text-sm">Arreglos</VListItemTitle>
                <VListItemSubtitle class="text-xs">{{ metrics.cantidadArreglosSemana }} servicios semana</VListItemSubtitle>
              </VListItem>
            </VList>
          </VCard>
        </VCol>
      </VRow>
    </VCol>
  </VRow>
</template>

<style scoped>
.kpi-single-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  width: 100%;
}

@media (min-width: 960px) {
  .kpi-single-row {
    flex-wrap: nowrap;
  }
}

.kpi-card {
  min-width: 180px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.kpi-card:hover {
  transform: translateY(-3px);
  border-color: rgba(201, 168, 76, 0.4) !important;
}

.style-subtitle {
  color: rgba(255, 255, 255, 0.7);
}

:deep(.apexcharts-tooltip) {
  background: #1e1b16 !important;
  border: 1px solid rgba(201, 168, 76, 0.4) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6) !important;
  backdrop-filter: blur(8px);
}
:deep(.apexcharts-tooltip-title) {
  background: #2a2518 !important;
  border-bottom: 1px solid rgba(201, 168, 76, 0.3) !important;
  color: #c9a84c !important;
  font-weight: bold !important;
}
:deep(.apexcharts-tooltip-text-y-value),
:deep(.apexcharts-tooltip-text-y-label),
:deep(.apexcharts-tooltip-text) {
  color: #ffffff !important;
}
:deep(.apexcharts-xaxistooltip) {
  background: #1e1b16 !important;
  border: 1px solid rgba(201, 168, 76, 0.4) !important;
  color: #ffffff !important;
}
</style>

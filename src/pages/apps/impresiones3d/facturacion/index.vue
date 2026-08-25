<script setup lang="ts">
import { useFacturas3dStore } from '@/views/apps/impresiones3d/useFacturas3dStore'
import type { Factura3d, Factura3dStats } from '@/views/apps/impresiones3d/useFacturas3dStore'
import Factura3dDialog from '@/views/apps/impresiones3d/Factura3dDialog.vue'
import DetalleFactura3dDialog from '@/views/apps/impresiones3d/DetalleFactura3dDialog.vue'

defineOptions({ name: 'Impresiones3dFacturacion' })

// ─── Store ──────────────────────────────────────────────────────────────────
const store = useFacturas3dStore()

// ─── State - Tabla ───────────────────────────────────────────────────────────
const searchQuery = ref('')
const fechaInicio = ref<string | null>(null)
const fechaFin = ref<string | null>(null)
const selectedEstado = ref<string | null>(null)
const itemsPerPage = ref(10)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()

const totalFacturasCount = ref(0)
const facturasList = ref<Factura3d[]>([])
const isLoading = ref(false)

// ─── State - Stats ───────────────────────────────────────────────────────────
const stats = ref<Factura3dStats>({
  totalMes: 0,
  pesoTotalMes: 0,
  cantidadFacturasMes: 0,
  montoPendiente: 0,
  cantidadPendientes: 0,
  totalMesAnterior: 0,
  variacionPorcentaje: 0,
})
const isStatsLoading = ref(false)

// ─── State - Clientes ────────────────────────────────────────────────────────
const clientes = ref<Array<{ id: string; nombre: string; apellido: string }>>([])

// ─── State - Dialogs ─────────────────────────────────────────────────────────
const dialogOpen = ref(false)
const detalleDialogOpen = ref(false)
const selectedFactura = ref<Factura3d | null>(null)

const openDetalle = (factura: Factura3d) => {
  selectedFactura.value = factura
  detalleDialogOpen.value = true
}

// ─── State - Snackbar ────────────────────────────────────────────────────────
const snackbar = ref({ show: false, message: '', color: 'success' })

// ─── Headers ─────────────────────────────────────────────────────────────────
const headers = [
  { title: 'N°', key: 'numero', width: '70px' },
  { title: 'FECHA', key: 'fecha', width: '130px' },
  { title: 'CLIENTE', key: 'cliente', width: '190px', sortable: false },
  { title: 'ÍTEMS', key: 'items', width: '80px', align: 'center' as const, sortable: false },
  { title: 'PESO TOTAL', key: 'peso_total', width: '120px', align: 'center' as const },
  { title: 'TOTAL', key: 'total', width: '160px', align: 'end' as const },
  { title: 'ESTADO', key: 'estado', width: '130px', align: 'center' as const, sortable: false },
  { title: 'ACCIONES', key: 'actions', width: '100px', sortable: false, align: 'center' as const },
]

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

const getClienteName = (factura: Factura3d) => {
  if (factura.cliente) return `${factura.cliente.nombre} ${factura.cliente.apellido}`
  return 'Sin asignar'
}

const mesActualLabel = computed(() => {
  return new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
})

// ─── Fetch Facturas ───────────────────────────────────────────────────────────
const fetchFacturas = async () => {
  isLoading.value = true
  try {
    const { facturas, totalFacturas } = await store.fetchFacturas({
      q: searchQuery.value,
      fechaInicio: fechaInicio.value,
      fechaFin: fechaFin.value,
      estado: selectedEstado.value,
      options: {
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: sortBy.value ? [{ key: sortBy.value, order: orderBy.value }] : [],
      },
    })
    facturasList.value = facturas
    totalFacturasCount.value = totalFacturas
  }
  catch (error) {
    console.error('Error al cargar facturas:', error)
  }
  finally {
    isLoading.value = false
  }
}

// ─── Fetch Stats ──────────────────────────────────────────────────────────────
const loadStats = async () => {
  isStatsLoading.value = true
  try {
    stats.value = await store.fetchStats()
  }
  catch (error) {
    console.error('Error al cargar stats:', error)
  }
  finally {
    isStatsLoading.value = false
  }
}

// ─── Fetch Clientes ───────────────────────────────────────────────────────────
const loadClientes = async () => {
  try {
    clientes.value = await store.fetchClientes()
  }
  catch (error) {
    console.error('Error al cargar clientes:', error)
  }
}

// ─── Watchers ─────────────────────────────────────────────────────────────────
watch([page, itemsPerPage, sortBy, orderBy, searchQuery, fechaInicio, fechaFin, selectedEstado], () => {
  fetchFacturas()
}, { deep: true })

onMounted(() => {
  fetchFacturas()
  loadStats()
  loadClientes()
})

// ─── Crear Factura ────────────────────────────────────────────────────────────
const onSubmitFactura = async (payload: Parameters<typeof store.createFactura>[0]) => {
  try {
    await store.createFactura(payload)
    snackbar.value = { show: true, message: 'Factura creada con éxito', color: 'success' }
    fetchFacturas()
    loadStats()
  }
  catch (error: any) {
    snackbar.value = { show: true, message: error.message || 'Error al crear factura', color: 'error' }
    throw error
  }
}

// ─── Cambiar Estado ───────────────────────────────────────────────────────────
const toggleEstado = async (factura: Factura3d) => {
  const nuevoEstado = factura.estado === 'pendiente' ? 'pagado' : 'pendiente'
  try {
    await store.updateEstado(factura.id, nuevoEstado)
    snackbar.value = {
      show: true,
      message: `Factura marcada como ${nuevoEstado === 'pagado' ? 'pagada ✓' : 'pendiente'}`,
      color: nuevoEstado === 'pagado' ? 'success' : 'warning',
    }
    fetchFacturas()
    loadStats()
  }
  catch (error: any) {
    snackbar.value = { show: true, message: 'Error al cambiar estado', color: 'error' }
  }
}

// ─── Eliminar ────────────────────────────────────────────────────────────────
const deleteFactura = async (id: string) => {
  if (!confirm('¿Estás seguro de que deseas eliminar esta factura?')) return
  try {
    await store.deleteFactura(id)
    snackbar.value = { show: true, message: 'Factura eliminada', color: 'info' }
    fetchFacturas()
    loadStats()
  }
  catch (error: any) {
    snackbar.value = { show: true, message: 'Error al eliminar', color: 'error' }
  }
}

// ─── Limpiar Filtros ──────────────────────────────────────────────────────────
const clearFilters = () => {
  searchQuery.value = ''
  fechaInicio.value = null
  fechaFin.value = null
  selectedEstado.value = null
}

const hasActiveFilters = computed(() =>
  searchQuery.value || fechaInicio.value || fechaFin.value || selectedEstado.value,
)
</script>

<template>
  <section>
    <!-- ── Encabezado ── -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h4 class="text-h4 font-weight-bold d-flex align-center gap-2">
          <VIcon icon="tabler-file-invoice" color="primary" size="28" />
          Facturación 3D
        </h4>
        <p class="text-body-1 text-disabled mb-0">
          Registra y gestiona las facturas de impresión de moldes 3D
        </p>
      </div>

      <VBtn
        color="primary"
        prepend-icon="tabler-plus"
        @click="dialogOpen = true"
      >
        Nueva Factura
      </VBtn>
    </div>

    <!-- ── KPI Cards ── -->
    <VRow class="mb-6">
      <!-- Total Facturado Mes -->
      <VCol cols="12" sm="6" md="3">
        <VCard elevation="2" class="kpi-card">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-uppercase font-weight-bold text-disabled">
                Facturado en {{ mesActualLabel }}
              </span>
              <VAvatar color="success" variant="tonal" size="38" rounded="lg">
                <VIcon icon="tabler-currency-dollar" size="20" />
              </VAvatar>
            </div>
            <h4 class="text-h4 font-weight-bold text-success mb-1">
              <VProgressCircular v-if="isStatsLoading" indeterminate size="18" width="2" color="success" />
              <span v-else>{{ formatCurrency(stats.totalMes) }}</span>
            </h4>
            <div class="d-flex align-center gap-1 text-xs mt-2">
              <VChip
                :color="stats.variacionPorcentaje >= 0 ? 'success' : 'error'"
                variant="tonal"
                size="x-small"
                class="font-weight-bold"
              >
                <VIcon :icon="stats.variacionPorcentaje >= 0 ? 'tabler-trending-up' : 'tabler-trending-down'" size="12" class="me-1" />
                {{ Math.abs(stats.variacionPorcentaje) }}%
              </VChip>
              <span class="text-disabled">vs mes anterior</span>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Peso Total Mes -->
      <VCol cols="12" sm="6" md="3">
        <VCard elevation="2" class="kpi-card">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-uppercase font-weight-bold text-disabled">
                Peso Impreso (mes)
              </span>
              <VAvatar color="info" variant="tonal" size="38" rounded="lg">
                <VIcon icon="tabler-weight" size="20" />
              </VAvatar>
            </div>
            <h4 class="text-h4 font-weight-bold text-info mb-1">
              <VProgressCircular v-if="isStatsLoading" indeterminate size="18" width="2" color="info" />
              <span v-else>{{ stats.pesoTotalMes.toFixed(1) }} g</span>
            </h4>
            <div class="text-xs text-disabled mt-2">
              En {{ stats.cantidadFacturasMes }} facturas del mes
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Facturas Mes -->
      <VCol cols="12" sm="6" md="3">
        <VCard elevation="2" class="kpi-card">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-uppercase font-weight-bold text-disabled">
                Facturas del Mes
              </span>
              <VAvatar color="primary" variant="tonal" size="38" rounded="lg">
                <VIcon icon="tabler-receipt" size="20" />
              </VAvatar>
            </div>
            <h4 class="text-h4 font-weight-bold text-primary mb-1">
              <VProgressCircular v-if="isStatsLoading" indeterminate size="18" width="2" color="primary" />
              <span v-else>{{ stats.cantidadFacturasMes }}</span>
            </h4>
            <div class="text-xs text-disabled mt-2">
              Facturas registradas este mes
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Monto Pendiente -->
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
            <h4 class="text-h4 font-weight-bold text-warning mb-1">
              <VProgressCircular v-if="isStatsLoading" indeterminate size="18" width="2" color="warning" />
              <span v-else>{{ formatCurrency(stats.montoPendiente) }}</span>
            </h4>
            <div class="text-xs text-disabled mt-2">
              {{ stats.cantidadPendientes }} facturas sin cobrar
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- ── Tabla de Facturas ── -->
    <VCard elevation="2">
      <!-- Filtros -->
      <VCardText class="py-4">
        <VRow class="align-center" density="compact">
          <VCol cols="12" sm="2" md="1">
            <AppSelect
              :model-value="itemsPerPage"
              :items="[
                { value: 10, title: '10' },
                { value: 25, title: '25' },
                { value: 50, title: '50' },
              ]"
              density="compact"
              @update:model-value="itemsPerPage = parseInt($event, 10)"
            />
          </VCol>

          <VCol cols="12" sm="4" md="2">
            <AppTextField
              v-model="searchQuery"
              placeholder="Buscar notas..."
              density="compact"
              clearable
              prepend-inner-icon="tabler-search"
            />
          </VCol>

          <VCol cols="12" sm="3" md="2">
            <AppSelect
              v-model="selectedEstado"
              :items="[
                { value: null, title: 'Todos los estados' },
                { value: 'pendiente', title: 'Pendiente' },
                { value: 'pagado', title: 'Pagado' },
              ]"
              placeholder="Estado"
              density="compact"
              clearable
            />
          </VCol>

          <VCol cols="12" sm="3" md="2">
            <AppDateTimePicker
              v-model="fechaInicio"
              placeholder="Fecha Desde"
              density="compact"
              clearable
              :config="{ dateFormat: 'Y-m-d' }"
            />
          </VCol>

          <VCol cols="12" sm="3" md="2">
            <AppDateTimePicker
              v-model="fechaFin"
              placeholder="Fecha Hasta"
              density="compact"
              clearable
              :config="{ dateFormat: 'Y-m-d' }"
            />
          </VCol>

          <VCol cols="12" sm="2" md="1" class="text-end">
            <VBtn
              v-if="hasActiveFilters"
              size="small"
              variant="text"
              color="secondary"
              @click="clearFilters"
            >
              Limpiar
            </VBtn>
          </VCol>
        </VRow>
      </VCardText>

      <VDivider />

      <!-- Tabla -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :items="facturasList"
        :items-length="totalFacturasCount"
        :headers="headers"
        :loading="isLoading"
        class="text-no-wrap"
        @update:options="(options) => {
          page = options.page
          itemsPerPage = options.itemsPerPage
          sortBy = options.sortBy[0]?.key
          orderBy = options.sortBy[0]?.order
        }"
      >
        <!-- Número -->
        <template #item.numero="{ item }">
          <span class="font-weight-bold text-primary" style="font-family: monospace; font-size: 13px;">
            #{{ String(item.numero).padStart(4, '0') }}
          </span>
        </template>

        <!-- Fecha -->
        <template #item.fecha="{ item }">
          <div class="d-flex align-center gap-2">
            <VIcon icon="tabler-calendar" size="16" class="text-disabled" />
            <span class="font-weight-medium text-body-2">{{ formatDate(item.fecha) }}</span>
          </div>
        </template>

        <!-- Cliente -->
        <template #item.cliente="{ item }">
          <div class="d-flex align-center gap-2">
            <VAvatar size="28" color="primary" variant="tonal">
              <span class="text-xs font-weight-bold">
                {{ item.cliente ? item.cliente.nombre.charAt(0) + item.cliente.apellido.charAt(0) : '??' }}
              </span>
            </VAvatar>
            <span class="font-weight-medium text-body-2">{{ getClienteName(item) }}</span>
          </div>
        </template>

        <!-- Ítems -->
        <template #item.items="{ item }">
          <VChip size="small" color="info" variant="tonal" class="font-weight-bold">
            {{ item.items?.length || 0 }} molde{{ (item.items?.length || 0) !== 1 ? 's' : '' }}
          </VChip>
        </template>

        <!-- Peso Total -->
        <template #item.peso_total="{ item }">
          <span class="font-weight-medium text-info">
            {{ Number(item.peso_total || 0).toFixed(1) }} g
          </span>
        </template>

        <!-- Total -->
        <template #item.total="{ item }">
          <span class="font-weight-bold text-body-1 text-success">
            {{ formatCurrency(item.total) }}
          </span>
        </template>

        <!-- Estado -->
        <template #item.estado="{ item }">
          <VChip
            :color="item.estado === 'pagado' ? 'success' : 'warning'"
            variant="flat"
            size="small"
            class="font-weight-bold"
            style="cursor: pointer;"
            :title="`Clic para marcar como ${item.estado === 'pendiente' ? 'pagado' : 'pendiente'}`"
            @click="toggleEstado(item)"
          >
            <VIcon
              :icon="item.estado === 'pagado' ? 'tabler-circle-check' : 'tabler-clock'"
              size="14"
              class="me-1"
            />
            {{ item.estado === 'pagado' ? 'Pagado' : 'Pendiente' }}
          </VChip>
        </template>

        <!-- Acciones -->
        <template #item.actions="{ item }">
          <div class="d-flex align-center gap-1">
            <IconBtn
              color="info"
              title="Ver detalle e imprimir factura"
              @click="openDetalle(item)"
            >
              <VIcon icon="tabler-eye" size="20" />
            </IconBtn>
            <IconBtn
              :color="item.estado === 'pendiente' ? 'success' : 'warning'"
              :title="item.estado === 'pendiente' ? 'Marcar como pagado' : 'Marcar como pendiente'"
              @click="toggleEstado(item)"
            >
              <VIcon :icon="item.estado === 'pendiente' ? 'tabler-circle-check' : 'tabler-rotate-clockwise'" size="20" />
            </IconBtn>
            <IconBtn @click="deleteFactura(item.id)">
              <VIcon icon="tabler-trash" size="20" color="error" />
            </IconBtn>
          </div>
        </template>

        <!-- Empty state -->
        <template #no-data>
          <div class="text-center py-10">
            <VIcon icon="tabler-file-off" size="52" class="text-disabled mb-3" />
            <p class="text-h6 text-disabled mb-1">No hay facturas registradas</p>
            <p class="text-body-2 text-disabled mb-4">
              Crea tu primera factura de impresión 3D
            </p>
            <VBtn
              color="primary"
              prepend-icon="tabler-plus"
              @click="dialogOpen = true"
            >
              Nueva Factura
            </VBtn>
          </div>
        </template>
      </VDataTableServer>
    </VCard>

    <!-- ── Diálogo Nueva Factura ── -->
    <Factura3dDialog
      v-model:is-dialog-visible="dialogOpen"
      :clientes="clientes"
      @submit="onSubmitFactura"
    />

    <!-- ── Diálogo Detalle Factura ── -->
    <DetalleFactura3dDialog
      v-model:is-dialog-visible="detalleDialogOpen"
      :factura="selectedFactura"
    />

    <!-- ── Snackbar ── -->
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
.kpi-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08) !important;
}
.kpi-card:hover {
  transform: translateY(-3px);
}
</style>

<script setup lang="ts">
import { useArreglosStore } from '@/views/apps/arreglos/useArreglosStore'
import type { Arreglo, ArregloStats } from '@/views/apps/arreglos/useArreglosStore'
import ArreglosResumenCards from '@/views/apps/arreglos/ArreglosResumenCards.vue'
import ArregloFormDialog from '@/views/apps/arreglos/ArregloFormDialog.vue'

// 👉 Store
const arreglosStore = useArreglosStore()

// 👉 State - Tabla y Filtros
const searchQuery = ref('')
const fechaInicio = ref<string | null>(null)
const fechaFin = ref<string | null>(null)
const selectedClienteId = ref<string | null>(null)

const itemsPerPage = ref(10)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()

const totalArreglosCount = ref(0)
const arreglosList = ref<Arreglo[]>([])
const isLoading = ref(false)

// 👉 State - Stats
const stats = ref<ArregloStats>({
  totalMesActual: 0,
  totalMesAnterior: 0,
  cantidadArreglosMes: 0,
  cantidadPiezasMes: 0,
  valorPromedioMes: 0,
  totalHistorico: 0,
  variacionPorcentaje: 0,
})
const isStatsLoading = ref(false)

// 👉 State - Clientes
const clientes = ref<Array<{ id: string; nombre: string; apellido: string }>>([])

// 👉 State - Form Dialog
const formDialogOpen = ref(false)
const editingArreglo = ref<Arreglo | null>(null)

// 👉 State - Reporte PDF
const reportDialogOpen = ref(false)
const reportFechaInicio = ref(
  new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
)
const reportFechaFin = ref(new Date().toISOString().split('T')[0])
const reportArreglos = ref<Arreglo[]>([])
const isReportLoading = ref(false)

// 👉 State - Snackbar
const snackbar = ref({ show: false, message: '', color: 'success' })

// 👉 Headers de Tabla
const headers = [
  { title: 'FECHA', key: 'fecha', width: '130px' },
  { title: 'CLIENTE', key: 'cliente', width: '180px', sortable: false },
  { title: 'DESCRIPCIÓN', key: 'descripcion' },
  { title: 'CANTIDAD', key: 'cantidad', width: '110px', align: 'center' as const },
  { title: 'VALOR', key: 'valor', width: '160px', align: 'end' as const },
  { title: 'ACCIONES', key: 'actions', width: '100px', sortable: false, align: 'center' as const },
]

// 👉 Helpers
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

const getClienteName = (arreglo: Arreglo) => {
  if (arreglo.cliente) return `${arreglo.cliente.nombre} ${arreglo.cliente.apellido}`
  return 'Sin asignar'
}

// 👉 Fetch Datos de Tabla
const fetchArreglos = async () => {
  isLoading.value = true
  try {
    const { arreglos, totalArreglos } = await arreglosStore.fetchArreglos({
      q: searchQuery.value,
      fechaInicio: fechaInicio.value,
      fechaFin: fechaFin.value,
      clienteId: selectedClienteId.value,
      options: {
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: sortBy.value ? [{ key: sortBy.value, order: orderBy.value }] : [],
      },
    })
    arreglosList.value = arreglos
    totalArreglosCount.value = totalArreglos
  } catch (error) {
    console.error('Error al cargar arreglos:', error)
  } finally {
    isLoading.value = false
  }
}

// 👉 Fetch Stats
const loadStats = async () => {
  isStatsLoading.value = true
  try {
    stats.value = await arreglosStore.fetchStats()
  } catch (error) {
    console.error('Error al cargar estadísticas:', error)
  } finally {
    isStatsLoading.value = false
  }
}

// 👉 Fetch Clientes
const loadClientes = async () => {
  try {
    clientes.value = await arreglosStore.fetchClientes()
  } catch (error) {
    console.error('Error al cargar clientes:', error)
  }
}

// Watchers
watch([page, itemsPerPage, sortBy, orderBy, searchQuery, fechaInicio, fechaFin, selectedClienteId], () => {
  fetchArreglos()
}, { deep: true })

onMounted(() => {
  fetchArreglos()
  loadStats()
  loadClientes()
})

// 👉 Crear
const openCreateDialog = () => {
  editingArreglo.value = null
  formDialogOpen.value = true
}

// 👉 Editar
const openEditDialog = (arreglo: Arreglo) => {
  editingArreglo.value = { ...arreglo }
  formDialogOpen.value = true
}

// 👉 Guardar (Crear / Editar)
const onSubmitForm = async (payload: { fecha: string; cantidad: number; descripcion: string; valor: number; cliente_id?: string | null }) => {
  try {
    if (editingArreglo.value) {
      await arreglosStore.updateArreglo(editingArreglo.value.id, payload)
      snackbar.value = { show: true, message: 'Arreglo actualizado con éxito', color: 'success' }
    } else {
      await arreglosStore.addArreglo(payload)
      snackbar.value = { show: true, message: 'Arreglo registrado con éxito', color: 'success' }
    }
    fetchArreglos()
    loadStats()
  } catch (error: any) {
    console.error('Error al guardar arreglo:', error)
    snackbar.value = { show: true, message: error.message || 'Error al guardar', color: 'error' }
  }
}

// 👉 Eliminar
const deleteArreglo = async (id: string) => {
  if (confirm('¿Estás seguro de que deseas eliminar este arreglo?')) {
    try {
      await arreglosStore.deleteArreglo(id)
      snackbar.value = { show: true, message: 'Arreglo eliminado correctamente', color: 'info' }
      fetchArreglos()
      loadStats()
    } catch (error: any) {
      console.error('Error al eliminar arreglo:', error)
      snackbar.value = { show: true, message: 'Error al eliminar', color: 'error' }
    }
  }
}

// 👉 Reporte PDF
const loadReportData = async () => {
  if (!reportFechaInicio.value || !reportFechaFin.value) return
  isReportLoading.value = true
  try {
    reportArreglos.value = await arreglosStore.fetchArreglosReport(reportFechaInicio.value, reportFechaFin.value)
  } catch (error) {
    console.error('Error al cargar reporte:', error)
  } finally {
    isReportLoading.value = false
  }
}

const openReportDialog = () => {
  reportDialogOpen.value = true
  loadReportData()
}

const reportTotal = computed(() => {
  return reportArreglos.value.reduce((sum, a) => sum + Number(a.valor || 0), 0)
})

const reportCantidadTotal = computed(() => {
  return reportArreglos.value.reduce((sum, a) => sum + Number(a.cantidad || 1), 0)
})

const printReport = () => {
  const printWindow = window.open('', '_blank', 'width=900,height=800')
  if (!printWindow) return

  const rowsHtml = reportArreglos.value.map((arreglo, index) => `
    <tr>
      <td style="text-align: center;">${index + 1}</td>
      <td style="text-align: center;">${formatDate(arreglo.fecha)}</td>
      <td>${getClienteName(arreglo)}</td>
      <td>${arreglo.descripcion}</td>
      <td style="text-align: center;">${arreglo.cantidad}</td>
      <td style="text-align: right; font-weight: bold;">${formatCurrency(arreglo.valor)}</td>
    </tr>
  `).join('')

  const content = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Reporte de Arreglos - 18D Joyeros</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; margin: 0; padding: 20px; font-size: 13px; line-height: 1.4; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #8b6b15; padding-bottom: 15px; margin-bottom: 20px; }
        .logo-title { font-size: 22px; font-weight: bold; color: #8b6b15; letter-spacing: 1px; }
        .subtitle { font-size: 13px; color: #666; margin-top: 4px; }
        .report-info { text-align: right; font-size: 12px; color: #444; }

        .summary-cards { display: flex; gap: 15px; margin-bottom: 20px; }
        .summary-box { flex: 1; border: 1px solid #e0e0e0; background: #fafafa; border-radius: 6px; padding: 10px 14px; text-align: center; }
        .summary-box .label { font-size: 11px; text-transform: uppercase; color: #666; font-weight: 600; }
        .summary-box .val { font-size: 16px; font-weight: bold; color: #111; margin-top: 4px; }
        .summary-box.total .val { color: #8b6b15; font-size: 18px; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #1e1b16; color: #f5d77f; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #8b6b15; }
        td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
        tr:nth-child(even) { background-color: #fcfcfc; }

        .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; display: flex; justify-content: space-between; font-size: 11px; color: #777; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo-title">18D JOYEROS</div>
          <div class="subtitle">Reporte de Arreglos y Servicios de Taller</div>
        </div>
        <div class="report-info">
          <div><strong>Rango:</strong> ${formatDate(reportFechaInicio.value)} al ${formatDate(reportFechaFin.value)}</div>
          <div><strong>Fecha Impr.:</strong> ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
          <div><strong>Total Regs:</strong> ${reportArreglos.value.length}</div>
        </div>
      </div>

      <div class="summary-cards">
        <div class="summary-box total">
          <div class="label">VALOR TOTAL ARREGLOS</div>
          <div class="val">${formatCurrency(reportTotal.value)}</div>
        </div>
        <div class="summary-box">
          <div class="label">CANTIDAD DE ARREGLOS</div>
          <div class="val">${reportArreglos.value.length}</div>
        </div>
        <div class="summary-box">
          <div class="label">TOTAL PIEZAS</div>
          <div class="val">${reportCantidadTotal.value}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th style="width: 100px; text-align: center;">FECHA</th>
            <th style="width: 150px;">CLIENTE</th>
            <th>DESCRIPCIÓN</th>
            <th style="width: 70px; text-align: center;">CANT.</th>
            <th style="width: 130px; text-align: right;">VALOR</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="6" style="text-align: center; color: #888; padding: 20px;">No hay arreglos registrados en este rango de fechas.</td></tr>'}
        </tbody>
      </table>

      <div class="footer">
        <div>18D Joyeros — Sistema de Control de Taller</div>
        <div>Página 1 de 1</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      <\/script>
    </body>
    </html>
  `

  printWindow.document.write(content)
  printWindow.document.close()
}
</script>

<template>
  <section>
    <!-- 👉 Encabezado del Módulo -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h4 class="text-h4 font-weight-bold d-flex align-center gap-2">
          <VIcon icon="tabler-tools" color="primary" size="28" />
          Arreglos de Taller
        </h4>
        <p class="text-body-1 text-disabled mb-0">
          Registra y controla todos los servicios de reparación y mantenimiento de piezas
        </p>
      </div>

      <div class="d-flex align-center gap-3">
        <!-- Botón Reporte PDF -->
        <VBtn
          color="secondary"
          variant="tonal"
          prepend-icon="tabler-file-text"
          @click="openReportDialog"
        >
          Reporte PDF / Imprimir
        </VBtn>

        <!-- Botón Nuevo Arreglo -->
        <VBtn
          color="primary"
          prepend-icon="tabler-plus"
          @click="openCreateDialog"
        >
          Nuevo Arreglo
        </VBtn>
      </div>
    </div>

    <!-- 👉 Cards Estadísticas -->
    <div class="mb-6">
      <ArreglosResumenCards :stats="stats" :loading="isStatsLoading" />
    </div>

    <!-- 👉 Tabla Principal -->
    <VCard elevation="2">
      <!-- Toolbar de Filtros -->
      <VCardText class="py-4">
        <VRow class="align-center" density="compact">
          <!-- Items por página -->
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

          <!-- Búsqueda -->
          <VCol cols="12" sm="4" md="2">
            <AppTextField
              v-model="searchQuery"
              placeholder="Buscar descripción..."
              density="compact"
              clearable
              prepend-inner-icon="tabler-search"
            />
          </VCol>

          <!-- Filtro por Cliente -->
          <VCol cols="12" sm="4" md="2">
            <AppAutocomplete
              v-model="selectedClienteId"
              :items="[{ value: null, title: 'Todos los clientes' }, ...clientes.map(c => ({ value: c.id, title: `${c.nombre} ${c.apellido}` }))]"
              placeholder="Cliente"
              density="compact"
              clearable
            />
          </VCol>

          <!-- Fecha Desde -->
          <VCol cols="12" sm="3" md="2">
            <AppDateTimePicker
              v-model="fechaInicio"
              placeholder="Fecha Desde"
              density="compact"
              clearable
              :config="{ dateFormat: 'Y-m-d' }"
            />
          </VCol>

          <!-- Fecha Hasta -->
          <VCol cols="12" sm="3" md="2">
            <AppDateTimePicker
              v-model="fechaFin"
              placeholder="Fecha Hasta"
              density="compact"
              clearable
              :config="{ dateFormat: 'Y-m-d' }"
            />
          </VCol>

          <!-- Limpiar filtros -->
          <VCol cols="12" sm="2" md="1" class="text-end">
            <VBtn
              v-if="searchQuery || fechaInicio || fechaFin || selectedClienteId"
              size="small"
              variant="text"
              color="secondary"
              @click="searchQuery = ''; fechaInicio = null; fechaFin = null; selectedClienteId = null;"
            >
              Limpiar
            </VBtn>
          </VCol>
        </VRow>
      </VCardText>

      <VDivider />

      <!-- Tabla de Datos -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :items="arreglosList"
        :items-length="totalArreglosCount"
        :headers="headers"
        :loading="isLoading"
        class="text-no-wrap"
        @update:options="
          (options) => {
            page = options.page
            itemsPerPage = options.itemsPerPage
            sortBy = options.sortBy[0]?.key
            orderBy = options.sortBy[0]?.order
          }
        "
      >
        <!-- Slot Fecha -->
        <template #item.fecha="{ item }">
          <div class="d-flex align-center gap-2">
            <VIcon icon="tabler-calendar" size="16" class="text-disabled" />
            <span class="font-weight-medium text-body-2">{{ formatDate(item.fecha) }}</span>
          </div>
        </template>

        <!-- Slot Cliente -->
        <template #item.cliente="{ item }">
          <div class="d-flex align-center gap-2">
            <VAvatar size="28" color="primary" variant="tonal">
              <span class="text-xs font-weight-bold">
                {{ item.cliente ? item.cliente.nombre.charAt(0) + item.cliente.apellido.charAt(0) : '??' }}
              </span>
            </VAvatar>
            <span class="font-weight-medium text-body-2">
              {{ getClienteName(item) }}
            </span>
          </div>
        </template>

        <!-- Slot Descripción -->
        <template #item.descripcion="{ item }">
          <div class="font-weight-medium text-body-1 py-1">
            {{ item.descripcion }}
          </div>
        </template>

        <!-- Slot Cantidad -->
        <template #item.cantidad="{ item }">
          <VChip size="small" color="info" variant="tonal" class="font-weight-bold">
            {{ item.cantidad }} pza{{ item.cantidad > 1 ? 's' : '' }}
          </VChip>
        </template>

        <!-- Slot Valor -->
        <template #item.valor="{ item }">
          <span class="font-weight-bold text-body-1 text-primary">
            {{ formatCurrency(item.valor) }}
          </span>
        </template>

        <!-- Slot Acciones -->
        <template #item.actions="{ item }">
          <div class="d-flex align-center gap-1">
            <IconBtn @click="openEditDialog(item)">
              <VIcon icon="tabler-pencil" size="20" />
            </IconBtn>
            <IconBtn @click="deleteArreglo(item.id)">
              <VIcon icon="tabler-trash" size="20" color="error" />
            </IconBtn>
          </div>
        </template>

        <!-- Empty State -->
        <template #no-data>
          <div class="text-center py-10">
            <VIcon icon="tabler-tools-off" size="48" class="text-disabled mb-3" />
            <p class="text-h6 text-disabled mb-1">No hay arreglos registrados</p>
            <p class="text-body-2 text-disabled">Registra tu primer arreglo para comenzar</p>
          </div>
        </template>
      </VDataTableServer>
    </VCard>

    <!-- 👉 Diálogo Crear / Editar -->
    <ArregloFormDialog
      v-model:isDialogVisible="formDialogOpen"
      :arreglo-data="editingArreglo"
      :clientes="clientes"
      @submit="onSubmitForm"
    />

    <!-- 👉 Diálogo Reporte PDF -->
    <VDialog
      v-model="reportDialogOpen"
      max-width="650"
      persistent
    >
      <VCard class="pa-2">
        <VCardItem class="pb-4">
          <div class="d-flex align-center justify-space-between w-100">
            <div class="d-flex align-center gap-2">
              <VAvatar color="primary" variant="tonal" size="38" rounded>
                <VIcon icon="tabler-file-text" size="22" />
              </VAvatar>
              <div>
                <h5 class="text-h5 font-weight-bold mb-0">Informe de Arreglos</h5>
                <span class="text-caption text-disabled">Generar reporte por rango de fechas</span>
              </div>
            </div>

            <VBtn icon variant="text" color="default" size="small" @click="reportDialogOpen = false">
              <VIcon icon="tabler-x" size="20" />
            </VBtn>
          </div>
        </VCardItem>

        <VDivider class="mb-4" />

        <VCardText class="pt-2">
          <VRow>
            <VCol cols="12" sm="5">
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">Fecha Inicio</label>
              <AppDateTimePicker
                v-model="reportFechaInicio"
                placeholder="Desde"
                :config="{ dateFormat: 'Y-m-d' }"
                density="compact"
              />
            </VCol>
            <VCol cols="12" sm="5">
              <label class="text-xs font-weight-bold text-uppercase text-medium-emphasis mb-1 d-block">Fecha Fin</label>
              <AppDateTimePicker
                v-model="reportFechaFin"
                placeholder="Hasta"
                :config="{ dateFormat: 'Y-m-d' }"
                density="compact"
              />
            </VCol>
            <VCol cols="12" sm="2" class="d-flex align-end">
              <VBtn
                color="primary"
                variant="tonal"
                block
                :loading="isReportLoading"
                @click="loadReportData"
              >
                Cargar
              </VBtn>
            </VCol>
          </VRow>

          <!-- Resumen -->
          <VAlert v-if="reportArreglos.length > 0" color="primary" variant="tonal" class="mt-4">
            <div class="d-flex justify-space-between align-center">
              <div>
                <span class="font-weight-bold">{{ reportArreglos.length }}</span> arreglos encontrados
                <span class="mx-2">•</span>
                <span class="font-weight-bold">{{ reportCantidadTotal }}</span> piezas
              </div>
              <span class="font-weight-bold text-h6">{{ formatCurrency(reportTotal) }}</span>
            </div>
          </VAlert>

          <VAlert v-else-if="!isReportLoading" color="warning" variant="tonal" class="mt-4">
            No se encontraron arreglos en el rango seleccionado.
          </VAlert>
        </VCardText>

        <VCardText class="d-flex justify-end gap-3 pt-4">
          <VBtn variant="tonal" color="secondary" @click="reportDialogOpen = false">
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

    <!-- 👉 Snackbar de Feedback -->
    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="top end"
    >
      {{ snackbar.message }}
    </VSnackbar>
  </section>
</template>

<style scoped>
.stats-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.stats-card:hover {
  transform: translateY(-2px);
}
</style>

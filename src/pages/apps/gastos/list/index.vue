<script setup lang="ts">
import { useGastosStore } from '@/views/apps/gastos/useGastosStore'
import type { Gasto, GastoStats } from '@/views/apps/gastos/useGastosStore'

// 👉 Store & Router
const gastosStore = useGastosStore()

// 👉 State - Tabla y Filtros
const searchQuery = ref('')
const selectedTipoPago = ref<string | null>(null)
const fechaInicio = ref<string | null>(null)
const fechaFin = ref<string | null>(null)

const itemsPerPage = ref(10)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()

const totalGastosCount = ref(0)
const gastosList = ref<Gasto[]>([])
const isLoading = ref(false)

// 👉 State - Stats
const stats = ref<GastoStats>({
  totalMesActual: 0,
  totalMesAnterior: 0,
  totalEfectivo: 0,
  totalTransferencia: 0,
  cantidadTransacciones: 0,
  variacionPorcentaje: 0,
})

// 👉 State - Form Dialog (Crear / Editar)
const formDialogOpen = ref(false)
const isSubmitting = ref(false)
const refForm = ref()
const isEditMode = ref(false)
const selectedGastoId = ref<string | null>(null)

const formFecha = ref(new Date().toISOString().split('T')[0])
const formDescripcion = ref('')
const formTipoPago = ref<'efectivo' | 'transferencia'>('efectivo')
const formValor = ref<number | null>(null)

// 👉 State - Reporte PDF Dialog
const reportDialogOpen = ref(false)
const reportFechaInicio = ref(
  new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
)
const reportFechaFin = ref(new Date().toISOString().split('T')[0])
const reportGastos = ref<Gasto[]>([])
const isReportLoading = ref(false)

// 👉 State - UI feedback
const snackbar = ref({ show: false, message: '', color: 'success' })

// 👉 Headers de Tabla
const headers = [
  { title: 'FECHA', key: 'fecha', width: '130px' },
  { title: 'DESCRIPCIÓN DE GASTO', key: 'descripcion' },
  { title: 'MÉTODO DE PAGO', key: 'tipo_pago', width: '160px', sortable: false },
  { title: 'VALOR', key: 'valor', width: '160px', align: 'end' as const },
  { title: 'ACCIONES', key: 'actions', width: '100px', sortable: false, align: 'center' as const },
]

// 👉 Helpers de Formato
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
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

const requiredValidator = (v: any) => !!v || 'Campo requerido'
const positiveNumberValidator = (v: any) => (v && Number(v) > 0) || 'El valor debe ser mayor a 0'

// 👉 Fetch Datos de Tabla
const fetchGastos = async () => {
  isLoading.value = true
  try {
    const { gastos, totalGastos } = await gastosStore.fetchGastos({
      q: searchQuery.value,
      fechaInicio: fechaInicio.value,
      fechaFin: fechaFin.value,
      tipoPago: selectedTipoPago.value,
      options: {
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: sortBy.value ? [{ key: sortBy.value, order: orderBy.value }] : [],
      },
    })
    gastosList.value = gastos
    totalGastosCount.value = totalGastos
  } catch (error) {
    console.error('Error al cargar gastos:', error)
  } finally {
    isLoading.value = false
  }
}

// 👉 Fetch Stats
const loadStats = async () => {
  try {
    stats.value = await gastosStore.fetchStats()
  } catch (error) {
    console.error('Error al cargar estadísticas:', error)
  }
}

// Watchers para refetch
watch([page, itemsPerPage, sortBy, orderBy, searchQuery, selectedTipoPago, fechaInicio, fechaFin], () => {
  fetchGastos()
}, { deep: true })

onMounted(() => {
  fetchGastos()
  loadStats()
})

// 👉 Abrir Modal Crear
const openCreateDialog = () => {
  isEditMode.value = false
  selectedGastoId.value = null
  formFecha.value = new Date().toISOString().split('T')[0]
  formDescripcion.value = ''
  formTipoPago.value = 'efectivo'
  formValor.value = null
  formDialogOpen.value = true
}

// 👉 Abrir Modal Editar
const openEditDialog = (gasto: Gasto) => {
  isEditMode.value = true
  selectedGastoId.value = gasto.id
  formFecha.value = gasto.fecha
  formDescripcion.value = gasto.descripcion
  formTipoPago.value = gasto.tipo_pago
  formValor.value = gasto.valor
  formDialogOpen.value = true
}

// 👉 Guardar Gasto (Crear / Editar)
const onSubmitForm = async () => {
  const { valid } = await refForm.value?.validate()
  if (!valid) return

  isSubmitting.value = true
  try {
    if (isEditMode.value && selectedGastoId.value) {
      await gastosStore.updateGasto(selectedGastoId.value, {
        fecha: formFecha.value,
        descripcion: formDescripcion.value,
        tipo_pago: formTipoPago.value,
        valor: formValor.value!,
      })
      snackbar.value = { show: true, message: 'Gasto actualizado con éxito', color: 'success' }
    } else {
      await gastosStore.addGasto({
        fecha: formFecha.value,
        descripcion: formDescripcion.value,
        tipo_pago: formTipoPago.value,
        valor: formValor.value!,
      })
      snackbar.value = { show: true, message: 'Gasto registrado con éxito', color: 'success' }
    }
    formDialogOpen.value = false
    fetchGastos()
    loadStats()
  } catch (error: any) {
    console.error('Error al guardar gasto:', error)
    snackbar.value = { show: true, message: error.message || 'Error al guardar el gasto', color: 'error' }
  } finally {
    isSubmitting.value = false
  }
}

// 👉 Eliminar Gasto
const deleteGasto = async (id: string) => {
  if (confirm('¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer.')) {
    try {
      await gastosStore.deleteGasto(id)
      snackbar.value = { show: true, message: 'Gasto eliminado correctamente', color: 'info' }
      fetchGastos()
      loadStats()
    } catch (error: any) {
      console.error('Error al eliminar gasto:', error)
      snackbar.value = { show: true, message: 'Error al eliminar el gasto', color: 'error' }
    }
  }
}

// 👉 Cargar Reporte PDF por Rango de Fechas
const loadReportData = async () => {
  if (!reportFechaInicio.value || !reportFechaFin.value) return
  isReportLoading.value = true
  try {
    reportGastos.value = await gastosStore.fetchGastosReport(reportFechaInicio.value, reportFechaFin.value)
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

// Total de reporte seleccionado
const reportTotal = computed(() => {
  return reportGastos.value.reduce((sum, g) => sum + g.valor, 0)
})

const reportTotalEfectivo = computed(() => {
  return reportGastos.value.filter(g => g.tipo_pago === 'efectivo').reduce((sum, g) => sum + g.valor, 0)
})

const reportTotalTransferencia = computed(() => {
  return reportGastos.value.filter(g => g.tipo_pago === 'transferencia').reduce((sum, g) => sum + g.valor, 0)
})

// 👉 Función para Imprimir Reporte en ventana limpia
const printReport = () => {
  const printWindow = window.open('', '_blank', 'width=900,height=800')
  if (!printWindow) return

  const rowsHtml = reportGastos.value.map((gasto, index) => `
    <tr>
      <td style="text-align: center;">${index + 1}</td>
      <td style="text-align: center;">${formatDate(gasto.fecha)}</td>
      <td>${gasto.descripcion}</td>
      <td style="text-align: center;">
        <span class="badge ${gasto.tipo_pago === 'efectivo' ? 'badge-cash' : 'badge-bank'}">
          ${gasto.tipo_pago === 'efectivo' ? 'Efectivo' : 'Transferencia'}
        </span>
      </td>
      <td style="text-align: right; font-weight: bold;">${formatCurrency(gasto.valor)}</td>
    </tr>
  `).join('')

  const content = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Reporte de Gastos - 18D Joyeros</title>
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

        .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .badge-cash { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
        .badge-bank { background: #e3f2fd; color: #1565c0; border: 1px solid #90caf9; }

        .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; display: flex; justify-content: space-between; font-size: 11px; color: #777; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo-title">18D JOYEROS</div>
          <div class="subtitle">Reporte Detallado de Gastos y Egresos</div>
        </div>
        <div class="report-info">
          <div><strong>Rango:</strong> ${formatDate(reportFechaInicio.value)} al ${formatDate(reportFechaFin.value)}</div>
          <div><strong>Fecha Impr.:</strong> ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
          <div><strong>Total Regs:</strong> ${reportGastos.value.length}</div>
        </div>
      </div>

      <div class="summary-cards">
        <div class="summary-box total">
          <div class="label">TOTAL GASTOS</div>
          <div class="val">${formatCurrency(reportTotal.value)}</div>
        </div>
        <div class="summary-box">
          <div class="label">TOTAL EFECTIVO</div>
          <div class="val">${formatCurrency(reportTotalEfectivo.value)}</div>
        </div>
        <div class="summary-box">
          <div class="label">TOTAL TRANSFERENCIA</div>
          <div class="val">${formatCurrency(reportTotalTransferencia.value)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th style="width: 100px; text-align: center;">FECHA</th>
            <th>DESCRIPCIÓN</th>
            <th style="width: 120px; text-align: center;">MÉTODO</th>
            <th style="width: 130px; text-align: right;">VALOR</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="5" style="text-align: center; color: #888; padding: 20px;">No hay gastos registrados en este rango de fechas.</td></tr>'}
        </tbody>
      </table>

      <div class="footer">
        <div>18D Joyeros — Sistema de Control Financiero</div>
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
    <!-- 👉 Encabezado de la Sección -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h4 class="text-h4 font-weight-bold d-flex align-center gap-2">
          <VIcon icon="tabler-wallet" color="primary" size="28" />
          Registro de Gastos
        </h4>
        <p class="text-body-1 text-disabled mb-0">
          Administra y fiscaliza todos los gastos y egresos del negocio
        </p>
      </div>

      <div class="d-flex align-center gap-3">
        <!-- Botón Generar Reporte PDF -->
        <VBtn
          color="secondary"
          variant="tonal"
          prepend-icon="tabler-file-text"
          @click="openReportDialog"
        >
          Reporte PDF / Imprimir
        </VBtn>

        <!-- Botón Nuevo Gasto -->
        <VBtn
          color="primary"
          prepend-icon="tabler-plus"
          @click="openCreateDialog"
        >
          Nuevo Gasto
        </VBtn>
      </div>
    </div>

    <!-- 👉 Cards de Métricas Mensuales -->
    <VRow class="mb-6">
      <!-- Total Mes Actual -->
      <VCol cols="12" sm="6" md="3">
        <VCard elevation="2" class="stats-card">
          <VCardText class="d-flex align-center justify-space-between pa-4">
            <div>
              <span class="text-caption text-uppercase font-weight-bold text-disabled">Gastos del Mes</span>
              <h5 class="text-h5 font-weight-bold text-error mt-1 mb-0">
                {{ formatCurrency(stats.totalMesActual) }}
              </h5>
              <div class="d-flex align-center gap-1 mt-1 text-xs">
                <VChip
                  size="x-small"
                  :color="stats.variacionPorcentaje > 0 ? 'error' : 'success'"
                  variant="tonal"
                >
                  {{ stats.variacionPorcentaje > 0 ? '+' : '' }}{{ stats.variacionPorcentaje }}%
                </VChip>
                <span class="text-disabled">vs mes anterior</span>
              </div>
            </div>
            <VAvatar color="error" variant="tonal" size="48" rounded="lg">
              <VIcon icon="tabler-trending-down" size="26" />
            </VAvatar>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Efectivo del Mes -->
      <VCol cols="12" sm="6" md="3">
        <VCard elevation="2" class="stats-card">
          <VCardText class="d-flex align-center justify-space-between pa-4">
            <div>
              <span class="text-caption text-uppercase font-weight-bold text-disabled">En Efectivo</span>
              <h5 class="text-h5 font-weight-bold text-success mt-1 mb-0">
                {{ formatCurrency(stats.totalEfectivo) }}
              </h5>
              <span class="text-xs text-disabled mt-1 d-block">Egresos en caja</span>
            </div>
            <VAvatar color="success" variant="tonal" size="48" rounded="lg">
              <VIcon icon="tabler-cash" size="26" />
            </VAvatar>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Transferencia del Mes -->
      <VCol cols="12" sm="6" md="3">
        <VCard elevation="2" class="stats-card">
          <VCardText class="d-flex align-center justify-space-between pa-4">
            <div>
              <span class="text-caption text-uppercase font-weight-bold text-disabled">En Transferencia</span>
              <h5 class="text-h5 font-weight-bold text-info mt-1 mb-0">
                {{ formatCurrency(stats.totalTransferencia) }}
              </h5>
              <span class="text-xs text-disabled mt-1 d-block">Cuentas bancarias</span>
            </div>
            <VAvatar color="info" variant="tonal" size="48" rounded="lg">
              <VIcon icon="tabler-building-bank" size="26" />
            </VAvatar>
          </VCardText>
        </VCard>
      </VCol>

      <!-- Cantidad Transacciones -->
      <VCol cols="12" sm="6" md="3">
        <VCard elevation="2" class="stats-card">
          <VCardText class="d-flex align-center justify-space-between pa-4">
            <div>
              <span class="text-caption text-uppercase font-weight-bold text-disabled">Transacciones</span>
              <h5 class="text-h5 font-weight-bold text-primary mt-1 mb-0">
                {{ stats.cantidadTransacciones }}
              </h5>
              <span class="text-xs text-disabled mt-1 d-block">Registros este mes</span>
            </div>
            <VAvatar color="primary" variant="tonal" size="48" rounded="lg">
              <VIcon icon="tabler-receipt" size="26" />
            </VAvatar>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- 👉 Card Principal de Tabla -->
    <VCard elevation="2">
      <!-- Toolbar de Filtros -->
      <VCardText class="py-4">
        <VRow class="align-center" density="compact">
          <!-- Paginación items por página -->
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

          <!-- Búsqueda por descripción -->
          <VCol cols="12" sm="4" md="3">
            <AppTextField
              v-model="searchQuery"
              placeholder="Buscar descripción..."
              density="compact"
              clearable
              prepend-inner-icon="tabler-search"
            />
          </VCol>

          <!-- Filtro Fecha Desde -->
          <VCol cols="12" sm="3" md="2">
            <AppDateTimePicker
              v-model="fechaInicio"
              placeholder="Fecha Desde"
              density="compact"
              clearable
              :config="{ dateFormat: 'Y-m-d' }"
            />
          </VCol>

          <!-- Filtro Fecha Hasta -->
          <VCol cols="12" sm="3" md="2">
            <AppDateTimePicker
              v-model="fechaFin"
              placeholder="Fecha Hasta"
              density="compact"
              clearable
              :config="{ dateFormat: 'Y-m-d' }"
            />
          </VCol>

          <!-- Filtro Tipo de Pago -->
          <VCol cols="12" sm="4" md="2">
            <AppSelect
              v-model="selectedTipoPago"
              :items="[
                { value: null, title: 'Todos los pagos' },
                { value: 'efectivo', title: 'Efectivo' },
                { value: 'transferencia', title: 'Transferencia' },
              ]"
              placeholder="Método de pago"
              density="compact"
              clearable
            />
          </VCol>

          <!-- Reset de filtros -->
          <VCol cols="12" sm="2" md="2" class="text-end">
            <VBtn
              v-if="searchQuery || selectedTipoPago || fechaInicio || fechaFin"
              size="small"
              variant="text"
              color="secondary"
              @click="searchQuery = ''; selectedTipoPago = null; fechaInicio = null; fechaFin = null;"
            >
              Limpiar Filtros
            </VBtn>
          </VCol>
        </VRow>
      </VCardText>

      <VDivider />

      <!-- Tabla de Datos -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :items="gastosList"
        :items-length="totalGastosCount"
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

        <!-- Slot Descripción -->
        <template #item.descripcion="{ item }">
          <div class="font-weight-medium text-body-1 py-1">
            {{ item.descripcion }}
          </div>
        </template>

        <!-- Slot Método de Pago -->
        <template #item.tipo_pago="{ item }">
          <VChip
            size="small"
            variant="flat"
            :color="item.tipo_pago === 'efectivo' ? 'success' : 'info'"
            class="text-capitalize font-weight-bold"
          >
            <VIcon
              :icon="item.tipo_pago === 'efectivo' ? 'tabler-cash' : 'tabler-building-bank'"
              size="14"
              class="me-1"
            />
            {{ item.tipo_pago }}
          </VChip>
        </template>

        <!-- Slot Valor -->
        <template #item.valor="{ item }">
          <span class="font-weight-bold text-body-1 text-error">
            {{ formatCurrency(item.valor) }}
          </span>
        </template>

        <!-- Slot Acciones -->
        <template #item.actions="{ item }">
          <div class="d-flex align-center justify-center gap-1">
            <VBtn
              icon
              size="x-small"
              variant="text"
              color="default"
              title="Editar gasto"
              @click="openEditDialog(item)"
            >
              <VIcon icon="tabler-pencil" size="18" />
            </VBtn>

            <VBtn
              icon
              size="x-small"
              variant="text"
              color="error"
              title="Eliminar gasto"
              @click="deleteGasto(item.id)"
            >
              <VIcon icon="tabler-trash" size="18" />
            </VBtn>
          </div>
        </template>

        <!-- Empty State -->
        <template #no-data>
          <div class="py-8 text-center">
            <VIcon icon="tabler-receipt-off" size="48" color="disabled" class="mb-2" />
            <p class="text-body-1 text-disabled mb-0">No se encontraron gastos registrados</p>
          </div>
        </template>
      </VDataTableServer>
    </VCard>

    <!-- ============================================= -->
    <!-- 👉 DIALOG: CREAR / EDITAR GASTO -->
    <!-- ============================================= -->
    <VDialog
      v-model="formDialogOpen"
      max-width="500"
      persistent
    >
      <VCard rounded="lg">
        <VCardItem class="bg-light-primary pa-4">
          <template #title>
            <span class="text-h6 font-weight-bold d-flex align-center gap-2">
              <VIcon :icon="isEditMode ? 'tabler-pencil' : 'tabler-plus'" color="primary" />
              {{ isEditMode ? 'Editar Gasto' : 'Registrar Nuevo Gasto' }}
            </span>
          </template>
          <template #append>
            <VBtn icon variant="text" size="small" @click="formDialogOpen = false">
              <VIcon icon="tabler-x" />
            </VBtn>
          </template>
        </VCardItem>

        <VDivider />

        <VCardText class="pa-6">
          <VForm ref="refForm" @submit.prevent="onSubmitForm">
            <VRow>
              <!-- Fecha -->
              <VCol cols="12">
                <AppDateTimePicker
                  v-model="formFecha"
                  :rules="[requiredValidator]"
                  label="Fecha del Gasto *"
                  placeholder="Seleccionar fecha"
                  :config="{ dateFormat: 'Y-m-d' }"
                />
              </VCol>

              <!-- Descripción -->
              <VCol cols="12">
                <AppTextarea
                  v-model="formDescripcion"
                  :rules="[requiredValidator]"
                  label="Descripción *"
                  placeholder="Ej: Compra de insumos, pago de electricidad, etc."
                  rows="3"
                  auto-grow
                />
              </VCol>

              <!-- Tipo de Pago -->
              <VCol cols="12" sm="6">
                <AppSelect
                  v-model="formTipoPago"
                  :rules="[requiredValidator]"
                  :items="[
                    { value: 'efectivo', title: 'Efectivo' },
                    { value: 'transferencia', title: 'Transferencia' },
                  ]"
                  label="Método de Pago *"
                />
              </VCol>

              <!-- Valor (COP) -->
              <VCol cols="12" sm="6">
                <AppTextField
                  v-model.number="formValor"
                  :rules="[requiredValidator, positiveNumberValidator]"
                  label="Valor (COP) *"
                  placeholder="0"
                  type="number"
                  prefix="$"
                />
              </VCol>
            </VRow>

            <div class="d-flex justify-end gap-3 mt-6">
              <VBtn
                variant="tonal"
                color="secondary"
                @click="formDialogOpen = false"
              >
                Cancelar
              </VBtn>
              <VBtn
                type="submit"
                color="primary"
                :loading="isSubmitting"
                prepend-icon="tabler-device-floppy"
              >
                {{ isEditMode ? 'Guardar Cambios' : 'Registrar Gasto' }}
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- ============================================= -->
    <!-- 👉 DIALOG: REPORTE PDF / IMPRIMIR GASTOS -->
    <!-- ============================================= -->
    <VDialog
      v-model="reportDialogOpen"
      max-width="700"
    >
      <VCard rounded="lg">
        <VCardItem class="pa-4 bg-light-secondary">
          <template #title>
            <span class="text-h6 font-weight-bold d-flex align-center gap-2">
              <VIcon icon="tabler-file-text" color="secondary" />
              Generar Reporte de Gastos
            </span>
          </template>
          <template #append>
            <VBtn icon variant="text" size="small" @click="reportDialogOpen = false">
              <VIcon icon="tabler-x" />
            </VBtn>
          </template>
        </VCardItem>

        <VDivider />

        <VCardText class="pa-6">
          <p class="text-body-2 text-disabled mb-4">
            Selecciona el rango de fechas para consultar y generar el reporte imprimible o guardar como PDF.
          </p>

          <VRow class="mb-4">
            <VCol cols="12" sm="5">
              <AppDateTimePicker
                v-model="reportFechaInicio"
                label="Fecha Inicial"
                placeholder="Desde"
                :config="{ dateFormat: 'Y-m-d' }"
                @update:model-value="loadReportData"
              />
            </VCol>
            <VCol cols="12" sm="5">
              <AppDateTimePicker
                v-model="reportFechaFin"
                label="Fecha Final"
                placeholder="Hasta"
                :config="{ dateFormat: 'Y-m-d' }"
                @update:model-value="loadReportData"
              />
            </VCol>
            <VCol cols="12" sm="2" class="d-flex align-end">
              <VBtn
                block
                color="primary"
                variant="tonal"
                :loading="isReportLoading"
                @click="loadReportData"
              >
                Buscar
              </VBtn>
            </VCol>
          </VRow>

          <!-- Resumen del Reporte Consultado -->
          <VCard variant="outlined" class="pa-4 mb-4 bg-var-theme-background">
            <VRow density="compact" class="text-center">
              <VCol cols="4">
                <span class="text-xs text-disabled text-uppercase font-weight-bold">Total Gastos</span>
                <h6 class="text-h6 font-weight-bold text-error mt-1">
                  {{ formatCurrency(reportTotal) }}
                </h6>
              </VCol>
              <VCol cols="4">
                <span class="text-xs text-disabled text-uppercase font-weight-bold">Total Efectivo</span>
                <h6 class="text-h6 font-weight-bold text-success mt-1">
                  {{ formatCurrency(reportTotalEfectivo) }}
                </h6>
              </VCol>
              <VCol cols="4">
                <span class="text-xs text-disabled text-uppercase font-weight-bold">Total Transferencia</span>
                <h6 class="text-h6 font-weight-bold text-info mt-1">
                  {{ formatCurrency(reportTotalTransferencia) }}
                </h6>
              </VCol>
            </VRow>
          </VCard>

          <!-- Vista Previa de Registros -->
          <div class="report-preview-table rounded border overflow-hidden">
            <VTable density="compact">
              <thead>
                <tr>
                  <th class="text-center">FECHA</th>
                  <th>DESCRIPCIÓN</th>
                  <th class="text-center">MÉTODO</th>
                  <th class="text-end">VALOR</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="gasto in reportGastos" :key="gasto.id">
                  <td class="text-center text-xs font-weight-medium">{{ formatDate(gasto.fecha) }}</td>
                  <td class="text-xs">{{ gasto.descripcion }}</td>
                  <td class="text-center">
                    <VChip size="x-small" :color="gasto.tipo_pago === 'efectivo' ? 'success' : 'info'">
                      {{ gasto.tipo_pago }}
                    </VChip>
                  </td>
                  <td class="text-end text-xs font-weight-bold text-error">{{ formatCurrency(gasto.valor) }}</td>
                </tr>
                <tr v-if="reportGastos.length === 0">
                  <td colspan="4" class="text-center py-4 text-disabled">
                    No se encontraron gastos en este rango de fechas.
                  </td>
                </tr>
              </tbody>
            </VTable>
          </div>

          <div class="d-flex justify-end gap-3 mt-6">
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
              :disabled="reportGastos.length === 0"
              @click="printReport"
            >
              Imprimir / Descargar PDF
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Snackbar de notificaciones -->
    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
    >
      {{ snackbar.message }}
    </VSnackbar>
  </section>
</template>

<style lang="scss" scoped>
.stats-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:hover {
    transform: translateY(-2px);
  }
}

.report-preview-table {
  max-block-size: 260px;
  overflow-y: auto;
}
</style>

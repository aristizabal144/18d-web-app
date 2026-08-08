<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useValesStore, type Vale, type ResumenVales } from '@/views/apps/vales/useValesStore'
import ValesResumenCards from '@/views/apps/vales/ValesResumenCards.vue'
import NuevoValeDialog from '@/views/apps/vales/NuevoValeDialog.vue'
import AbonoValeDialog from '@/views/apps/vales/AbonoValeDialog.vue'
import DetalleValeDialog from '@/views/apps/vales/DetalleValeDialog.vue'

const valesStore = useValesStore()

// ── Estado ───────────────────────────────────────────
const isLoading = ref(false)
const isResumenLoading = ref(false)

const valesList = ref<Vale[]>([])
const totalVales = ref(0)
const usuariosList = ref<Array<{ id: string; nombre: string; apellido: string; email?: string }>>([])

const resumen = ref<ResumenVales>({
  totalDeudaGlobal: 0,
  totalMontoEmitido: 0,
  totalMontoAbonado: 0,
  cantPendientes: 0,
  cantValesTotal: 0,
})

// ── Filtros y Paginación ──────────────────────────────
const searchQuery = ref('')
const selectedEstado = ref('todos')
const selectedUsuario = ref<string | null>(null)
const fechaInicio = ref('')
const fechaFin = ref('')

const page = ref(1)
const itemsPerPage = ref(10)
const sortBy = ref([{ key: 'created_at', order: 'desc' }])

// ── Modales ──────────────────────────────────────────
const isNuevoValeDialogVisible = ref(false)
const isAbonoDialogVisible = ref(false)
const isDetalleDialogVisible = ref(false)
const selectedValeForAction = ref<Vale | null>(null)

// ── Snackbar ─────────────────────────────────────────
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
})

const showMessage = (msg: string, color = 'success') => {
  snackbar.value = { show: true, message: msg, color }
}

// ── Encabezados de la Tabla ───────────────────────────
const headers = [
  { title: 'BENEFICIARIO / DEUDOR', key: 'beneficiario' },
  { title: 'CONCEPTO', key: 'concepto' },
  { title: 'FECHA EMISIÓN', key: 'fecha_emision', align: 'center' },
  { title: 'MONTO TOTAL', key: 'monto_total', align: 'end' },
  { title: 'TOTAL ABONADO', key: 'monto_abonado', align: 'end' },
  { title: 'SALDO PENDIENTE', key: 'saldo_pendiente', align: 'end' },
  { title: 'ESTADO', key: 'estado', align: 'center' },
  { title: 'ACCIONES', key: 'actions', align: 'center', sortable: false },
]

// ── Utilidades de Formato ─────────────────────────────
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0)
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const getEstadoColor = (estado: string) => {
  if (estado === 'cancelado') return 'success'
  if (estado === 'parcial') return 'warning'
  return 'error'
}

// ── Carga de Datos ───────────────────────────────────
const loadResumen = async () => {
  isResumenLoading.value = true
  try {
    resumen.value = await valesStore.fetchResumenVales()
  } catch (err: any) {
    console.error('Error al cargar resumen de vales:', err)
  } finally {
    isResumenLoading.value = false
  }
}

const loadVales = async () => {
  isLoading.value = true
  try {
    const res = await valesStore.fetchVales({
      q: searchQuery.value,
      estado: selectedEstado.value,
      usuarioId: selectedUsuario.value || '',
      fechaInicio: fechaInicio.value,
      fechaFin: fechaFin.value,
      options: {
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: sortBy.value,
      },
    })
    valesList.value = res.vales
    totalVales.value = res.totalVales
  } catch (err: any) {
    console.error('Error al cargar vales:', err)
    showMessage('Error al cargar la lista de vales', 'error')
  } finally {
    isLoading.value = false
  }
}

const loadUsuarios = async () => {
  usuariosList.value = await valesStore.fetchUsuariosApp()
}

const loadAllData = async () => {
  await Promise.all([loadResumen(), loadVales()])
}

// ── Handlers de Acciones ──────────────────────────────
const handleCrearVale = async (payload: any) => {
  try {
    await valesStore.crearVale(payload)
    showMessage('Vale emitido exitosamente', 'success')
    await loadAllData()
  } catch (err: any) {
    showMessage(err.message || 'Error al emitir el vale', 'error')
  }
}

const handleRegistrarAbono = async (payload: any) => {
  try {
    await valesStore.registrarAbono(payload)
    showMessage('Abono registrado exitosamente', 'success')
    await loadAllData()
  } catch (err: any) {
    showMessage(err.message || 'Error al registrar abono', 'error')
  }
}

const handleCancelarTotal = async (payload: any) => {
  try {
    await valesStore.cancelarValeTotalmente(payload.vale_id, payload.tipo_pago, payload.notas)
    showMessage('Vale cancelado totalmente', 'success')
    await loadAllData()
  } catch (err: any) {
    showMessage(err.message || 'Error al cancelar vale', 'error')
  }
}

const openAbonoDialog = (vale: Vale) => {
  selectedValeForAction.value = vale
  isAbonoDialogVisible.value = true
}

const openDetalleDialog = (vale: Vale) => {
  selectedValeForAction.value = vale
  isDetalleDialogVisible.value = true
}

const handleDeleteVale = async (vale: Vale) => {
  if (confirm(`¿Estás seguro de eliminar el vale de ${vale.beneficiario}? Esta acción no se puede deshacer.`)) {
    try {
      await valesStore.eliminarVale(vale.id)
      showMessage('Vale eliminado correctamente', 'success')
      await loadAllData()
    } catch (err: any) {
      showMessage(err.message || 'Error al eliminar vale', 'error')
    }
  }
}

// Watchers para auto-filtrar
watch([searchQuery, selectedEstado, selectedUsuario, fechaInicio, fechaFin], () => {
  page.value = 1
  loadVales()
})

onMounted(async () => {
  await Promise.all([loadUsuarios(), loadAllData()])
})
</script>

<template>
  <div>
    <!-- Encabezado de la página -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h4 class="text-h4 font-weight-bold d-flex align-center gap-2">
          <VIcon icon="tabler-receipt-refund" color="primary" size="28" />
          Módulo de Vales y Préstamos
        </h4>
        <p class="text-body-1 text-disabled mb-0">
          Control de préstamos a usuarios y proveedores con historial de abonos y saldos acumulados
        </p>
      </div>

      <VBtn
        color="primary"
        prepend-icon="tabler-plus"
        class="font-weight-bold"
        @click="isNuevoValeDialogVisible = true"
      >
        Emitir Nuevo Vale
      </VBtn>
    </div>

    <!-- 1. Tarjetas de Resumen Financiero -->
    <div class="mb-6">
      <ValesResumenCards :resumen="resumen" :loading="isResumenLoading" />
    </div>

    <!-- 2. Filtros de Búsqueda y Selección -->
    <VCard class="mb-6" elevation="1">
      <VCardText class="pa-4">
        <VRow dense align="center">
          <!-- Buscar Beneficiario / Concepto -->
          <VCol cols="12" sm="6" md="3">
            <AppTextField
              v-model="searchQuery"
              placeholder="Buscar por nombre o concepto..."
              prepend-inner-icon="tabler-search"
              clearable
              density="compact"
            />
          </VCol>

          <!-- Filtrar por Estado -->
          <VCol cols="12" sm="6" md="2.5">
            <AppSelect
              v-model="selectedEstado"
              placeholder="Estado del Vale"
              :items="[
                { title: 'Todos los Estados', value: 'todos' },
                { title: 'Pendiente (Sin Abonos)', value: 'pendiente' },
                { title: 'Parcial (Con Abonos)', value: 'parcial' },
                { title: 'Cancelado (Total Pagado)', value: 'cancelado' }
              ]"
              density="compact"
            />
          </VCol>

          <!-- Filtrar por Usuario App -->
          <VCol cols="12" sm="6" md="2.5">
            <AppAutocomplete
              v-model="selectedUsuario"
              placeholder="Seleccionar Usuario"
              :items="usuariosList.map(u => ({ value: u.id, title: `${u.nombre} ${u.apellido}` }))"
              clearable
              density="compact"
            />
          </VCol>

          <!-- Rango de Fechas -->
          <VCol cols="6" sm="3" md="2">
            <AppTextField
              v-model="fechaInicio"
              type="date"
              placeholder="Desde"
              density="compact"
              clearable
            />
          </VCol>

          <VCol cols="6" sm="3" md="2">
            <AppTextField
              v-model="fechaFin"
              type="date"
              placeholder="Hasta"
              density="compact"
              clearable
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- 3. Tabla Principal de Vales -->
    <VCard elevation="2">

      <!-- Tabla de Vales -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        v-model:sort-by="sortBy"
        :headers="headers"
        :items="valesList"
        :items-length="totalVales"
        :loading="isLoading"
        loading-text="Cargando vales..."
        class="vales-table"
        @update:options="loadVales"
      >
        <!-- Beneficiario -->
        <template #item.beneficiario="{ item }">
          <div class="d-flex align-center gap-2 py-2">
            <VAvatar color="primary" variant="tonal" size="32" class="font-weight-bold">
              {{ item.beneficiario ? item.beneficiario.charAt(0).toUpperCase() : 'V' }}
            </VAvatar>
            <div>
              <div class="font-weight-bold text-body-2 text-high-emphasis">
                {{ item.beneficiario }}
              </div>
              <div v-if="item.usuario" class="text-caption text-medium-emphasis">
                {{ item.usuario.email }}
              </div>
            </div>
          </div>
        </template>

        <!-- Concepto -->
        <template #item.concepto="{ item }">
          <span class="text-body-2">{{ item.concepto }}</span>
        </template>

        <!-- Fecha Emisión -->
        <template #item.fecha_emision="{ item }">
          <span class="text-caption font-weight-medium">
            {{ formatDate(item.fecha_emision) }}
          </span>
        </template>

        <!-- Monto Total -->
        <template #item.monto_total="{ item }">
          <span class="font-weight-bold font-mono">
            {{ formatCurrency(item.monto_total) }}
          </span>
        </template>

        <!-- Total Abonado -->
        <template #item.monto_abonado="{ item }">
          <span class="font-weight-medium text-success font-mono">
            {{ formatCurrency(item.monto_abonado) }}
          </span>
        </template>

        <!-- Saldo Pendiente -->
        <template #item.saldo_pendiente="{ item }">
          <span
            class="font-weight-bold font-mono"
            :class="Number(item.saldo_pendiente ?? (item.monto_total - item.monto_abonado)) > 0 ? 'text-error' : 'text-medium-emphasis'"
          >
            {{ formatCurrency(item.saldo_pendiente ?? (item.monto_total - item.monto_abonado)) }}
          </span>
        </template>

        <!-- Estado -->
        <template #item.estado="{ item }">
          <VChip
            size="small"
            class="font-weight-bold text-uppercase"
            :color="getEstadoColor(item.estado)"
          >
            {{ item.estado }}
          </VChip>
        </template>

        <!-- Acciones -->
        <template #item.actions="{ item }">
          <div class="d-flex align-center justify-center gap-1">
            <!-- Botón Abonar / Cancelar -->
            <VBtn
              v-if="item.estado !== 'cancelado'"
              icon
              variant="text"
              color="success"
              size="small"
              title="Registrar Abono o Cancelar"
              @click="openAbonoDialog(item)"
            >
              <VIcon icon="tabler-currency-dollar" />
            </VBtn>

            <!-- Ver Detalle -->
            <VBtn
              icon
              variant="text"
              color="info"
              size="small"
              title="Ver Detalle e Historial"
              @click="openDetalleDialog(item)"
            >
              <VIcon icon="tabler-eye" />
            </VBtn>

            <!-- Eliminar Vale -->
            <VBtn
              icon
              variant="text"
              color="error"
              size="small"
              title="Eliminar Vale"
              @click="handleDeleteVale(item)"
            >
              <VIcon icon="tabler-trash" />
            </VBtn>
          </div>
        </template>

        <template #no-data>
          <div class="text-center py-6">
            <VIcon icon="tabler-receipt-off" size="40" color="medium-emphasis" class="mb-2" />
            <div class="text-body-1 font-weight-medium">No se encontraron vales registrados</div>
            <div class="text-caption text-medium-emphasis mb-3">Prueba ajustando los filtros de búsqueda o emite un nuevo vale.</div>
            <VBtn color="primary" size="small" @click="isNuevoValeDialogVisible = true">
              Emitir Nuevo Vale
            </VBtn>
          </div>
        </template>
      </VDataTableServer>
    </VCard>

    <!-- Modales -->
    <NuevoValeDialog
      v-model:is-dialog-visible="isNuevoValeDialogVisible"
      :usuarios="usuariosList"
      @submit="handleCrearVale"
    />

    <AbonoValeDialog
      v-model:is-dialog-visible="isAbonoDialogVisible"
      :vale="selectedValeForAction"
      @submit-abono="handleRegistrarAbono"
      @submit-cancelar-total="handleCancelarTotal"
    />

    <DetalleValeDialog
      v-model:is-dialog-visible="isDetalleDialogVisible"
      :vale="selectedValeForAction"
    />

    <!-- Snackbar de Notificaciones -->
    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="top right"
      timeout="3500"
    >
      {{ snackbar.message }}
    </VSnackbar>
  </div>
</template>

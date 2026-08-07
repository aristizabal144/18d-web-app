<script setup lang="ts">
import { usePedidosStore } from '@/views/apps/pedidos/usePedidosStore'
import type { Pedido, ResumenPagos } from '@/views/apps/pedidos/usePedidosStore'
import PedidoAbonosDialog from '@/views/apps/pedidos/PedidoAbonosDialog.vue'
import FichaJoyeroDialog from '@/components/dialogs/FichaJoyeroDialog.vue'
import FacturaPedidoDialog from '@/components/dialogs/FacturaPedidoDialog.vue'

// 👉 Store
const pedidoStore = usePedidosStore()

// 👉 State
const searchQuery = ref('')
const selectedCliente = ref<string | null>(null)
const selectedEstado = ref<string | null>(null)
const selectedEstadoPago = ref<string | null>(null)
const viewMode = ref<'table' | 'cards'>('table')

const itemsPerPage = ref(50)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()

const totalPedidos = ref(0)
const pedidos = ref<Pedido[]>([])
const isLoading = ref(false)
const colores = ref<{ id: number; nombre: string }[]>([])
const clientes = ref<{ id: string; nombre: string; apellido: string }[]>([])

// 👉 Abonos dialog
const abonosDialogOpen = ref(false)
const selectedPedido = ref<Pedido | null>(null)

// 👉 Ficha Joyero dialog
const joyeroDialogOpen = ref(false)
const selectedJoyeroPedido = ref<Pedido | null>(null)

const openJoyeroDialog = (pedido: Pedido) => {
  selectedJoyeroPedido.value = pedido
  joyeroDialogOpen.value = true
}

// 👉 Factura / Comprobante dialog
const facturaDialogOpen = ref(false)
const selectedFacturaPedido = ref<Pedido | null>(null)

const openFacturaDialog = (pedido: Pedido) => {
  selectedFacturaPedido.value = pedido
  facturaDialogOpen.value = true
}
// Cache de resumenes de pago por pedido_id
const resumenesCache = ref<Record<string, ResumenPagos>>({})

// 👉 Estado badge map
const estadoMap: Record<string, { color: string; icon: string; label: string }> = {
  pendiente_fabricar: { color: 'warning', icon: 'tabler-clock', label: 'Pendiente' },
  entregado: { color: 'success', icon: 'tabler-circle-check', label: 'Entregado' },
}

// 👉 Estado de pago helpers
const estadoPagoMap: Record<string, { color: string; icon: string; label: string }> = {
  pagado: { color: 'success', icon: 'tabler-circle-check', label: 'Pagado' },
  pendiente_pago: { color: 'error', icon: 'tabler-alert-circle', label: 'Pendiente' },
  anticipo: { color: 'warning', icon: 'tabler-exclamation-circle', label: 'Anticipo' },
}

const getEstadoPago = (pedidoId: string) => {
  const res = resumenesCache.value[pedidoId]
  if (!res) return null
  if (res.saldo_pendiente === 0 && res.total_abonado > 0) return 'pagado'
  if (res.saldo_pendiente < 0) return 'anticipo'
  if (res.total_abonado > 0) return 'pendiente_pago'
  return null // sin abonos
}

// 👉 Color badge map
const colorMap: Record<string, { color: string; bgColor: string }> = {
  Amarillo: { color: '#B8860B', bgColor: 'rgba(201, 168, 76, 0.15)' },
  Blanco: { color: '#9E9E9E', bgColor: 'rgba(158, 158, 158, 0.15)' },
  Rosado: { color: '#E91E63', bgColor: 'rgba(233, 30, 99, 0.12)' },
  Multicolor: { color: '#7C4DFF', bgColor: 'rgba(124, 77, 255, 0.12)' },
}

// 👉 Estados para filtro
const estadosOptions = [
  { value: null, title: 'Todos' },
  { value: 'pendiente_fabricar', title: 'Pendiente fabricar' },
  { value: 'entregado', title: 'Entregado' },
]

// 👉 Estados de pago para filtro
const estadosPagoOptions = [
  { value: null, title: 'Todos' },
  { value: 'pagado', title: 'Pagados' },
  { value: 'pendiente_pago', title: 'Con saldo pendiente' },
  { value: 'sin_abonos', title: 'Sin abonos' },
]

// 👉 Headers
const headers = [
  { title: 'REFERENCIA', key: 'referencia', width: '130px' },
  { title: 'PEDIDO', key: 'titulo' },
  { title: 'ESTADO', key: 'estado', width: '140px' },
  { title: 'CLIENTE', key: 'cliente_id', sortable: false },
  { title: 'FECHAS', key: 'fecha_inicio', width: '200px' },
  { title: 'TOTAL', key: 'total_pedido', width: '140px' },
  { title: 'PAGOS', key: 'pagos', sortable: false, width: '140px' },
  { title: 'ACCIONES', key: 'actions', sortable: false, width: '120px' },
]

// 👉 Fetch Pedidos
const fetchPedidos = async () => {
  isLoading.value = true
  try {
    const { pedidos: data, totalPedidos: total } = await pedidoStore.fetchPedidos({
      q: searchQuery.value,
      clienteId: selectedCliente.value,
      estado: selectedEstado.value,
      estadoPago: selectedEstadoPago.value,
      options: {
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: sortBy.value ? [{ key: sortBy.value, order: orderBy.value }] : [],
      },
    })

    pedidos.value = data
    totalPedidos.value = total

    // Cargar resumenes de pago para todos los pedidos
    const resumenes = await Promise.all(
      data.map(p => pedidoStore.fetchResumenPagos(p.id).then(r => ({ id: p.id, r })))
    )
    resumenes.forEach(({ id, r }) => {
      resumenesCache.value[id] = r
    })
  }
  catch (error) {
    console.error(error)
  }
  finally {
    isLoading.value = false
  }
}

// 👉 Fetch lookups para filtros
const loadLookups = async () => {
  try {
    const [coloresData, clientesData] = await Promise.all([
      pedidoStore.fetchColores(),
      pedidoStore.fetchClientes(),
    ])
    colores.value = coloresData
    clientes.value = clientesData
  }
  catch (error) {
    console.error(error)
  }
}

// Watchers para refetching
watch([page, itemsPerPage, sortBy, orderBy, searchQuery, selectedCliente, selectedEstado, selectedEstadoPago], () => {
  fetchPedidos()
}, { deep: true })

// Fetch inicial
onMounted(() => {
  fetchPedidos()
  loadLookups()
})

// 👉 Delete Pedido
const deletePedido = async (id: string) => {
  if (confirm('¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer.')) {
    try {
      await pedidoStore.deletePedido(id)
      fetchPedidos()
    }
    catch (error) {
      console.error('Error deleting pedido', error)
    }
  }
}

// 👉 Abrir dialog de abonos
const openAbonosDialog = (pedido: Pedido) => {
  selectedPedido.value = pedido
  abonosDialogOpen.value = true
}

// 👉 Al cerrar dialog, recargar resumen del pedido seleccionado
const onAbonosDialogClose = () => {
  if (selectedPedido.value)
    pedidoStore.fetchResumenPagos(selectedPedido.value.id).then(r => {
      resumenesCache.value[selectedPedido.value!.id] = r
    })
}

// Observar cuando el dialog se cierra para actualizar el resumen
watch(abonosDialogOpen, val => {
  if (!val) onAbonosDialogClose()
})

// 👉 Helpers
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return ''
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
  const dateObj = dateString.includes('T') ? new Date(dateString) : new Date(`${dateString}T12:00:00`)

  return dateObj.toLocaleDateString('es-ES', options)
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const getImageUrl = (path: string | null) => {
  if (!path)
    return null

  return pedidoStore.getImageUrl(path)
}

const getColorInfo = (pedido: Pedido) => {
  const nombre = pedido.color_oro?.nombre || 'Amarillo'

  return colorMap[nombre] || colorMap.Amarillo
}

const getEstadoInfo = (estado: string) => {
  return estadoMap[estado] || estadoMap.pendiente_fabricar
}
</script>

<template>
  <section>
    <VCard>
      <!-- 👉 Toolbar -->
      <VCardText class="d-flex flex-wrap py-4 gap-4">
        <div class="me-3 d-flex gap-3">
          <AppSelect
            :model-value="itemsPerPage"
            :items="[
              { value: 10, title: '10' },
              { value: 25, title: '25' },
              { value: 50, title: '50' },
              { value: 100, title: '100' },
            ]"
            style="width: 6.25rem;"
            @update:model-value="itemsPerPage = parseInt($event, 10)"
          />
        </div>

        <VSpacer />

        <div class="d-flex align-center flex-wrap gap-4">
          <!-- 👉 Filtro por estado -->
          <div style="inline-size: 10rem;">
            <AppSelect
              v-model="selectedEstado"
              :items="estadosOptions"
              placeholder="Estado fab."
              density="compact"
              clearable
            />
          </div>

          <!-- 👉 Filtro por estado de pago -->
          <div style="inline-size: 12rem;">
            <AppSelect
              v-model="selectedEstadoPago"
              :items="estadosPagoOptions"
              placeholder="Estado pago"
              density="compact"
              clearable
            />
          </div>

          <!-- 👉 Filtro por cliente -->
          <div style="inline-size: 13rem;">
            <AppAutocomplete
              v-model="selectedCliente"
              :items="[{ value: null, title: 'Todos los clientes' }, ...clientes.map(c => ({ value: c.id, title: `${c.nombre} ${c.apellido}` }))]"
              placeholder="Cliente"
              density="compact"
              clearable
            />
          </div>

          <!-- 👉 Búsqueda -->
          <div style="inline-size: 10rem;">
            <AppTextField
              v-model="searchQuery"
              placeholder="Buscar..."
              density="compact"
            />
          </div>

          <!-- 👉 Toggle vista -->
          <VBtnToggle
            v-model="viewMode"
            mandatory
            density="compact"
            variant="outlined"
            color="primary"
          >
            <VBtn
              value="table"
              size="small"
            >
              <VIcon icon="tabler-list" />
            </VBtn>
            <VBtn
              value="cards"
              size="small"
            >
              <VIcon icon="tabler-layout-grid" />
            </VBtn>
          </VBtnToggle>

          <!-- 👉 Botón Agregar -->
          <VBtn
            prepend-icon="tabler-plus"
            :to="{ name: 'apps-pedidos-create' }"
          >
            Nuevo Pedido
          </VBtn>
        </div>
      </VCardText>

      <VDivider />

      <!-- ========================================== -->
      <!-- 👉 VISTA TABLA -->
      <!-- ========================================== -->
      <VDataTableServer
        v-if="viewMode === 'table'"
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :items="pedidos"
        :items-length="totalPedidos"
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
        <!-- Referencia -->
        <template #item.referencia="{ item }">
          <div class="d-flex align-center gap-3">
            <VAvatar
              v-if="getImageUrl(item.imagen)"
              size="38"
              rounded
              :image="getImageUrl(item.imagen)!"
              style="cursor: pointer;"
              title="Ver Ficha para Joyero"
              @click="openJoyeroDialog(item)"
            />
            <VAvatar
              v-else
              size="38"
              rounded
              color="primary"
              variant="tonal"
              style="cursor: pointer;"
              title="Ver Ficha para Joyero"
              @click="openJoyeroDialog(item)"
            >
              <VIcon
                icon="tabler-shopping-cart"
                size="22"
              />
            </VAvatar>
            <span
              class="font-weight-bold cursor-pointer"
              style="font-family: monospace; letter-spacing: 0.5px;"
              title="Ver Ficha para Joyero"
              @click="openJoyeroDialog(item)"
            >
              {{ item.referencia }}
            </span>
          </div>
        </template>

        <!-- Título -->
        <template #item.titulo="{ item }">
          <div class="d-flex flex-column">
            <span class="text-base font-weight-medium">{{ item.titulo }}</span>
            <span
              v-if="item.descripcion"
              class="text-sm text-disabled text-truncate"
              style="max-inline-size: 200px;"
            >
              {{ item.descripcion }}
            </span>
          </div>
        </template>

        <!-- Estado -->
        <template #item.estado="{ item }">
          <VChip
            :color="getEstadoInfo(item.estado).color"
            size="small"
            variant="tonal"
            :prepend-icon="getEstadoInfo(item.estado).icon"
          >
            {{ getEstadoInfo(item.estado).label }}
          </VChip>
        </template>

        <!-- Color Oro -->
        <template #item.color_id="{ item }">
          <VChip
            size="small"
            variant="flat"
            :style="{
              backgroundColor: getColorInfo(item).bgColor,
              color: getColorInfo(item).color,
            }"
          >
            <VIcon
              icon="tabler-circle-filled"
              size="10"
              class="me-1"
              :style="{ color: getColorInfo(item).color }"
            />
            {{ item.color_oro?.nombre }}
          </VChip>
        </template>

        <!-- Cliente -->
        <template #item.cliente_id="{ item }">
          <div class="d-flex align-center gap-2">
            <VAvatar
              size="28"
              color="info"
              variant="tonal"
              class="font-weight-medium"
            >
              {{ item.cliente?.nombre?.charAt(0)?.toUpperCase() || 'C' }}
            </VAvatar>
            <span class="text-sm">{{ item.cliente?.nombre }} {{ item.cliente?.apellido }}</span>
          </div>
        </template>

        <!-- Responsable -->
        <template #item.responsable_id="{ item }">
          <div class="d-flex align-center gap-2">
            <VAvatar
              size="28"
              color="warning"
              variant="tonal"
              class="font-weight-medium"
            >
              {{ item.responsable?.nombre?.charAt(0)?.toUpperCase() || 'R' }}
            </VAvatar>
            <span class="text-sm">{{ item.responsable?.nombre }} {{ item.responsable?.apellido }}</span>
          </div>
        </template>

        <!-- Fechas -->
        <template #item.fecha_inicio="{ item }">
          <div class="d-flex flex-column">
            <span class="text-sm">
              <VIcon
                icon="tabler-calendar-event"
                size="14"
                class="me-1"
              />
              {{ formatDate(item.fecha_inicio) }}
            </span>
            <span class="text-sm text-disabled">
              <VIcon
                icon="tabler-calendar-check"
                size="14"
                class="me-1"
              />
              {{ formatDate(item.fecha_fin) }}
            </span>
            <span
              v-if="item.estado === 'entregado' && item.fecha_entregado"
              class="text-xs font-weight-medium text-success"
              title="Fecha real de entrega"
            >
              <VIcon
                icon="tabler-circle-check"
                size="13"
                class="me-1"
              />
              Entregado: {{ formatDate(item.fecha_entregado) }}
            </span>
          </div>
        </template>

        <!-- Total Pedido -->
        <template #item.total_pedido="{ item }">
          <span class="font-weight-bold text-primary">
            {{ formatCurrency(item.total_pedido || 0) }}
          </span>
        </template>

        <!-- Pagos -->
        <template #item.pagos="{ item }">
          <div v-if="resumenesCache[item.id]">
            <VChip
              :color="estadoPagoMap[getEstadoPago(item.id) || 'pendiente_pago']?.color || 'secondary'"
              :prepend-icon="estadoPagoMap[getEstadoPago(item.id) || 'pendiente_pago']?.icon || 'tabler-minus'"
              size="x-small"
              variant="tonal"
              class="mb-1"
            >
              {{ estadoPagoMap[getEstadoPago(item.id)!]?.label || 'Sin abonos' }}
            </VChip>
            <div
              v-if="resumenesCache[item.id].saldo_pendiente !== 0"
              class="text-xs text-disabled"
            >
              Saldo: {{ formatCurrency(resumenesCache[item.id].saldo_pendiente) }}
            </div>
          </div>
          <VProgressCircular
            v-else
            size="16"
            width="2"
            indeterminate
            color="secondary"
          />
        </template>

        <!-- Acciones -->
        <template #item.actions="{ item }">
          <IconBtn
            title="Factura / Comprobante"
            @click="openFacturaDialog(item)"
          >
            <VIcon icon="tabler-file-invoice" color="primary" />
          </IconBtn>
          <IconBtn
            title="Ficha para Joyero"
            @click="openJoyeroDialog(item)"
          >
            <VIcon icon="tabler-jewel" color="warning" />
          </IconBtn>
          <IconBtn
            title="Gestionar pagos"
            @click="openAbonosDialog(item)"
          >
            <VIcon icon="tabler-cash" />
          </IconBtn>
          <IconBtn :to="{ name: 'apps-pedidos-edit-id', params: { id: item.id } }">
            <VIcon icon="tabler-edit" />
          </IconBtn>
          <IconBtn @click="deletePedido(item.id)">
            <VIcon icon="tabler-trash" />
          </IconBtn>
        </template>

        <!-- Pagination -->
        <template #bottom>
          <TablePagination
            v-model:page="page"
            :items-per-page="itemsPerPage"
            :total-items="totalPedidos"
          />
        </template>
      </VDataTableServer>

      <!-- ========================================== -->
      <!-- 👉 VISTA CARDS -->
      <!-- ========================================== -->
      <div v-else>
        <!-- Loading -->
        <VProgressLinear
          v-if="isLoading"
          indeterminate
          color="primary"
        />

        <!-- Cards Grid -->
        <VCardText v-if="pedidos.length > 0">
          <VRow>
            <VCol
              v-for="pedido in pedidos"
              :key="pedido.id"
              cols="12"
              sm="6"
              md="4"
              lg="3"
            >
              <VCard
                class="pedido-card"
                variant="outlined"
                hover
              >
                <!-- Imagen / Placeholder -->
                <div
                  class="pedido-card__image-wrapper"
                  style="cursor: pointer;"
                  title="Oprime para ver Ficha para Joyero"
                  @click="openJoyeroDialog(pedido)"
                >
                  <VImg
                    v-if="getImageUrl(pedido.imagen)"
                    :src="getImageUrl(pedido.imagen)!"
                    height="180"
                    cover
                    class="pedido-card__image"
                  />
                  <div
                    v-else
                    class="pedido-card__placeholder d-flex align-center justify-center"
                  >
                    <VIcon
                      icon="tabler-shopping-cart"
                      size="48"
                      color="primary"
                      style="opacity: 0.4;"
                    />
                  </div>

                  <!-- Overlay al pasar el mouse -->
                  <div class="pedido-card__image-overlay">
                    <VIcon icon="tabler-jewel" size="28" color="warning" />
                    <span class="text-xs text-white font-weight-medium mt-1">Ver Ficha Joyero</span>
                  </div>

                  <!-- Badge de estado -->
                  <VChip
                    size="small"
                    :color="getEstadoInfo(pedido.estado).color"
                    variant="flat"
                    class="pedido-card__estado-badge"
                    :prepend-icon="getEstadoInfo(pedido.estado).icon"
                  >
                    {{ getEstadoInfo(pedido.estado).label }}
                  </VChip>

                  <!-- Badge de color -->
                  <VChip
                    size="small"
                    variant="flat"
                    class="pedido-card__color-badge"
                    :style="{
                      backgroundColor: getColorInfo(pedido).bgColor,
                      color: getColorInfo(pedido).color,
                      backdropFilter: 'blur(8px)',
                    }"
                  >
                    <VIcon
                      icon="tabler-circle-filled"
                      size="8"
                      class="me-1"
                      :style="{ color: getColorInfo(pedido).color }"
                    />
                    {{ pedido.color_oro?.nombre }}
                  </VChip>

                  <!-- Referencia badge -->
                  <VChip
                    size="small"
                    color="dark"
                    variant="flat"
                    class="pedido-card__ref-badge"
                    style="font-family: monospace; letter-spacing: 0.5px;"
                  >
                    {{ pedido.referencia }}
                  </VChip>
                </div>

                <VCardText class="pb-2">
                  <!-- Título y descripción -->
                  <h6 class="text-base font-weight-semibold mb-1">
                    {{ pedido.titulo }}
                  </h6>
                  <p
                    v-if="pedido.descripcion"
                    class="text-sm text-disabled mb-3"
                    style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"
                  >
                    {{ pedido.descripcion }}
                  </p>

                  <VDivider class="mb-3" />

                  <!-- Info rápida -->
                  <div class="d-flex flex-column gap-2 mb-3">
                    <!-- Cliente -->
                    <div class="d-flex align-center gap-2">
                      <VAvatar
                        size="24"
                        color="info"
                        variant="tonal"
                      >
                        {{ pedido.cliente?.nombre?.charAt(0)?.toUpperCase() || 'C' }}
                      </VAvatar>
                      <span class="text-sm">{{ pedido.cliente?.nombre }} {{ pedido.cliente?.apellido }}</span>
                    </div>
                    <!-- Responsable -->
                    <div class="d-flex align-center gap-2">
                      <VAvatar
                        size="24"
                        color="warning"
                        variant="tonal"
                      >
                        {{ pedido.responsable?.nombre?.charAt(0)?.toUpperCase() || 'R' }}
                      </VAvatar>
                      <span class="text-sm text-disabled">{{ pedido.responsable?.nombre }} {{ pedido.responsable?.apellido }}</span>
                    </div>
                  </div>

                  <!-- Diseño vinculado -->
                  <div
                    v-if="pedido.tiene_diseno && pedido.diseno"
                    class="d-flex align-center gap-2 mb-3"
                  >
                    <VIcon
                      icon="tabler-cube-3d-sphere"
                      size="16"
                      color="primary"
                    />
                    <span class="text-sm text-primary font-weight-medium">{{ pedido.diseno.referencia }}</span>
                  </div>

                  <!-- Fechas -->
                  <div class="d-flex justify-space-between text-sm mb-2">
                    <span class="text-disabled">
                      <VIcon
                        icon="tabler-calendar-event"
                        size="14"
                        class="me-1"
                      />
                      {{ formatDate(pedido.fecha_inicio) }}
                    </span>
                    <span class="text-disabled">
                      <VIcon
                        icon="tabler-calendar-check"
                        size="14"
                        class="me-1"
                      />
                      {{ formatDate(pedido.fecha_fin) }}
                    </span>
                  </div>

                  <div
                    v-if="pedido.estado === 'entregado' && pedido.fecha_entregado"
                    class="d-flex align-center justify-end text-xs text-success font-weight-medium mb-2"
                  >
                    <VIcon
                      icon="tabler-circle-check"
                      size="14"
                      class="me-1"
                    />
                    Entregado: {{ formatDate(pedido.fecha_entregado) }}
                  </div>

                  <VDivider class="mb-3" />

                  <!-- Pago en cards: barra de progreso -->
                  <div
                    v-if="resumenesCache[pedido.id]"
                    class="mb-3"
                  >
                    <div class="d-flex justify-space-between align-center mb-1">
                      <VChip
                        :color="estadoPagoMap[getEstadoPago(pedido.id) || '']?.color || 'secondary'"
                        size="x-small"
                        variant="tonal"
                        :prepend-icon="estadoPagoMap[getEstadoPago(pedido.id) || '']?.icon"
                      >
                        {{ estadoPagoMap[getEstadoPago(pedido.id)!]?.label || 'Sin abonos' }}
                      </VChip>
                      <span class="text-xs text-disabled">
                        {{ formatCurrency(resumenesCache[pedido.id].total_abonado) }} / {{ formatCurrency(pedido.total_pedido || 0) }}
                      </span>
                    </div>
                    <VProgressLinear
                      :model-value="pedido.total_pedido > 0 ? Math.min((resumenesCache[pedido.id].total_abonado / pedido.total_pedido) * 100, 100) : 0"
                      :color="estadoPagoMap[getEstadoPago(pedido.id) || '']?.color || 'secondary'"
                      rounded
                      height="4"
                    />
                  </div>

                  <!-- Precios y acciones -->
                  <div class="d-flex align-center justify-space-between">
                    <span class="text-primary font-weight-bold">
                      {{ formatCurrency(pedido.total_pedido || 0) }}
                    </span>
                    <div>
                      <IconBtn
                        size="small"
                        title="Factura"
                        @click="openFacturaDialog(pedido)"
                      >
                        <VIcon
                          icon="tabler-file-invoice"
                          size="18"
                          color="primary"
                        />
                      </IconBtn>
                      <IconBtn
                        size="small"
                        title="Ficha Joyero"
                        @click="openJoyeroDialog(pedido)"
                      >
                        <VIcon
                          icon="tabler-jewel"
                          size="18"
                          color="warning"
                        />
                      </IconBtn>
                      <IconBtn
                        size="small"
                        title="Pagos"
                        @click="openAbonosDialog(pedido)"
                      >
                        <VIcon
                          icon="tabler-cash"
                          size="18"
                        />
                      </IconBtn>
                      <IconBtn
                        size="small"
                        :to="{ name: 'apps-pedidos-edit-id', params: { id: pedido.id } }"
                      >
                        <VIcon
                          icon="tabler-edit"
                          size="18"
                        />
                      </IconBtn>
                      <IconBtn
                        size="small"
                        @click="deletePedido(pedido.id)"
                      >
                        <VIcon
                          icon="tabler-trash"
                          size="18"
                        />
                      </IconBtn>
                    </div>
                  </div>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>
        </VCardText>

        <!-- Empty state -->
        <VCardText
          v-else-if="!isLoading"
          class="d-flex flex-column align-center justify-center py-10"
        >
          <VIcon
            icon="tabler-shopping-cart"
            size="64"
            color="secondary"
            class="mb-4"
            style="opacity: 0.3;"
          />
          <h6 class="text-h6 text-disabled mb-1">
            Sin pedidos
          </h6>
          <p class="text-sm text-disabled mb-4">
            No se encontraron pedidos con los filtros actuales.
          </p>
          <VBtn
            prepend-icon="tabler-plus"
            :to="{ name: 'apps-pedidos-create' }"
          >
            Crear Primer Pedido
          </VBtn>
        </VCardText>

        <!-- Cards Pagination -->
        <TablePagination
          v-if="pedidos.length > 0"
          v-model:page="page"
          :items-per-page="itemsPerPage"
          :total-items="totalPedidos"
        />
      </div>
    </VCard>

    <!-- 👉 Dialog de Abonos -->
    <PedidoAbonosDialog
      v-model="abonosDialogOpen"
      :pedido="selectedPedido"
    />

    <!-- 👉 Dialog Ficha de Joyero -->
    <FichaJoyeroDialog
      v-model="joyeroDialogOpen"
      :item="selectedJoyeroPedido ? { ...selectedJoyeroPedido, type: 'pedido' } : null"
    />

    <!-- 👉 Dialog Factura / Comprobante -->
    <FacturaPedidoDialog
      v-model="facturaDialogOpen"
      :pedido="selectedFacturaPedido"
    />
  </section>
</template>

<style lang="scss" scoped>
.pedido-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(var(--v-theme-on-surface), 0.12) !important;
  }

  &__image-wrapper {
    position: relative;
    overflow: hidden;

    &:hover .pedido-card__image-overlay {
      opacity: 1;
    }
  }

  &__image {
    transition: transform 0.3s ease;
  }

  &:hover &__image {
    transform: scale(1.05);
  }

  &__image-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.25s ease;
    backdrop-filter: blur(2px);
    z-index: 2;
  }

  &__placeholder {
    block-size: 180px;
    background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.05), rgba(var(--v-theme-primary), 0.12));
  }

  &__estado-badge {
    position: absolute;
    inset-block-start: 10px;
    inset-inline-end: 10px;
  }

  &__color-badge {
    position: absolute;
    inset-block-end: 10px;
    inset-inline-end: 10px;
  }

  &__ref-badge {
    position: absolute;
    inset-block-start: 10px;
    inset-inline-start: 10px;
  }
}
</style>

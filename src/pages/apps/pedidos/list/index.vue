<script setup lang="ts">
import { usePedidosStore } from '@/views/apps/pedidos/usePedidosStore'
import type { Pedido } from '@/views/apps/pedidos/usePedidosStore'

// 👉 Store
const pedidoStore = usePedidosStore()

// 👉 State
const searchQuery = ref('')
const selectedColor = ref<number | null>(null)
const selectedEstado = ref<string | null>(null)
const viewMode = ref<'table' | 'cards'>('table')

const itemsPerPage = ref(10)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()

const totalPedidos = ref(0)
const pedidos = ref<Pedido[]>([])
const isLoading = ref(false)
const colores = ref<{ id: number; nombre: string }[]>([])

// 👉 Estado badge map
const estadoMap: Record<string, { color: string; icon: string; label: string }> = {
  pendiente_fabricar: { color: 'warning', icon: 'tabler-clock', label: 'Pendiente' },
  entregado: { color: 'success', icon: 'tabler-circle-check', label: 'Entregado' },
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
  { value: 'pendiente_fabricar', title: 'Pendiente' },
  { value: 'entregado', title: 'Entregado' },
]

// 👉 Headers
const headers = [
  { title: 'REFERENCIA', key: 'referencia', width: '130px' },
  { title: 'PEDIDO', key: 'titulo' },
  { title: 'ESTADO', key: 'estado', width: '140px' },
  { title: 'COLOR ORO', key: 'color_id', sortable: false, width: '130px' },
  { title: 'CLIENTE', key: 'cliente_id', sortable: false },
  { title: 'RESPONSABLE', key: 'responsable_id', sortable: false },
  { title: 'FECHAS', key: 'fecha_inicio', width: '200px' },
  { title: 'TOTAL', key: 'total_pedido', width: '140px' },
  { title: 'ACCIONES', key: 'actions', sortable: false, width: '100px' },
]

// 👉 Fetch Pedidos
const fetchPedidos = async () => {
  isLoading.value = true
  try {
    const { pedidos: data, totalPedidos: total } = await pedidoStore.fetchPedidos({
      q: searchQuery.value,
      colorId: selectedColor.value,
      estado: selectedEstado.value,
      options: {
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: sortBy.value ? [{ key: sortBy.value, order: orderBy.value }] : [],
      },
    })

    pedidos.value = data
    totalPedidos.value = total
  }
  catch (error) {
    console.error(error)
  }
  finally {
    isLoading.value = false
  }
}

// 👉 Fetch colores para filtro
const loadColores = async () => {
  try {
    colores.value = await pedidoStore.fetchColores()
  }
  catch (error) {
    console.error(error)
  }
}

// Watchers para refetching
watch([page, itemsPerPage, sortBy, orderBy, searchQuery, selectedColor, selectedEstado], () => {
  fetchPedidos()
}, { deep: true })

// Fetch inicial
onMounted(() => {
  fetchPedidos()
  loadColores()
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

// 👉 Helpers
const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }

  return new Date(dateString).toLocaleDateString('es-ES', options)
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
              placeholder="Estado"
              density="compact"
              clearable
            />
          </div>

          <!-- 👉 Filtro por color -->
          <div style="inline-size: 10rem;">
            <AppSelect
              v-model="selectedColor"
              :items="[{ value: null, title: 'Todos' }, ...colores.map(c => ({ value: c.id, title: c.nombre }))]"
              placeholder="Color Oro"
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
            />
            <VAvatar
              v-else
              size="38"
              rounded
              color="primary"
              variant="tonal"
            >
              <VIcon
                icon="tabler-shopping-cart"
                size="22"
              />
            </VAvatar>
            <span
              class="font-weight-bold"
              style="font-family: monospace; letter-spacing: 0.5px;"
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
          </div>
        </template>

        <!-- Total Pedido -->
        <template #item.total_pedido="{ item }">
          <span class="font-weight-bold text-primary">
            {{ formatCurrency(item.total_pedido || 0) }}
          </span>
        </template>

        <!-- Acciones -->
        <template #item.actions="{ item }">
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
                <div class="pedido-card__image-wrapper">
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

                  <VDivider class="mb-3" />

                  <!-- Precios y acciones -->
                  <div class="d-flex align-center justify-space-between">
                    <span class="text-primary font-weight-bold">
                      {{ formatCurrency(pedido.total_pedido || 0) }}
                    </span>
                    <div>
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
  }

  &__image {
    transition: transform 0.3s ease;
  }

  &:hover &__image {
    transform: scale(1.05);
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

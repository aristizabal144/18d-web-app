<script setup lang="ts">
import { useDisenos3dStore } from '@/views/apps/disenos/useDisenos3dStore'
import type { Diseno3d } from '@/views/apps/disenos/useDisenos3dStore'
import FichaJoyeroDialog from '@/components/dialogs/FichaJoyeroDialog.vue'

// 👉 Store
const disenoStore = useDisenos3dStore()
const router = useRouter()

// 👉 State
const searchQuery = ref('')
const selectedCliente = ref<string | null>(null)
const viewMode = ref<'table' | 'cards'>('table')

const itemsPerPage = ref(50)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()

const totalDisenos = ref(0)
const disenos = ref<Diseno3d[]>([])
const isLoading = ref(false)
const colores = ref<{ id: number; nombre: string }[]>([])
const clientes = ref<{ id: string; nombre: string; apellido: string }[]>([])

// 👉 Ficha Joyero dialog
const joyeroDialogOpen = ref(false)
const selectedJoyeroDiseno = ref<Diseno3d | null>(null)

const openJoyeroDialog = (diseno: Diseno3d) => {
  selectedJoyeroDiseno.value = diseno
  joyeroDialogOpen.value = true
}

// 👉 Color badge map
const colorMap: Record<string, { color: string; bgColor: string }> = {
  Amarillo: { color: '#B8860B', bgColor: 'rgba(201, 168, 76, 0.15)' },
  Blanco: { color: '#9E9E9E', bgColor: 'rgba(158, 158, 158, 0.15)' },
  Rosado: { color: '#E91E63', bgColor: 'rgba(233, 30, 99, 0.12)' },
  Multicolor: { color: '#7C4DFF', bgColor: 'rgba(124, 77, 255, 0.12)' },
}

// 👉 Headers
const headers = [
  { title: 'REFERENCIA', key: 'referencia', width: '120px' },
  { title: 'DISEÑO', key: 'titulo' },
  { title: 'COLOR ORO', key: 'color_id', sortable: false, width: '130px' },
  { title: 'CLIENTE', key: 'cliente_id', sortable: false },
  { title: 'RESPONSABLE', key: 'responsable_id', sortable: false },
  { title: 'FECHAS', key: 'fecha_inicio', width: '200px' },
  { title: 'PRECIO TOTAL', key: 'precio_diseno', width: '140px' },
  { title: 'ACCIONES', key: 'actions', sortable: false, width: '100px' },
]

// 👉 Fetch Diseños
const fetchDisenos = async () => {
  isLoading.value = true
  try {
    const { disenos: data, totalDisenos: total } = await disenoStore.fetchDisenos({
      q: searchQuery.value,
      clienteId: selectedCliente.value,
      options: {
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: sortBy.value ? [{ key: sortBy.value, order: orderBy.value }] : [],
      },
    })

    disenos.value = data
    totalDisenos.value = total
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
      disenoStore.fetchColores(),
      disenoStore.fetchClientes(),
    ])
    colores.value = coloresData
    clientes.value = clientesData
  }
  catch (error) {
    console.error(error)
  }
}

// Watchers para refetching
watch([page, itemsPerPage, sortBy, orderBy, searchQuery, selectedCliente], () => {
  fetchDisenos()
}, { deep: true })

// Fetch inicial
onMounted(() => {
  fetchDisenos()
  loadLookups()
})

// 👉 Delete Diseño
const deleteDiseno = async (id: string) => {
  if (confirm('¿Estás seguro de que deseas eliminar este diseño? Esta acción no se puede deshacer.')) {
    try {
      await disenoStore.deleteDiseno(id)
      fetchDisenos()
    }
    catch (error) {
      console.error('Error deleting diseño', error)
    }
  }
}

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

  return disenoStore.getImageUrl(path)
}

const getColorInfo = (diseno: Diseno3d) => {
  const nombre = diseno.color_oro?.nombre || 'Amarillo'

  return colorMap[nombre] || colorMap.Amarillo
}

// 👉 Paginación para vista cards
const totalPages = computed(() => Math.ceil(totalDisenos.value / itemsPerPage.value))
</script>

<template>
  <section>
    <!-- 👉 Encabezado de la Sección -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h4 class="text-h4 font-weight-bold d-flex align-center gap-2">
          <VIcon icon="tabler-cube-3d-sphere" color="primary" size="28" />
          Diseños 3D & Catálogo
        </h4>
        <p class="text-body-1 text-disabled mb-0">
          Modelos y archivos 3D desarrollados para piezas de joyería
        </p>
      </div>

      <VBtn
        color="primary"
        prepend-icon="tabler-plus"
        class="font-weight-bold"
        :to="{ name: 'apps-disenos-create' }"
      >
        Nuevo Diseño 3D
      </VBtn>
    </div>

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
        :items="disenos"
        :items-length="totalDisenos"
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
                icon="tabler-cube-3d-sphere"
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

        <!-- Precio Total -->
        <template #item.precio_diseno="{ item }">
          <span class="font-weight-bold text-primary">
            {{ formatCurrency(item.precio_diseno + item.precio_impresion) }}
          </span>
        </template>

        <!-- Acciones -->
        <template #item.actions="{ item }">
          <IconBtn
            title="Ficha para Joyero"
            @click="openJoyeroDialog(item)"
          >
            <VIcon icon="tabler-jewel" color="warning" />
          </IconBtn>
          <IconBtn :to="{ name: 'apps-disenos-edit-id', params: { id: item.id } }">
            <VIcon icon="tabler-edit" />
          </IconBtn>
          <IconBtn @click="deleteDiseno(item.id)">
            <VIcon icon="tabler-trash" />
          </IconBtn>
        </template>

        <!-- Pagination -->
        <template #bottom>
          <TablePagination
            v-model:page="page"
            :items-per-page="itemsPerPage"
            :total-items="totalDisenos"
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
        <VCardText v-if="disenos.length > 0">
          <VRow>
            <VCol
              v-for="diseno in disenos"
              :key="diseno.id"
              cols="12"
              sm="6"
              md="4"
              lg="3"
            >
              <VCard
                class="diseno-card"
                variant="outlined"
                hover
              >
                <!-- Imagen / Placeholder -->
                <div
                  class="diseno-card__image-wrapper"
                  style="cursor: pointer;"
                  title="Oprime para ver Ficha para Joyero"
                  @click="openJoyeroDialog(diseno)"
                >
                  <VImg
                    v-if="getImageUrl(diseno.imagen)"
                    :src="getImageUrl(diseno.imagen)!"
                    height="180"
                    cover
                    class="diseno-card__image"
                  />
                  <div
                    v-else
                    class="diseno-card__placeholder d-flex align-center justify-center"
                  >
                    <VIcon
                      icon="tabler-cube-3d-sphere"
                      size="48"
                      color="primary"
                      style="opacity: 0.4;"
                    />
                  </div>

                  <!-- Overlay al pasar el mouse -->
                  <div class="diseno-card__image-overlay">
                    <VIcon icon="tabler-jewel" size="28" color="warning" />
                    <span class="text-xs text-white font-weight-medium mt-1">Ver Ficha Joyero</span>
                  </div>

                  <!-- Badge de color -->
                  <VChip
                    size="small"
                    variant="flat"
                    class="diseno-card__color-badge"
                    :style="{
                      backgroundColor: getColorInfo(diseno).bgColor,
                      color: getColorInfo(diseno).color,
                      backdropFilter: 'blur(8px)',
                    }"
                  >
                    <VIcon
                      icon="tabler-circle-filled"
                      size="8"
                      class="me-1"
                      :style="{ color: getColorInfo(diseno).color }"
                    />
                    {{ diseno.color_oro?.nombre }}
                  </VChip>

                  <!-- Referencia badge -->
                  <VChip
                    size="small"
                    color="dark"
                    variant="flat"
                    class="diseno-card__ref-badge"
                    style="font-family: monospace; letter-spacing: 0.5px;"
                  >
                    {{ diseno.referencia }}
                  </VChip>
                </div>

                <VCardText class="pb-2">
                  <!-- Título y descripción -->
                  <h6 class="text-base font-weight-semibold mb-1">
                    {{ diseno.titulo }}
                  </h6>
                  <p
                    v-if="diseno.descripcion"
                    class="text-sm text-disabled mb-3 text-truncate-2"
                    style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"
                  >
                    {{ diseno.descripcion }}
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
                        {{ diseno.cliente?.nombre?.charAt(0)?.toUpperCase() || 'C' }}
                      </VAvatar>
                      <span class="text-sm">{{ diseno.cliente?.nombre }} {{ diseno.cliente?.apellido }}</span>
                    </div>
                    <!-- Responsable -->
                    <div class="d-flex align-center gap-2">
                      <VAvatar
                        size="24"
                        color="warning"
                        variant="tonal"
                      >
                        {{ diseno.responsable?.nombre?.charAt(0)?.toUpperCase() || 'R' }}
                      </VAvatar>
                      <span class="text-sm text-disabled">{{ diseno.responsable?.nombre }} {{ diseno.responsable?.apellido }}</span>
                    </div>
                  </div>

                  <!-- Fechas -->
                  <div class="d-flex justify-space-between text-sm mb-2">
                    <span class="text-disabled">
                      <VIcon
                        icon="tabler-calendar-event"
                        size="14"
                        class="me-1"
                      />
                      {{ formatDate(diseno.fecha_inicio) }}
                    </span>
                    <span class="text-disabled">
                      <VIcon
                        icon="tabler-calendar-check"
                        size="14"
                        class="me-1"
                      />
                      {{ formatDate(diseno.fecha_fin) }}
                    </span>
                  </div>

                  <VDivider class="mb-3" />

                  <!-- Precios y acciones -->
                  <div class="d-flex align-center justify-space-between">
                    <span class="text-primary font-weight-bold">
                      {{ formatCurrency(diseno.precio_diseno + diseno.precio_impresion) }}
                    </span>
                    <div>
                      <IconBtn
                        size="small"
                        title="Ficha Joyero"
                        @click="openJoyeroDialog(diseno)"
                      >
                        <VIcon
                          icon="tabler-jewel"
                          size="18"
                          color="warning"
                        />
                      </IconBtn>
                      <IconBtn
                        size="small"
                        :to="{ name: 'apps-disenos-edit-id', params: { id: diseno.id } }"
                      >
                        <VIcon
                          icon="tabler-edit"
                          size="18"
                        />
                      </IconBtn>
                      <IconBtn
                        size="small"
                        @click="deleteDiseno(diseno.id)"
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
            icon="tabler-cube-3d-sphere"
            size="64"
            color="secondary"
            class="mb-4"
            style="opacity: 0.3;"
          />
          <h6 class="text-h6 text-disabled mb-1">
            Sin diseños
          </h6>
          <p class="text-sm text-disabled mb-4">
            No se encontraron diseños con los filtros actuales.
          </p>
          <VBtn
            prepend-icon="tabler-plus"
            :to="{ name: 'apps-disenos-create' }"
          >
            Crear Primer Diseño
          </VBtn>
        </VCardText>

        <!-- Cards Pagination -->
        <TablePagination
          v-if="disenos.length > 0"
          v-model:page="page"
          :items-per-page="itemsPerPage"
          :total-items="totalDisenos"
        />
      </div>
    </VCard>

    <!-- 👉 Dialog Ficha de Joyero -->
    <FichaJoyeroDialog
      v-model="joyeroDialogOpen"
      :item="selectedJoyeroDiseno ? { ...selectedJoyeroDiseno, type: 'diseno' } : null"
    />
  </section>
</template>

<style lang="scss" scoped>
.diseno-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(var(--v-theme-on-surface), 0.12) !important;
  }

  &__image-wrapper {
    position: relative;
    overflow: hidden;

    &:hover .diseno-card__image-overlay {
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

  &__color-badge {
    position: absolute;
    inset-block-start: 10px;
    inset-inline-end: 10px;
  }

  &__ref-badge {
    position: absolute;
    inset-block-start: 10px;
    inset-inline-start: 10px;
  }
}
</style>

<script setup lang="ts">
import { avatarText } from '@core/utils/formatters'
import { useClientStore } from '@/views/apps/client/useClientStore'
import AddNewClientDrawer from '@/views/apps/client/list/AddNewClientDrawer.vue'
import EditClientDrawer from '@/views/apps/client/list/EditClientDrawer.vue'

// 👉 Store
const clientStore = useClientStore()

// 👉 State
const searchQuery = ref('')
const selectedRows = ref<string[]>([])
const isAddNewClientDrawerVisible = ref(false)
const isEditClientDrawerVisible = ref(false)
const clientToEdit = ref<any>(null)

const itemsPerPage = ref(10)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()

const totalClients = ref(0)
const clients = ref<any[]>([])
const isTableLoading = ref(false)

// 👉 Headers
const headers = [
  { title: 'CLIENTE', key: 'nombre' },
  { title: 'EMAIL', key: 'email' },
  { title: 'TELÉFONO', key: 'telefono', sortable: false },
  { title: 'FECHA REGISTRO', key: 'created_at' },
  { title: 'ACCIONES', key: 'actions', sortable: false },
]

// 👉 Fetch Clients
const fetchClients = async () => {
  isTableLoading.value = true
  try {
    const { clients: data, totalClients: total } = await clientStore.fetchClients({
      q: searchQuery.value,
      options: {
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: sortBy.value ? [{ key: sortBy.value, order: orderBy.value }] : [],
      },
    })

    clients.value = data
    totalClients.value = total
  }
  catch (error) {
    console.error(error)
  }
  finally {
    isTableLoading.value = false
  }
}

// Watchers para refetching
watch([page, itemsPerPage, sortBy, orderBy, searchQuery], () => {
  fetchClients()
}, { deep: true })

// Fetch inicial
onMounted(() => {
  fetchClients()
})

// 👉 Add Client
const handleClientAdded = async (clientData: any) => {
  try {
    await clientStore.addClient(clientData)

    // Refetch
    fetchClients()
  }
  catch (error) {
    console.error('Error adding client', error)
  }
}

// 👉 Edit Client
const openEditDrawer = (client: any) => {
  clientToEdit.value = { ...client }
  isEditClientDrawerVisible.value = true
}

const handleClientEdited = async (clientData: any) => {
  try {
    await clientStore.updateClient(clientData.id, {
      nombre: clientData.nombre,
      apellido: clientData.apellido,
      telefono: clientData.telefono,
    })
    fetchClients()
  }
  catch (error) {
    console.error('Error updating client', error)
  }
}

// 👉 Delete Client
const deleteClient = async (id: string) => {
  if (confirm('¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.')) {
    try {
      await clientStore.deleteClient(id)
      fetchClients()
    }
    catch (error) {
      console.error('Error deleting client', error)
    }
  }
}

// Formateo de fecha
const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }

  return new Date(dateString).toLocaleDateString('es-ES', options)
}
</script>

<template>
  <section>
    <!-- 👉 Encabezado de la Sección -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h4 class="text-h4 font-weight-bold d-flex align-center gap-2">
          <VIcon icon="tabler-users" color="primary" size="28" />
          Directorio de Clientes
        </h4>
        <p class="text-body-1 text-disabled mb-0">
          Gestión de perfiles de clientes, datos de contacto e historial de registro
        </p>
      </div>

      <VBtn
        color="primary"
        prepend-icon="tabler-plus"
        class="font-weight-bold"
        @click="isAddNewClientDrawerVisible = true"
      >
        Agregar Cliente
      </VBtn>
    </div>

    <VCard>
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

        <div class="app-user-search-filter d-flex align-center flex-wrap gap-4">
          <!-- 👉 Search  -->
          <div style="inline-size: 10rem;">
            <AppTextField
              v-model="searchQuery"
              placeholder="Buscar"
              density="compact"
            />
          </div>
        </div>
      </VCardText>

      <VDivider />

      <!-- 👉 Data Table -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        v-model="selectedRows"
        :items="clients"
        :items-length="totalClients"
        :headers="headers"
        :loading="isTableLoading"
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
        <!-- Cliente -->
        <template #item.nombre="{ item }">
          <div class="d-flex align-center">
            <!-- Avatar Circular con Iniciales y Color Corporativo -->
            <VAvatar
              size="34"
              color="primary"
              variant="tonal"
              class="me-3 font-weight-medium"
            >
              {{ item.nombre.charAt(0).toUpperCase() }}
            </VAvatar>
            <div class="d-flex flex-column">
              <h6 class="text-base font-weight-medium mb-0">
                {{ item.nombre }} {{ item.apellido }}
              </h6>
              <span class="text-sm text-disabled">Cliente</span>
            </div>
          </div>
        </template>

        <!-- Email -->
        <template #item.email="{ item }">
          <span class="text-sm">{{ item.email }}</span>
        </template>

        <!-- Teléfono -->
        <template #item.telefono="{ item }">
          <span class="text-sm">{{ item.telefono || 'N/A' }}</span>
        </template>

        <!-- Fecha Registro -->
        <template #item.created_at="{ item }">
          <span class="text-sm">{{ formatDate(item.created_at) }}</span>
        </template>

        <!-- Acciones -->
        <template #item.actions="{ item }">
          <IconBtn @click="openEditDrawer(item)">
            <VIcon icon="tabler-edit" />
          </IconBtn>
          <IconBtn @click="deleteClient(item.id)">
            <VIcon icon="tabler-trash" />
          </IconBtn>
        </template>

        <!-- Pagination -->
        <template #bottom>
          <TablePagination
            v-model:page="page"
            :items-per-page="itemsPerPage"
            :total-items="totalClients"
          />
        </template>
      </VDataTableServer>
    </VCard>

    <!-- 👉 Drawers -->
    <AddNewClientDrawer
      v-model:is-drawer-open="isAddNewClientDrawerVisible"
      @client-data="handleClientAdded"
    />

    <EditClientDrawer
      v-model:is-drawer-open="isEditClientDrawerVisible"
      :client="clientToEdit"
      @client-data="handleClientEdited"
    />
  </section>
</template>
